import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { vocabularyService } from '../services/db.service';
import type { Card, LeitnerLevel } from '../types';

export const useLeitnerSystem = (deckId: number) => {
    // Live Query for Cards
    const cards = useLiveQuery(
        () => vocabularyService.getCards(deckId),
        [deckId]
    ) ?? [];

    const loading = !cards && deckId > 0; // Simple loading state approximation

    // CRUD Wrappers
    const addCard = useCallback(async (question: string, answer: string, tag?: string) => {
        if (!deckId) return;
        return await vocabularyService.addCard(deckId, question, answer, tag);
    }, [deckId]);

    const updateCard = useCallback(async (card: Card) => {
        return await vocabularyService.updateCard(card);
    }, []);

    const deleteCard = useCallback(async (cardId: number) => {
        return await vocabularyService.deleteCard(cardId);
    }, []);

    const deleteDeck = useCallback(async (id: number) => {
        return await vocabularyService.deleteDeck(id);
    }, []);

    const processResult = useCallback(async (cardInput: Card, isCorrect: boolean, mode: 'oral' | 'writing' | 'practice' | 'practice-writing' = 'oral', secondChanceResult?: 'recovered' | 'failed', direction: 'forward' | 'reverse' = 'forward') => {
        if (!cardInput.id) return;

        // Practice Mode saves NOTHING
        if (mode.includes('practice')) return cardInput;

        // FETCH FRESH from DB to prevent data corruption from UI-swapped properties in Reverse Mode
        const dbCard = await vocabularyService.getCard(cardInput.id);
        if (!dbCard) return;

        const card = dbCard; // Use the clean DB object

        const now = Date.now();
        const DAY_MS = 24 * 60 * 60 * 1000;

        // Determine current values based on direction
        const currentBox = direction === 'reverse'
            ? (card.reverseBox || 1)
            : (card.box || card.level || 1);

        const currentStreak = direction === 'reverse'
            ? (card.reverseWritingStreak || 0)
            : (card.writingStreak || 0);

        // Core Leitner Logic
        let newBox = currentBox;

        if (secondChanceResult === 'recovered') {
            // Recovered -> Keep Box (don't advance, don't drop)
            newBox = currentBox;
        } else if (secondChanceResult === 'failed') {
            // Failed after retry -> Drop to 1
            newBox = 1;
        } else if (isCorrect) {
            // Correct -> Advance (max 5)
            newBox = Math.min(currentBox + 1, 5);
        } else {
            // Wrong -> Drop to 1
            newBox = 1;
        }

        // Interval Calculation
        // Box 5 (Maintenance) -> 7 Days (168h)
        // Box 1-4 -> 1 Day (24h)
        const newInterval = newBox === 5 ? 7 : 1;

        const nextReview = now + (newInterval * DAY_MS);

        // Writing Streak Logic
        let newStreak = currentStreak;
        if (mode === 'writing') {
            if (isCorrect && !secondChanceResult) {
                newStreak++;
            } else {
                newStreak = 0;
            }
        }

        // Construct Update Object
        const updates: Partial<Card> = { lastReviewed: now };

        if (direction === 'reverse') {
            updates.reverseBox = newBox;
            updates.reverseInterval = newInterval;
            updates.reverseNextReview = nextReview;
            if (mode === 'writing') updates.reverseWritingStreak = newStreak;
        } else {
            updates.box = newBox;
            updates.level = newBox as LeitnerLevel; // Legacy sync
            updates.interval = newInterval;
            updates.nextReview = nextReview;
            if (mode === 'writing') updates.writingStreak = newStreak;
        }

        const updatedCard = { ...card, ...updates };
        await vocabularyService.updateCard(updatedCard);
        return updatedCard;
    }, []);

    return {
        cards,
        loading,
        addCard,
        updateCard,
        deleteCard,
        deleteDeck,
        processResult
    };
};
