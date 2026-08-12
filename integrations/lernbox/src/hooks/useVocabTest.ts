import { useState, useEffect, useMemo } from 'react';
import { vocabularyService } from '../services/db.service';
import type { Card } from '../types';
import type { VocabTestConfiguration } from '../components/vocab-test/VocabTestConfig';

function shuffleArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

export const useVocabTest = (deckId: number | undefined, config: VocabTestConfiguration | null) => {
    const [testCards, setTestCards] = useState<Card[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);
    const [results, setResults] = useState<{ correct: number; wrong: number }>({ correct: 0, wrong: 0 });
    const [timeLeft, setTimeLeft] = useState<number | null>(null); // in seconds
    const [isComplete, setIsComplete] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Initial Fetch & Setup
    useEffect(() => {
        if (!deckId || !config) return;

        const initTest = async () => {
            // Re-set true here just in case of re-runs
            setIsLoading(true);
            try {
                // 1. Fetch Cards
                const rawCards = await vocabularyService.getCards(deckId);

                // 2. Filter by Tags
                let filtered = rawCards;
                if (config.selectedTags.length > 0) {
                    filtered = rawCards.filter(c =>
                        c.tag && config.selectedTags.includes(c.tag.trim())
                    );
                }

                // 3. Shuffle
                const shuffled = shuffleArray(filtered);

                // 4. Apply Limit (Only for Count mode)
                let finalCards = shuffled;
                if (config.mode === 'count') {
                    finalCards = shuffled.slice(0, config.value);
                }
                // In 'time' mode, we keep the full shuffled array to avoid running out

                if (finalCards.length === 0) {
                    setTestCards([]);
                    setIsComplete(true);
                    setIsLoading(false);
                    return;
                }

                setTestCards(finalCards);

                // Set Timer if applicable
                if (config.mode === 'time') {
                    setTimeLeft(config.value * 60);
                } else {
                    setTimeLeft(null);
                }

                // Reset State
                setCurrentIndex(0);
                setShowAnswer(false);
                setResults({ correct: 0, wrong: 0 });
                setIsComplete(false);

            } catch (err) {
                console.error("Failed to initialize vocab test:", err);
            } finally {
                setIsLoading(false);
            }
        };

        initTest();
    }, [deckId, config]);

    // Timer Logic
    useEffect(() => {
        if (config?.mode !== 'time' || timeLeft === null || isComplete) return;

        if (timeLeft <= 0) {
            setIsComplete(true);
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev === null || prev <= 0) {
                    clearInterval(timer);
                    setIsComplete(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [config?.mode, timeLeft, isComplete]);


    // Computed Current Card (handling direction)
    const rawCard = testCards[currentIndex];

    // We use useMemo to stabilize the object reference and apply direction logic
    const currentCard = useMemo(() => {
        if (!rawCard) return undefined;

        let shouldSwap = false;

        if (config?.direction === 'reverse') {
            shouldSwap = true;
        } else if (config?.direction === 'mixed') {
            // Deterministic random check for 'mixed' based on card ID to keep it stable during re-renders of same card
            // or just use a stable property. 
            // Better: When shuffling, maybe mapped them to "QuestionCard" objects with explicit q/a.
            // But to fit current architecture, we swap properties on the fly.
            // To ensure stability during 'showAnswer' re-renders, use currentIndex as seed or rely on rawCard.id
            if ((rawCard.id || 0) % 2 !== 0) { // Simple deterministic swap for 50%
                shouldSwap = true;
            }
        }

        if (shouldSwap) {
            return {
                ...rawCard,
                question: rawCard.answer,
                answer: rawCard.question
            } as Card;
        }

        return rawCard;
    }, [rawCard, config?.direction]);


    // Actions
    const handleFlip = () => setShowAnswer(true);

    const handleResult = (correct: boolean) => {
        setResults(prev => ({
            correct: correct ? prev.correct + 1 : prev.correct,
            wrong: !correct ? prev.wrong + 1 : prev.wrong
        }));

        setShowAnswer(false);

        // Navigation Logic
        if (currentIndex < testCards.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            // End of stack
            setIsComplete(true);
        }
    };

    const progress = {
        current: currentIndex + 1,
        total: testCards.length,
        percentage: testCards.length > 0 ? ((currentIndex + 1) / testCards.length) * 100 : 0,
        timeLeftFormatted: timeLeft !== null ? `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}` : null
    };

    return {
        currentCard,
        showAnswer,
        results,
        isComplete,
        isLoading,
        progress,
        handleFlip,
        handleResult
    };
};
