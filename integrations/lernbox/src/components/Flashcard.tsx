import React, { useState } from 'react';
import { Volume2 } from 'lucide-react';
import { ActionButtons } from './ActionButtons';
import type { Card } from '../types';
import { normalizeAnswer } from '../utils/textUtils';

interface FlashcardProps {
    card: Card;
    mode?: 'oral' | 'writing' | 'practice-writing';
    showAnswer: boolean;
    onResult: (correct: boolean) => void;
    onFlip: () => void;
    isRetryMode?: boolean;
    questionLang?: string;
    answerLang?: string;
}

export const Flashcard: React.FC<FlashcardProps> = React.memo(({ card, mode = 'oral', showAnswer, onResult, onFlip, isRetryMode = false, questionLang, answerLang }) => {
    // Dynamische Schriftgröße berechnen
    const getFontSize = (text: string) => {
        if (text.length < 20) return 'text-3xl';
        if (text.length < 50) return 'text-2xl';
        if (text.length < 100) return 'text-xl';
        return 'text-base';
    };

    const [input, setInput] = useState('');
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleCheck = (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (isProcessing) return;

        const isCorrect = normalizeAnswer(input) === normalizeAnswer(card.answer);

        if (isCorrect) {
            setFeedback('correct');
            setIsProcessing(true);
            setTimeout(() => onResult(true), 1000);
        } else {
            setFeedback('wrong');
            setIsProcessing(true);
            // Im Writing-Mode drehen wir die Karte um (für Second Chance oder Lösung)
            setTimeout(() => {
                onFlip();
                setIsProcessing(false);
            }, 500);
        }
    };

    const isWriting = mode === 'writing' || mode === 'practice-writing';

    // TTS Function
    const speak = (text: string, lang?: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (!lang || lang === 'la' || !window.speechSynthesis) return;

        // Cancel previous speech to prevent overlapping or queueing delays
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        window.speechSynthesis.speak(utterance);
    };

    // WICHTIG: Hier definieren wir den sauberen Style OHNE scrollbar-Klassen
    // 'overflow-y-auto' sorgt dafür, dass der Balken NUR erscheint, wenn Text zu lang ist.
    // [scrollbar-width:none] versteckt Balken in Firefox
    // [&::-webkit-scrollbar]:hidden versteckt Balken in Chrome/Safari/Edge
    const textContainerStyle = "w-full max-h-full overflow-y-auto text-center px-4 break-words font-bold text-text-main [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

    return (
        <div
            className="w-full max-w-3xl mx-auto aspect-[3/2] cursor-pointer relative flex flex-col bg-surface rounded-2xl border border-border-default shadow-xl overflow-hidden transition-all duration-200"
            onClick={!isWriting ? onFlip : undefined}
        >

            {/* CARD CONTENT AREA */}
            <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">

                {showAnswer ? (
                    // --- VIEW: BACK (ANSWER) ---
                    <div className="w-full h-full flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-4 z-20">
                            <span className={`text-xs font-bold uppercase tracking-widest ${isRetryMode ? 'text-red-500 dark:text-red-400' : 'text-text-muted'}`}>
                                {isRetryMode ? 'Leider falsch geschrieben' : 'Antwort'}
                            </span>
                            {answerLang && answerLang !== 'la' && (
                                <button
                                    onClick={(e) => speak(card.answer, answerLang, e)}
                                    className="p-2 text-text-muted hover:text-primary bg-surface-hover/50 hover:bg-surface-hover active:bg-surface-active active:scale-95 rounded-full transition-all"
                                    title="Vorlesen"
                                >
                                    <Volume2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        <div className="flex-1 flex items-center justify-center w-full min-h-0 overflow-hidden">
                            <div className={`${textContainerStyle} ${getFontSize(card.answer)}`}>
                                {card.answer}
                            </div>
                        </div>

                        <div className="mt-auto pt-6 w-full flex flex-col items-center">
                            {isRetryMode ? (
                                <div className="flex flex-col items-center mb-4 w-full">
                                    <div className="text-red-500 dark:text-red-400 text-lg mb-2 text-center font-medium">
                                        Deine Eingabe: {input}
                                    </div>
                                    <div className="text-text-muted text-sm font-medium text-center">
                                        Wusstest du es trotzdem?
                                    </div>
                                </div>
                            ) : (
                                isWriting && feedback === 'wrong' && (
                                    <div className="mb-4 text-red-500 dark:text-red-400 font-bold bg-red-100 dark:bg-red-900/20 px-4 py-2 rounded">
                                        Deine Antwort: {input}
                                    </div>
                                )
                            )}

                            <div className="flex justify-center gap-12 w-full pb-2">
                                <ActionButtons
                                    onCorrect={() => onResult(true)}
                                    onWrong={() => onResult(false)}
                                    className="gap-12"
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    // --- VIEW: FRONT (QUESTION) ---
                    <div className="w-full h-full flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-4 z-20">
                            <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Frage</span>
                            {questionLang && questionLang !== 'la' && (
                                <button
                                    onClick={(e) => speak(card.question, questionLang, e)}
                                    className="p-2 text-text-muted hover:text-primary bg-surface-hover/50 hover:bg-surface-hover active:bg-surface-active active:scale-95 rounded-full transition-all"
                                    title="Vorlesen"
                                >
                                    <Volume2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        <div className="flex-1 flex items-center justify-center w-full min-h-0 overflow-hidden">
                            <div className={`${textContainerStyle} ${getFontSize(card.question)}`}>
                                {card.question}
                            </div>
                        </div>

                        <div className="mt-auto pt-6 w-full flex justify-center">
                            {isWriting ? (
                                <div className="w-full max-w-xs" onClick={e => e.stopPropagation()}>
                                    <form onSubmit={handleCheck} className="flex flex-col gap-2">
                                        <input
                                            type="text"
                                            value={input}
                                            onChange={e => setInput(e.target.value)}
                                            placeholder="Antwort tippen..."
                                            className={`w-full p-3 rounded-lg text-center bg-background text-text-main border-2 outline-none transition-colors ${feedback === 'correct' ? 'border-green-500 bg-green-900/10' :
                                                feedback === 'wrong' ? 'border-red-500 bg-red-900/10' :
                                                    'border-border-default focus:border-primary'
                                                }`}
                                            autoFocus
                                        />
                                        <button
                                            type="submit"
                                            disabled={isProcessing}
                                            className={`w-full py-2 bg-primary hover:bg-primary-hover active:scale-[0.98] text-white rounded-lg font-bold transition-all ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            Prüfen
                                        </button>
                                        {feedback === 'correct' && isWriting && (
                                            <div className="mt-2 text-center animate-bounce">
                                                <span className="text-yellow-500 dark:text-yellow-400 font-bold drop-shadow-md">
                                                    🌟 Richtig!
                                                </span>
                                            </div>
                                        )}
                                    </form>
                                </div>
                            ) : (
                                <p className="mt-8 text-sm text-text-muted/50 animate-pulse">
                                    (Tippen zum Umdrehen)
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});
