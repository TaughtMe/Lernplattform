import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db.service';

export const useDeckStats = (deckId: number) => {
    const stats = useLiveQuery(async () => {
        const now = Date.now();
        const cards = await db.cards.where('deckId').equals(deckId).toArray();

        const total = cards.length;
        const due = cards.filter(c => c.nextReview <= now).length;

        // Optional: Level counts
        const levels = {
            1: 0, 2: 0, 3: 0, 4: 0, 5: 0
        };
        cards.forEach(c => {
            if (c.level >= 1 && c.level <= 5) {
                levels[c.level]++;
            }
        });

        return { total, due, levels };
    }, [deckId]);

    return stats || { total: 0, due: 0, levels: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
};
