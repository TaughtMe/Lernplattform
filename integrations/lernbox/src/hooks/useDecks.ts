import { useLiveQuery } from 'dexie-react-hooks';

import { vocabularyService } from '../services/db.service';




export const useDecks = () => {
    const decks = useLiveQuery(() => vocabularyService.getDecks());
    const isLoading = decks === undefined;

    return { decks: decks || [], isLoading };
};
