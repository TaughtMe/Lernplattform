import React from 'react';
import { ArrowLeft, Trophy, Clock } from 'lucide-react';
import { useVocabTest } from '../../hooks/useVocabTest';
import { ActionButtons } from '../ActionButtons';
import { MobileCardSession } from '../MobileCardSession';
import { PageLayout } from '../layout/PageLayout';
import type { VocabTestConfiguration } from './VocabTestConfig';

interface VocabTestSessionProps {
    deckId: number;
    config: VocabTestConfiguration;
    onClose: () => void;
}

// ... imports ...

export const VocabTestSession: React.FC<VocabTestSessionProps> = ({ deckId, config, onClose }) => {
    const {
        currentCard,
        showAnswer,
        results,
        isComplete,
        isLoading,
        progress,
        handleFlip,
        handleResult
    } = useVocabTest(deckId, config);

    if (isLoading) return <div className="p-8 text-center text-text-main">Lade Test...</div>;

    if (isComplete) {
        // Result Screen
        const total = results.correct + results.wrong;
        const percentage = total > 0 ? Math.round((results.correct / total) * 100) : 0;

        let stars = 0;
        let message = "Nicht aufgeben!";

        if (percentage >= 90) {
            stars = 3;
            message = "Fantastisch! 🌟🌟🌟";
        } else if (percentage >= 70) {
            stars = 2;
            message = "Gut gemacht! 🌟🌟";
        } else if (percentage >= 50) {
            stars = 1;
            message = "Ganz okay. 🌟";
        } else {
            message = "Üben, üben, üben! 💪";
        }

        const completionContent = (
            <div className="flex flex-col items-center justify-center min-h-[85vh] text-center space-y-8 animate-fade-in text-text-main p-4">

                {/* Stars Animation Container */}
                <div className="flex gap-2 mb-4">
                    {[1, 2, 3].map((starIndex) => (
                        <div key={starIndex}
                            className={`transform transition-all duration-700 ${starIndex <= stars
                                ? 'scale-100 opacity-100 rotate-0'
                                : 'scale-75 opacity-30 grayscale'
                                }`}
                            style={{ transitionDelay: `${starIndex * 200}ms` }}
                        >
                            <Trophy className={`w-16 h-16 ${starIndex <= stars ? 'text-yellow-400 fill-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]' : 'text-slate-300 dark:text-slate-600'}`} />
                        </div>
                    ))}
                </div>

                <div className="space-y-2">
                    <h2 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                        {message}
                    </h2>
                    <p className="text-text-muted">Du hast {results.correct} von {total} Karten gemeistert.</p>
                </div>

                <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-blue-500 rounded-full blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
                    <div className="relative text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500">
                        {percentage}%
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 w-full max-w-sm mt-8">
                    <div className="bg-surface backdrop-blur-sm border border-border-default p-4 rounded-2xl flex flex-col items-center shadow-sm">
                        <span className="text-3xl font-bold text-green-500 dark:text-green-400">{results.correct}</span>
                        <span className="text-xs text-text-muted uppercase tracking-widest font-medium mt-1">Richtig</span>
                    </div>
                    <div className="bg-surface backdrop-blur-sm border border-border-default p-4 rounded-2xl flex flex-col items-center shadow-sm">
                        <span className="text-3xl font-bold text-red-500 dark:text-red-400">{results.wrong}</span>
                        <span className="text-xs text-text-muted uppercase tracking-widest font-medium mt-1">Falsch</span>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="mt-12 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center gap-3 shadow-[0_10px_20px_-10px_rgba(79,70,229,0.5)] hover:shadow-[0_15px_25px_-10px_rgba(79,70,229,0.6)] hover:-translate-y-1 transition-all"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Zurück zum Deck
                </button>
            </div>
        );
        return <PageLayout className="min-h-screen bg-background" header={null} content={completionContent} />;
    }

    const MainContent = (
        <div className="w-full max-w-none md:max-w-4xl md:mx-auto p-0 md:p-8 flex flex-col min-h-[60vh] relative">
            {/* Header Area */}
            <div className="relative flex items-center justify-between h-14 mb-4 px-4 pt-4 md:px-0 md:pt-0">
                {/* Left: Quit Button */}
                <button
                    onClick={onClose}
                    className="flex items-center gap-2 p-2 -ml-2 text-base text-text-muted hover:text-text-main transition-colors active:scale-95 touch-manipulation"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span>Beenden</span>
                </button>

                {/* Center: Progress Bar or Timer */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[200px] flex flex-col items-center">
                    {/* Timer Handling */}
                    {config.mode === 'time' && progress.timeLeftFormatted ? (
                        <div className={`text-xl font-mono font-bold flex items-center gap-2 ${(parseInt(progress.timeLeftFormatted.split(':')[0]) === 0 && parseInt(progress.timeLeftFormatted.split(':')[1]) < 30)
                            ? 'text-red-500 animate-pulse'
                            : 'text-text-main'
                            }`}>
                            <Clock className="w-4 h-4" />
                            {progress.timeLeftFormatted}
                        </div>
                    ) : (
                        <div className="w-full flex flex-col gap-1">
                            <div className="text-xs text-center text-text-muted font-medium">
                                Karte {progress.current} von {progress.total}
                            </div>
                            <div className="h-1.5 bg-gray-200 dark:bg-slate-800 rounded-full overflow-hidden w-full">
                                <div
                                    className="h-full bg-indigo-500 transition-all duration-300 ease-out"
                                    style={{ width: `${progress.percentage}%` }}
                                ></div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Score (Small) */}
                <div className="flex gap-2">
                    <span className="text-green-600 dark:text-green-500 font-bold">{results.correct}</span>
                    <span className="text-text-muted">/</span>
                    <span className="text-red-500 font-bold">{results.wrong}</span>
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center relative w-full">
                <div className="relative w-full flex flex-col">
                    <div className="w-full">
                        <MobileCardSession
                            key={currentCard?.id}
                            card={currentCard!}
                            mode="oral"
                            showAnswer={showAnswer}
                            isRetryMode={false}
                            onFlip={handleFlip}
                            onResult={handleResult}
                            questionLang={config.direction === 'reverse' ? 'de-DE' : 'en-US'}
                            answerLang={config.direction === 'reverse' ? 'en-US' : 'de-DE'}
                        />
                    </div>
                </div>

                {/* Mobile Action Buttons - Outside Card */}
                {showAnswer && (
                    <div className="w-full max-w-md mx-auto mt-6 animate-in fade-in slide-in-from-bottom-4 duration-300 px-4 md:px-0">
                        <ActionButtons
                            onCorrect={() => handleResult(true)}
                            onWrong={() => handleResult(false)}
                            className="bg-surface/50 backdrop-blur-sm rounded-2xl p-2"
                        />
                    </div>
                )}
            </div>
        </div>
    );

    return <PageLayout className="min-h-screen bg-background" header={null} content={MainContent} />;
};
