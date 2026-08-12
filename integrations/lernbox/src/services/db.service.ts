import Dexie, { type Table } from 'dexie';
import type { Card, Deck } from '../types';

export class LernBoxDB extends Dexie {
    decks!: Table<Deck>;
    cards!: Table<Card>;

    constructor() {
        super('LernBoxDB');
        this.version(1).stores({
            decks: '++id, name, createdAt',
            cards: '++id, deckId, level, nextReview, createdAt'
        });

        // Version 2: Compound Index for performance
        this.version(2).stores({
            cards: '++id, deckId, level, nextReview, createdAt, [deckId+nextReview]'
        });
    }
}

export const db = new LernBoxDB();

export const vocabularyService = {
    // Deck Operations
    async getDecks(): Promise<Deck[]> {
        return await db.decks.orderBy('createdAt').reverse().toArray();
    },

    async addDeck(name: string, front_lang: string = 'de-DE', back_lang: string = 'en-US'): Promise<number> {
        if (!name.trim()) throw new Error('Deck name cannot be empty');
        return await db.decks.add({
            name,
            createdAt: Date.now(),
            front_lang,
            back_lang
        });
    },

    async deleteDeck(id: number): Promise<void> {
        await db.transaction('rw', db.cards, db.decks, async () => {
            await db.cards.where('deckId').equals(id).delete();
            await db.decks.delete(id);
        });
    },

    // Card Operations
    async getCards(deckId: number, limit?: number): Promise<Card[]> {
        let query = db.cards.where('deckId').equals(deckId);
        if (limit) {
            query = query.limit(limit);
        }
        return await query.toArray();
    },

    async getCardsDue(deckId: number, direction: 'forward' | 'reverse' = 'forward'): Promise<Card[]> {
        const now = Date.now();
        const MAX_BUFFER = 12 * 60 * 60 * 1000; // Max possible buffer (12h)
        const maxTime = now + MAX_BUFFER;

        // Fetch all potentially relevant cards (those due within the widest buffer range)
        // Then filter precisely based on their specific interval logic
        let potentialCards: Card[] = [];

        if (direction === 'forward') {
            potentialCards = await db.cards
                .where('[deckId+nextReview]')
                .between([deckId, 0], [deckId, maxTime], true, true)
                .toArray();
        } else {
            potentialCards = await db.cards
                .where('deckId')
                .equals(deckId)
                .filter(c => (c.reverseNextReview || 0) <= maxTime)
                .toArray();
        }

        return potentialCards.filter(card => {
            const interval = direction === 'forward' ? (card.interval || 0) : (card.reverseInterval || 0);
            const due = direction === 'forward' ? card.nextReview : (card.reverseNextReview || 0);

            let buffer = 0;
            if (interval <= 1) {
                // <= 24h interval -> 4h buffer
                buffer = 4 * 60 * 60 * 1000;
            } else {
                // > 24h interval -> 12h buffer
                buffer = 12 * 60 * 60 * 1000;
            }

            // Effective Due Date = Due Date - Buffer
            // "Available" if Now >= Effective Due Date
            return now >= (due - buffer);
        });
    },

    async getCardsByBox(deckId: number, box: number, direction: 'forward' | 'reverse' = 'forward'): Promise<Card[]> {
        return await db.cards
            .where('deckId')
            .equals(deckId)
            .filter(card => {
                if (direction === 'forward') {
                    return card.level === box;
                } else {
                    return (card.reverseBox || 1) === box;
                }
            })
            .toArray();
    },

    async getBoxStats(deckId: number): Promise<{ [key: number]: number }> {
        const stats: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        const cards = await db.cards.where('deckId').equals(deckId).toArray();
        cards.forEach(card => {
            if (stats[card.level] !== undefined) {
                stats[card.level]++;
            }
        });
        return stats;
    },

    async addCard(deckId: number, question: string, answer: string, tag?: string): Promise<number> {
        if (!question.trim() || !answer.trim()) throw new Error('Question and answer cannot be empty');

        const now = Date.now();
        return await db.cards.add({
            deckId,
            question,
            answer,
            tag,

            // Forward
            level: 1,
            nextReview: now,
            writingStreak: 0,
            interval: 0,
            box: 1,

            // Reverse
            reverseBox: 1,
            reverseInterval: 0,
            reverseNextReview: now,
            reverseWritingStreak: 0,

            lastReviewed: now,
            createdAt: now
        });
    },

    async importCards(deckId: number, items: Array<{ question: string, answer: string, tag?: string }>): Promise<void> {
        const now = Date.now();
        const cardsToAdd = items.map(item => ({
            deckId,
            question: item.question,
            answer: item.answer,
            tag: item.tag,

            level: 1 as import('../types').LeitnerLevel,
            nextReview: now,
            writingStreak: 0,
            interval: 0,
            box: 1,

            reverseBox: 1,
            reverseInterval: 0,
            reverseNextReview: now,
            reverseWritingStreak: 0,

            lastReviewed: now,
            createdAt: now
        }));
        await db.cards.bulkAdd(cardsToAdd);
    },

    async updateCard(card: Card): Promise<number> {
        if (!card.id) throw new Error('Card ID is missing');
        return await db.cards.update(card.id, { ...card });
    },

    async deleteCard(id: number): Promise<void> {
        await db.cards.delete(id);
    },

    async getCard(id: number): Promise<Card | undefined> {
        return await db.cards.get(id);
    },

    // Degradation (Lazy Penalty) Logic
    async checkCardDecay(): Promise<number> {
        const now = Date.now();
        let decayedCount = 0;
        const DAY_MS = 24 * 60 * 60 * 1000;

        const cards = await db.cards.toArray();

        await db.transaction('rw', db.cards, async () => {
            for (const card of cards) {
                if (!card.lastReviewed) {
                    await db.cards.update(card.id!, { lastReviewed: now });
                    continue;
                }

                // If already naturally in Box 1, nothing to decay
                const currentBox = card.level;
                if (currentBox === 1) continue;

                let shouldDrop = false;
                let targetBox: import('../types').LeitnerLevel = currentBox;

                // Rule 1: "Lazy" Penalty
                // If Box < 5 AND lastReviewed < (now - 14 days) -> Drop 1 Box
                if (currentBox < 5 && card.lastReviewed < (now - (14 * DAY_MS))) {
                    shouldDrop = true;
                    // Ensure type safety
                    const newLevel = Math.max(1, currentBox - 1);
                    targetBox = newLevel as import('../types').LeitnerLevel;
                }
                // Rule 2: High Level Penalty
                // If Box == 5 AND lastReviewed < (now - 30 days) -> Drop to Box 4
                else if (currentBox === 5 && card.lastReviewed < (now - (30 * DAY_MS))) {
                    shouldDrop = true;
                    targetBox = 4 as import('../types').LeitnerLevel;
                }

                if (shouldDrop) {
                    // When decaying, we reset the interval to match the new box?
                    // Or just let them review it?
                    // User Request: "box = max(1, box - 1)"

                    // IMPORTANT: Reset timestamps to prompt immediate review?
                    // Usually yes, otherwise it might just sit there.

                    const newInterval = targetBox === 5 ? 7 : 1;

                    await db.cards.update(card.id!, {
                        box: targetBox,
                        level: targetBox,
                        interval: newInterval,
                        nextReview: now, // Due Immediately
                        // We DO NOT update lastReviewed to avoid "saving" them from further decay if they ignore it again?
                        // BUT: If we check again tomorrow, and lastReviewed is still 30 days ago, it will drop AGAIN.
                        // This leads to rapid decay (daily drops) until they review it. This is desirable for "Lazy Penalty".
                    });
                    decayedCount++;
                }
            }
        });

        return decayedCount;
    },

    /**
     * Hard Regression Check
     * Syncs DB with Logical "Drift" where cards might be overdue but still in high boxes.
     * Rule: If a card is overdue by > 14 days, it DROPS to Box 1 immediately.
     */
    async checkAndProcessRegressions(deckId: number): Promise<number> {
        const now = Date.now();
        const REGRESSION_THRESHOLD_CMS = 14 * 24 * 60 * 60 * 1000; // 14 Days
        let regressionCount = 0;

        // 1. Find candidates: Box > 1 in this deck
        const candidates = await db.cards
            .where('deckId')
            .equals(deckId)
            .filter(c => (c.box || c.level) > 1) // Safe check for box > 1
            .toArray();

        if (candidates.length === 0) return 0;

        await db.transaction('rw', db.cards, async () => {
            for (const card of candidates) {
                // Check Overdue Status
                // If now > nextReview + Threshold
                const overdueAmount = now - card.nextReview;

                if (overdueAmount > REGRESSION_THRESHOLD_CMS) {
                    // HARD RESET to Box 1
                    await db.cards.update(card.id!, {
                        box: 1,
                        level: 1,
                        interval: 0,
                        nextReview: now, // Due Immediately
                        // We also likely want to reset their streak
                        writingStreak: 0,
                        reverseWritingStreak: 0
                    });
                    regressionCount++;
                }
            }
        });

        return regressionCount;
    },

    async getNextSessionAt(deckId?: number): Promise<number | null> {
        const now = Date.now();

        // Helper to determine effective due time for a card
        const getEffectiveDueDate = (card: Card) => {
            // Note: This assumes Forward mode check for "next session" generic indicator
            const interval = card.interval || 0;
            const due = card.nextReview;

            let buffer = 0;
            if (interval <= 1) {
                buffer = 4 * 60 * 60 * 1000;
            } else {
                buffer = 12 * 60 * 60 * 1000;
            }
            return due - buffer;
        };

        if (deckId) {
            // Check specific deck
            // Fetch upcoming cards (limit to top 20 to avoid heavy computation, finding the min effective date)
            const cards = await db.cards
                .where('[deckId+nextReview]')
                .between([deckId, now], [deckId, Infinity], false, true)
                .limit(20)
                .toArray();

            if (cards.length === 0) return null;

            // Find the earliest "Effective Due Date"
            let earliest = Infinity;
            for (const card of cards) {
                const eff = getEffectiveDueDate(card);
                if (eff < earliest) earliest = eff;
            }
            return earliest === Infinity ? null : earliest;
        } else {
            // Global check (all decks) - rough heuristic or scan top upcoming
            // Note: Dexie doesn't support complex sorting easily across all cards with computed values.
            // We'll just grab the globally next 'nextReview' card and apply its buffer.
            // It might not be *strictly* the very first if a slightly later card has a HUGE buffer,
            // but for "Next Session" display, this is usually sufficient.
            const card = await db.cards
                .where('nextReview')
                .above(now)
                .first();

            return card ? getEffectiveDueDate(card) : null;
        }
    },

    // Backup Operations
    async exportBackup(): Promise<{ decks: Deck[], cards: Card[] }> {
        const decks = await db.decks.toArray();
        const cards = await db.cards.toArray();
        return { decks, cards };
    },

    async importBackup(data: { decks: Deck[], cards: Card[] }): Promise<void> {
        await db.transaction('rw', db.decks, db.cards, async () => {
            // We do NOT clear existing data. We append.
            // Strategy: Create new decks for everything to avoid ID collisions.

            // Map old deck IDs to new deck IDs
            const deckIdMap = new Map<number, number>();

            for (const oldDeck of data.decks) {
                // Remove ID to let auto-increment assign a new one
                const { id, ...deckWithoutId } = oldDeck;
                const newDeckId = await db.decks.add(deckWithoutId);
                if (id) {
                    deckIdMap.set(id, newDeckId);
                }
            }

            // Import cards re-mapped to new deck IDs
            const cardsToImport = data.cards
                .filter(card => deckIdMap.has(card.deckId)) // Only import cards if their deck was imported
                .map(card => {
                    const { id: _id, ...cardWithoutId } = card; // eslint-disable-line @typescript-eslint/no-unused-vars
                    return {
                        ...cardWithoutId,
                        deckId: deckIdMap.get(card.deckId)!
                    };
                });

            if (cardsToImport.length > 0) {
                await db.cards.bulkAdd(cardsToImport);
            }
        });
    }
};
