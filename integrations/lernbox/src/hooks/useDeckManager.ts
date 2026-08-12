import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useLeitnerSystem } from './useLeitnerSystem';
import { db } from '../services/db.service';
import { calculateExportSize, getCapacityColor, SAFE_QR_LIMIT } from '../utils/exportUtils';
import { isFeatureEnabled } from '../config/features';
import type { Deck, Card } from '../types';

export const useDeckManager = (deckId: string | undefined) => {
    const parsedId = deckId ? parseInt(deckId) : 0;
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // Core Data
    const { cards, loading, addCard, deleteCard, updateCard } = useLeitnerSystem(parsedId);
    // Removed deckName state, replacing with deck object
    const [deck, setDeck] = useState<Deck | undefined>(undefined);

    // UI States
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [showExport, setShowExport] = useState(false);

    // Reverse Mode
    const [isReverse, setIsReverse] = useState(searchParams.get('reverse') === 'true');
    const [isFlipping, setIsFlipping] = useState(false);

    // Collapsible State (UI only, but maintained here for 'state separation')
    // Collapsible State
    const [isNewCardOpen, setIsNewCardOpen] = useState(() => {
        return sessionStorage.getItem('deck_new_card_open') === 'true';
    });
    const [isCardListOpen, setIsCardListOpen] = useState(() => {
        return sessionStorage.getItem('deck_list_open') === 'true';
    });

    // Persistence Effects
    useEffect(() => {
        sessionStorage.setItem('deck_new_card_open', String(isNewCardOpen));
    }, [isNewCardOpen]);

    useEffect(() => {
        sessionStorage.setItem('deck_list_open', String(isCardListOpen));
    }, [isCardListOpen]);

    // Load Deck
    useEffect(() => {
        if (parsedId) {
            db.decks.get(parsedId).then(d => setDeck(d));
        }
    }, [parsedId]);

    // Reverse Mode Toggle Animation
    const toggleReverseMode = () => {
        if (!isFeatureEnabled('enableReverseMode')) return;

        setIsFlipping(true);
        setTimeout(() => {
            const newState = !isReverse;
            setIsReverse(newState);
            setSearchParams(params => {
                if (newState) params.set('reverse', 'true');
                else params.delete('reverse');
                return params;
            });
            setTimeout(() => { setIsFlipping(false); }, 150);
        }, 300);
    };

    // Computed: Active Cards (Swapping Data on Reverse)
    const activeCards = useMemo(() => {
        return cards.map(c => ({
            ...c,
            // Im Reverse Mode nutzen wir die Reverse-Werte für die Anzeige
            box: isReverse ? (c.reverseBox || 1) : c.box,
            nextReview: isReverse ? (c.reverseNextReview || 0) : c.nextReview,
            writingStreak: isReverse ? (c.reverseWritingStreak || 0) : c.writingStreak,
        }));
    }, [cards, isReverse]);

    // Computed: Stats
    const dueCount = activeCards.filter(c => c.nextReview <= Date.now()).length;
    const goldCount = activeCards.filter(c => (c.writingStreak || 0) >= 3).length;
    const silverCount = activeCards.filter(c => (c.writingStreak || 0) === 2).length;
    const bronzeCount = activeCards.filter(c => (c.writingStreak || 0) === 1).length;
    const availableTags = useMemo(() => Array.from(new Set(activeCards.map(c => c.tag).filter((t): t is string => !!t))).sort(), [activeCards]);

    // Computed: Export
    const selectedCards = useMemo(() => cards.filter(c => selectedIds.includes(c.id!)), [cards, selectedIds]);
    // Calculations for view consumers
    const exportSize = calculateExportSize(selectedCards);
    const exportUsage = Math.min(100, (exportSize / SAFE_QR_LIMIT) * 100);
    const exportColor = getCapacityColor(exportSize);

    // Handlers
    const handlers = {
        toggleSelect: (id: number) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]),
        selectAll: (e: React.MouseEvent) => {
            e.stopPropagation();
            if (selectedIds.length === activeCards.length) setSelectedIds([]);
            else setSelectedIds(activeCards.map(c => c.id!));
        },
        startShare: (e: React.MouseEvent) => {
            e.stopPropagation();
            setIsSelectionMode(true);
            setSelectedIds([]);
            setIsCardListOpen(true);
        },
        finishShare: (e: React.MouseEvent) => {
            e.stopPropagation();
            if (selectedIds.length === 0) {
                setIsSelectionMode(false);
                return;
            }
            setShowExport(true);
        },
        cancelShare: (e: React.MouseEvent) => {
            e.stopPropagation();
            setIsSelectionMode(false);
            setSelectedIds([]);
        },
        toggleNewCard: () => setIsNewCardOpen(!isNewCardOpen),
        toggleCardList: () => setIsCardListOpen(!isCardListOpen),
        closeExport: () => setShowExport(false),
        navigateHome: () => navigate('/'),
        addCard,
        deleteCard,
        updateCard: async (card: Card) => { await updateCard(card); }
    };

    return {
        state: {
            loading,
            deck,
            deckName: deck?.name || '', // Backward compatibility
            isSelectionMode,
            selectedIds,
            showExport,
            isReverse,
            isFlipping,
            isNewCardOpen,
            isCardListOpen,
            selectedCards, // raw cards for export
        },
        data: {
            activeCards, // transformed for UI
            dueCount,
            stats: { gold: goldCount, silver: silverCount, bronze: bronzeCount },
            availableTags,
            exportData: { usage: exportUsage, color: exportColor, count: selectedIds.length }
        },
        actions: {
            toggleReverseMode,
            ...handlers
        }
    };
};
