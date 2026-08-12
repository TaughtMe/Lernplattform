import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Trophy, AlertCircle } from 'lucide-react';
import { useLearningSessionCore } from '../hooks/useLearningSessionCore';
import { MobileCardSession } from './MobileCardSession';
import { ActionButtons } from './ActionButtons';
import { PageLayout } from './layout/PageLayout';
import { LEARNING_MODES, DIRECTIONS } from '../constants';

export const MobileLearningSession: React.FC = () => {
    const { state, actions } = useLearningSessionCore();
    const { currentCard, isLoading, isComplete, isEmpty, sessionStats, reward, showAnswer, isRetryMode, fetchMode, inputMode, direction, progress, deckId } = state;

    if (isLoading) return <div className="p-8 text-center text-white">Lade Karten...</div>;

    if (isComplete || isEmpty) {
        const content = (
            <div className="w-full flex flex-col items-center justify-center p-4 animate-fade-in text-text-main">
                {isEmpty && !sessionStats.correct ? (
                    <>
                        <h2 className="text-2xl font-bold mb-4">Alles erledigt! 🎉</h2>
                        <p className="text-text-muted mb-8 text-center">
                            {fetchMode === LEARNING_MODES.PRACTICE ? 'Keine Karten in dieser Box.' : 'Keine Karten mehr für jetzt fällig.'}
                        </p>
                    </>
                ) : (
                    <>
                        <div className="bg-yellow-100 dark:bg-yellow-900/30 p-6 rounded-full mb-6">
                            <Trophy className="w-20 h-20 text-yellow-500" />
                        </div>
                        <h2 className="text-3xl font-bold mb-2">Session Complete!</h2>
                        {fetchMode === LEARNING_MODES.PRACTICE && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-lg text-sm mb-6">
                                Übungsmodus - Status unverändert
                            </div>
                        )}
                        {!fetchMode && <div className="h-4"></div>}

                        <div className="flex gap-6 text-lg mb-8">
                            <div className="text-green-600 dark:text-green-400 font-bold flex flex-col items-center">
                                <span className="text-2xl">{sessionStats.correct}</span>
                                <span className="text-sm uppercase tracking-wider">Richtig</span>
                            </div>
                            <div className="text-red-500 dark:text-red-400 font-bold flex flex-col items-center">
                                <span className="text-2xl">{sessionStats.wrong}</span>
                                <span className="text-sm uppercase tracking-wider">Falsch</span>
                            </div>
                        </div>
                    </>
                )}

                <Link
                    to={`/deck/${deckId}${direction === DIRECTIONS.REVERSE ? '?reverse=true' : ''}`}
                    className="w-full max-w-xs btn-primary bg-primary text-white rounded-lg flex flex-row items-center justify-center gap-2 px-8 py-4 hover:bg-primary-hover transition-colors font-bold shadow-lg active:scale-95 text-lg"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span>Zurück zum Deck</span>
                </Link>
            </div>
        );
        return <PageLayout className="min-h-screen bg-background" header={null} content={content} />;
    }

    const MainContent = (
        <div className="w-full max-w-none md:max-w-4xl md:mx-auto p-0 md:p-8 flex flex-col min-h-[60vh] relative">
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
                            Practice
                        </span>
                    </div>
                )}

                {/* Right: Remaining Count */}
                <div className="text-base text-text-muted font-medium p-2 -mr-2">
                    {progress.remaining} verbleibend
                </div>
            </div>

            {/* Optional Alert for Practice Mode */}
            {fetchMode === LEARNING_MODES.PRACTICE && (
                <div className="flex justify-center mb-4">
                    <span className="text-[10px] text-blue-500/60 dark:text-blue-400/60 flex items-center gap-1.5">
                        <AlertCircle className="w-3 h-3" />
                        Nicht gespeichert
                    </span>
                </div>
            )}

            <div className="flex-1 flex flex-col items-center justify-center relative w-full">
                <div className="relative w-full flex flex-col">
                    {/* Silver Shimmer */}
                    {reward === 'silver' && (
                        <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden rounded-xl">
                            <div className="animate-shimmer"></div>
                        </div>
                    )}

                    {/* Card */}
                    <div className="w-full">
                        <MobileCardSession
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

                {/* Mobile Action Buttons - Outside Card */}
                {showAnswer && (
                    <div className="w-full max-w-md mx-auto mt-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <ActionButtons
                            onCorrect={() => actions.handleResult(true)}
                            onWrong={() => actions.handleResult(false)}
                            className="bg-surface/50 backdrop-blur-sm rounded-2xl p-2"
                        />
                    </div>
                )}

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
