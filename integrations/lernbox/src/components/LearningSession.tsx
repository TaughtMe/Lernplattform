import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Trophy, AlertCircle } from 'lucide-react';
import { useLearningSessionCore } from '../hooks/useLearningSessionCore';
import { Flashcard } from './Flashcard';
import { PageLayout } from './layout/PageLayout';
import { LEARNING_MODES, DIRECTIONS } from '../constants';
import { useMediaQuery } from 'react-responsive';
import { MobileLearningSession } from './MobileLearningSession';

export const LearningSession: React.FC = () => {
    const { state, actions } = useLearningSessionCore();
    const { currentCard, isLoading, isComplete, isEmpty, sessionStats, reward, showAnswer, isRetryMode, fetchMode, inputMode, direction, progress, deckId } = state;

    const isMobile = useMediaQuery({ maxWidth: 767 });

    if (isMobile) {
        return <MobileLearningSession />;
    }

    if (isLoading) return <div className="p-8 text-center text-white">Lade Karten...</div>;

    if (isComplete || isEmpty) {
        // ... View Code for Complete/Empty ...
        // Extracting this to a simple view helper would be nice, but keeping it here is fine for now as logic is gone.
        const content = (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-6 animate-fade-in text-text-main">
                {isEmpty && !sessionStats.correct ? (
                    <>
                        <h2 className="text-2xl font-bold mb-4">Alles erledigt! 🎉</h2>
                        <p className="text-text-muted mb-8">
                            {fetchMode === LEARNING_MODES.PRACTICE ? 'Keine Karten in dieser Box.' : 'Keine Karten mehr für jetzt fällig.'}
                        </p>
                    </>
                ) : (
                    <>
                        <div className="bg-yellow-100 dark:bg-yellow-900/30 p-6 rounded-full">
                            <Trophy className="w-16 h-16 text-yellow-500" />
                        </div>
                        <h2 className="text-3xl font-bold">Session Complete!</h2>
                        {fetchMode === LEARNING_MODES.PRACTICE && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-lg text-sm">
                                Übungsmodus - Status unverändert
                            </div>
                        )}
                        <div className="flex gap-8 text-lg">
                            <div className="text-green-600 dark:text-green-400 font-bold">
                                {sessionStats.correct} Richtig
                            </div>
                            <div className="text-red-500 dark:text-red-400 font-bold">
                                {sessionStats.wrong} Falsch
                            </div>
                        </div>
                    </>
                )}

                <Link to={`/deck/${deckId}${direction === DIRECTIONS.REVERSE ? '?reverse=true' : ''}`} className="btn-primary mt-8 px-6 py-3 bg-primary text-white rounded-lg flex items-center justify-center gap-2 hover:bg-primary-hover transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Zurück zum Deck
                </Link>
            </div>
        );
        return <PageLayout className="min-h-screen bg-background" header={null} content={content} />;
    }

    const MainContent = (
        <div className="w-full md:max-w-4xl mx-auto px-4 py-4 landscape:py-2 flex flex-col h-[calc(100dvh-64px)] overflow-hidden relative">
            {/* Header Area */}
            <div className="relative flex items-center justify-between h-12 mb-6">
                {/* Left: Back Button */}
                <Link
                    to={`/deck/${deckId}${direction === DIRECTIONS.REVERSE ? '?reverse=true' : ''}`}
                    className="flex items-center gap-2 p-2 -ml-2 text-base text-text-muted hover:text-text-main transition-colors active:scale-95 touch-manipulation"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span>Zurück</span>
                </Link>

                {/* Center: Practice Mode Label */}
                {fetchMode === LEARNING_MODES.PRACTICE && (
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                        <span className="text-xs font-bold text-blue-500/80 dark:text-blue-400 tracking-wider uppercase bg-blue-100 dark:bg-blue-500/10 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-500/20">
                            Practice Mode
                        </span>
                    </div>
                )}

                {/* Right: Remaining Count */}
                <div className="text-base text-text-muted font-medium p-2 -mr-2">
                    {progress.remaining} verbleibend
                </div>
            </div>

            {/* Optional Alert for Practice Mode (positioned below header if needed, or integrated) 
                Keeping it simple as requested: "nach oben unter die Felder positionieren" 
            */}
            {fetchMode === LEARNING_MODES.PRACTICE && (
                <div className="flex justify-center mb-4">
                    <span className="text-[10px] text-blue-500/60 dark:text-blue-400/60 flex items-center gap-1.5">
                        <AlertCircle className="w-3 h-3" />
                        Ergebnisse werden nicht gespeichert
                    </span>
                </div>
            )}

            <div className="flex-1 flex flex-col items-center justify-center p-0 md:p-8 landscape:p-1 relative min-h-0">
                <div className="relative w-full h-full flex flex-col">
                    {/* Silver Shimmer */}
                    {reward === 'silver' && (
                        <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden rounded-xl">
                            <div className="animate-shimmer"></div>
                        </div>
                    )}

                    {/* Card */}
                    <div className="flex-1 min-h-0">
                        <Flashcard
                            key={currentCard!.id}
                            card={currentCard!}
                            mode={inputMode}
                            showAnswer={showAnswer}
                            isRetryMode={isRetryMode}
                            onFlip={actions.handleFlip}
                            onResult={actions.handleResult}
                            questionLang={direction === 'reverse' ? state.deck?.back_lang : state.deck?.front_lang}
                            answerLang={direction === 'reverse' ? state.deck?.front_lang : state.deck?.back_lang}
                        />
                    </div>
                </div>

                {/* Rewards */}
                {reward === 'bronze' && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
                        <div className="animate-bounce-in bg-amber-100 dark:bg-amber-900 p-8 rounded-2xl shadow-2xl text-center border-4 border-amber-500">
                            <span className="text-6xl mb-4 block">🥉</span>
                            <h3 className="text-2xl font-bold text-amber-800 dark:text-amber-100">Guter Start!</h3>
                        </div>
                    </div>
                )}
                {reward === 'silver' && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 text-center w-full pointer-events-none">
                        <div className="bg-surface text-text-main px-6 py-4 rounded-xl shadow-2xl inline-flex flex-col items-center border border-border-default animate-bounce-in">
                            <div className="text-xl font-bold flex items-center gap-2 mb-1">
                                <span className="text-3xl">🥈</span> Fast geschafft!
                            </div>
                            <div className="text-sm text-text-muted">Nur noch 1x für Gold!</div>
                        </div>
                    </div>
                )}
                {reward === 'gold' && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
                        <div className="animate-bounce-in bg-yellow-100 dark:bg-yellow-900 p-8 rounded-2xl shadow-2xl text-center border-4 border-yellow-500 transform scale-110">
                            <span className="text-7xl mb-4 block">🥇</span>
                            <h3 className="text-3xl font-extrabold text-yellow-800 dark:text-yellow-100 uppercase tracking-wider">MEISTERHAFT!</h3>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    return <PageLayout className="min-h-screen bg-background" header={null} content={MainContent} />;
};
