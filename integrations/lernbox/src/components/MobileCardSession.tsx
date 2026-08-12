import React, { useState } from 'react';
import { Volume2 } from 'lucide-react';
import type { Card } from '../types';
import { normalizeAnswer } from '../utils/textUtils';

interface MobileCardProps {
    card: Card;
    mode?: 'oral' | 'writing' | 'practice-writing';
    showAnswer: boolean;
    onResult: (correct: boolean) => void;
    onFlip: () => void;
    isRetryMode?: boolean;
    questionLang?: string;
    answerLang?: string;
}

export const MobileCardSession: React.FC<MobileCardProps> = React.memo(({ card, mode = 'oral', showAnswer, onResult, onFlip, isRetryMode = false, questionLang, answerLang }) => {
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
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        window.speechSynthesis.speak(utterance);
    };

    const textContainerStyle = "w-full max-h-full overflow-y-auto text-center px-4 py-2 break-words font-bold text-text-main [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

    return (
        <div className="w-[85%] max-w-xs aspect-[4/3] flex flex-col bg-surface shadow-xl rounded-2xl overflow-hidden relative mx-auto my-auto ring-1 ring-black/5 text-text-main">

            {/* CARD CONTENT AREA - Takes all available space */}
            <div className="flex-1 flex flex-col relative overflow-hidden" onClick={!isWriting ? onFlip : undefined}>

                {showAnswer ? (
                    // --- VIEW: BACK (ANSWER) ---
                    <div className="w-full h-full flex flex-col animate-in fade-in zoom-in-95 duration-200 p-4">
                        {/* Header */}
                        <div className="flex justify-between items-center mb-2 z-20 shrink-0">
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

                        {/* Scrolling Content */}
                        <div className="flex-1 flex items-center justify-center w-full min-h-0 overflow-y-auto">
                            <div className={`${textContainerStyle} ${getFontSize(card.answer)}`}>
                                {card.answer}
                            </div>
                        </div>

                        {/* Extra Feedback Info (Retry/Writing) */}
                        <div className="shrink-0 pt-4 w-full flex flex-col items-center">
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
                        </div>
                    </div>
                ) : (
                    // --- VIEW: FRONT (QUESTION) ---
                    <div className="w-full h-full flex flex-col animate-in fade-in zoom-in-95 duration-200 p-4">
                        <div className="flex justify-between items-center mb-2 z-20 shrink-0">
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

                        <div className="flex-1 flex items-center justify-center w-full min-h-0 overflow-y-auto">
                            <div className={`${textContainerStyle} ${getFontSize(card.question)}`}>
                                {card.question}
                            </div>
                        </div>

                        {/* Writing Input */}
                        {isWriting && (
                            <div className="shrink-0 pt-4 w-full flex justify-center" onClick={e => e.stopPropagation()}>
                                <div className="w-full">
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
                                            className={`w-full py-3 h-14 bg-primary hover:bg-primary-hover active:scale-[0.98] text-white rounded-lg font-bold transition-all ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            Prüfen
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )}

                        {!isWriting && (
                            <div className="shrink-0 pt-4 w-full flex justify-center">
                                <p className="text-sm text-text-muted/50 animate-pulse">
                                    (Tippen zum Umdrehen)
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>


        </div>
    );
});
