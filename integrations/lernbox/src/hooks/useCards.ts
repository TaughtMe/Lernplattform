import { useLiveQuery } from 'dexie-react-hooks';
import { useState, useEffect } from 'react';
import { vocabularyService } from '../services/db.service';
import type { Card } from '../types';

function shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

export const useCards = (deckId: number, limit?: number) => {
    const cards = useLiveQuery(() => vocabularyService.getCards(deckId, limit), [deckId, limit]);
    const isLoading = cards === undefined;

    return { cards: cards || [], isLoading };
};

export const useCardsDue = (deckId: number) => {
    const dueCards = useLiveQuery(() => vocabularyService.getCardsDue(deckId), [deckId]);
    const isLoading = dueCards === undefined;

    return { dueCards: dueCards || [], isLoading };
};

export const useSessionCards = (deckId: number, mode: 'leitner' | 'practice', box?: number, direction: 'forward' | 'reverse' = 'forward') => {
    const [sessionCards, setSessionCards] = useState<Card[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadCards = async () => {
            setIsLoading(true);
            let cards: Card[] = [];

            if (mode === 'practice' && box !== undefined) {
                cards = await vocabularyService.getCardsByBox(deckId, box, direction);
            } else {
                cards = await vocabularyService.getCardsDue(deckId, direction);
            }

            setSessionCards(shuffleArray(cards));
            setIsLoading(false);
        };

        loadCards();
    }, [deckId, mode, box, direction]);

    return { sessionCards, isLoading };
};
