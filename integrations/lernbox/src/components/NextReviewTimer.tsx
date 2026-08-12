import React, { useState, useEffect } from 'react';
import { vocabularyService } from '../services/db.service';

interface NextReviewTimerProps {
    deckId?: string;
    isReverse?: boolean;
    dueCount: number;
}

export const NextReviewTimer: React.FC<NextReviewTimerProps> = ({ deckId, isReverse = false, dueCount }) => {
    const [nextSessionAt, setNextSessionAt] = useState<number | null>(null);
    const [timeLeft, setTimeLeft] = useState<string>('');
    const [isSuccessState, setIsSuccessState] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const fetchNextSession = async () => {
            const time = await vocabularyService.getNextSessionAt(deckId ? parseInt(deckId) : undefined);
            setNextSessionAt(time);
        };

        fetchNextSession();
        // Set up interval to refresh "next session" occasionally in case of sync, 
        // though usually parent `dueCount` updates drive this.
        const interval = setInterval(fetchNextSession, 60000);
        return () => clearInterval(interval);
    }, [deckId, dueCount]);

    useEffect(() => {
        const updateTimer = () => {
            if (dueCount > 0) {
                setIsVisible(false);
                return;
            }

            if (!nextSessionAt) {
                setIsVisible(false);
                return;
            }

            const now = Date.now();
            // The value returned by getNextSessionAt is now the "Effective Due Date" (Due - Buffer)
            // So we count down to it directly.
            const targetTime = nextSessionAt;
            const diff = targetTime - now;

            if (diff <= 0) {
                setIsVisible(false);
                return;
            }

            // Always calculate time left
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            const h = hours.toString().padStart(2, '0');
            const m = minutes.toString().padStart(2, '0');
            const s = seconds.toString().padStart(2, '0');

            setTimeLeft(`${h}:${m}:${s}`);

            // ONE HOUR CHECK for styling/state
            const isLongWait = diff > 3600000; // 1 hour in ms

            if (isLongWait) {
                // State B: All Caught Up (Success)
                setIsSuccessState(true);
                setIsVisible(true);
            } else {
                // State A: Timer Running (< 1h)
                setIsSuccessState(false);
                setIsVisible(true);
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [nextSessionAt, dueCount]);

    if (!isVisible) return null;

    return (
        <div className={`flex flex-col ${isReverse ? 'items-start text-left' : 'items-end text-right'} select-none animate-in fade-in duration-500`}>
            {isSuccessState ? (
                // State B: All Caught Up
                <div className={`flex flex-col ${isReverse ? 'items-start' : 'items-end'}`}>
                    {/* "Alles erledigt" moved up, Party Hat instead of checkmark */}
                    <div className="text-teal-200 font-bold text-lg tracking-wide mb-1">
                        Alles erledigt! <span className="text-2xl ml-1">🎉</span>
                    </div>

                    {/* Timer added back below */}
                    <div className="text-white/60 text-[10px] font-bold uppercase tracking-wider mb-0.5">
                        Nächste Abfrage
                    </div>
                    <div className="font-mono font-medium text-3xl leading-none text-white/90 drop-shadow-sm tabular-nums">
                        {timeLeft}
                    </div>
                </div>
            ) : (
                // State A: Timer Running (Short duration)
                <>
                    <div className="text-white/60 text-[10px] font-bold uppercase tracking-wider mb-1">
                        Nächste Abfrage
                    </div>
                    <div className="font-mono font-medium text-3xl leading-none text-white/90 drop-shadow-sm tabular-nums">
                        {timeLeft}
                    </div>
                </>
            )}
        </div>
    );
};
