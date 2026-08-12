import { useState, useMemo, useCallback } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { useSessionCards } from './useCards';
import { useLeitnerSystem } from './useLeitnerSystem';
import type { Card, Deck } from '../types';
import { db } from '../services/db.service';

export const useLearningSessionCore = () => {
    const { deckId } = useParams<{ deckId: string }>();
    const id = Number(deckId);

    // Query Params
    const [searchParams] = useSearchParams();
    const urlMode = searchParams.get('mode');
    const direction = searchParams.get('direction') === 'reverse' ? 'reverse' : 'forward';

    // Support 'box' param (primary) or 'level' (legacy)
    const boxParam = searchParams.get('box') || searchParams.get('level');
    const box = boxParam ? Number(boxParam) : undefined;

    // Derived Modes
    const fetchMode = (urlMode === 'practice' || urlMode === 'practice-writing') ? 'practice' : 'leitner';
    const inputMode: 'oral' | 'writing' = (urlMode === 'writing' || urlMode === 'practice-writing') ? 'writing' : 'oral';

    // Data Fetching
    const { sessionCards: dueCards, isLoading } = useSessionCards(id, fetchMode, box, direction);
    const { processResult } = useLeitnerSystem(id);
    const [deck, setDeck] = useState<Deck | undefined>();

    // Load Deck
    useMemo(() => {
        if (id) db.decks.get(id).then(setDeck);
    }, [id]);

    // Session State
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);
    const [sessionStats, setSessionStats] = useState({ correct: 0, wrong: 0 });
    const [reward, setReward] = useState<'bronze' | 'silver' | 'gold' | null>(null);
    const [isRetryMode, setIsRetryMode] = useState(false);

    // Current Card Computation (Reverse Logic)
    const rawCard = dueCards[currentCardIndex];
    const currentCard = useMemo(() => {
        if (!rawCard) return undefined;
        if (direction === 'reverse') {
            return {
                ...rawCard,
                question: rawCard.answer,
                answer: rawCard.question,
                box: rawCard.reverseBox || 1,
                nextReview: rawCard.reverseNextReview || 0,
                writingStreak: rawCard.reverseWritingStreak || 0
            } as Card;
        }
        return rawCard;
    }, [rawCard, direction]);

    // Actions
    // Actions
    const handleFlip = useCallback(() => {
        setShowAnswer(true);
        if (inputMode === 'writing') setIsRetryMode(true);
    }, [inputMode]);

    const advanceCard = useCallback(() => {
        setReward(null);
        setCurrentCardIndex(prev => prev + 1);
        setShowAnswer(false);
        setIsRetryMode(false);
    }, []);

    const handleResult = useCallback(async (correct: boolean) => {
        if (!currentCard) return;

        let triggerReward: 'bronze' | 'silver' | 'gold' | null = null;
        let secondChanceResult: 'recovered' | 'failed' | undefined = undefined;

        // Retry Logic
        if (isRetryMode) {
            secondChanceResult = correct ? 'recovered' : 'failed';
        } else if (inputMode === 'writing' && correct && fetchMode !== 'practice') {
            // Reward Logic
            const prevStreak = (direction === 'reverse' ? currentCard.writingStreak : currentCard.writingStreak) || 0;
            // NOTE above: currentCard derived props are ALREADY swapped in useLearningSessionCore line 54.
            // But wait, line 54 says: writingStreak: rawCard.reverseWritingStreak
            // So currentCard.writingStreak IS the correct streak to look at for the *current* direction.

            const nextStreak = prevStreak + 1;
            if (prevStreak === 0 && nextStreak === 1) triggerReward = 'bronze';
            else if (prevStreak === 1 && nextStreak === 2) triggerReward = 'silver';
            else if (prevStreak === 2 && nextStreak === 3) triggerReward = 'gold';
        }

        // DB Update (Use RAW card to preserve DB integrity)
        if (fetchMode !== 'practice') {
            await processResult(rawCard, correct, inputMode, secondChanceResult, direction);
        }

        // Update Stats
        setSessionStats(prev => ({
            correct: correct ? prev.correct + 1 : prev.correct,
            wrong: !correct ? prev.wrong + 1 : prev.wrong
        }));

        // Trigger Animations/Transition
        if (triggerReward) {
            setReward(triggerReward);
            if (triggerReward === 'gold') {
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 },
                    zIndex: 9999,
                    disableForReducedMotion: true
                });
            }
            setTimeout(() => advanceCard(), triggerReward === 'silver' ? 2500 : 2000);
        } else {
            advanceCard();
        }
    }, [currentCard, isRetryMode, inputMode, fetchMode, rawCard, processResult, direction, advanceCard]);



    const isComplete = !currentCard && (sessionStats.correct + sessionStats.wrong > 0 || dueCards.length === 0);
    const isEmpty = !currentCard && dueCards.length === 0 && sessionStats.correct === 0;

    return {
        state: {
            currentCard,
            showAnswer,
            reward,
            isRetryMode,
            sessionStats,
            isLoading,
            isComplete,
            isEmpty,
            fetchMode,
            inputMode,
            direction,
            progress: {
                current: currentCardIndex,
                total: dueCards.length,
                remaining: dueCards.length - currentCardIndex
            },
            deckId: id,
            deck
        },
        actions: {
            handleFlip,
            handleResult
        }
    };
};
