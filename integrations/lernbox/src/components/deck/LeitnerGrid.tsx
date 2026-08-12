import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Card } from '../../types';

interface LeitnerGridProps { cards: Card[]; deckId: string; isReverse?: boolean; }

export const LeitnerGrid: React.FC<LeitnerGridProps> = ({ cards, deckId, isReverse = false }) => {
    const [practiceWithWriting, setPracticeWithWriting] = useState(false);

    const getBoxStyle = (count: number) => {
        // Base structure for all boxes
        const base = "relative flex flex-col items-center justify-center h-32 p-4 rounded-xl border transition-all duration-200 group";

        // State A: Empty Box (The "Slot")
        // Recessed look with inner shadow
        const empty = "bg-surface-hover border-border-default text-text-muted shadow-inner cursor-default pointer-events-none";

        // State B: Filled Box (The "Stack") 
        // Physical look with drop shadow and "standing" height
        // We use the brand color (primary) for the border on hover/active to show "Focus" (State C)
        const filled = `
            bg-surface 
            border-border-default 
            text-text-main
            shadow-sm hover:shadow-md 
            hover:-translate-y-1 
            hover:border-primary hover:bg-surface-hover
            active:scale-95
        `;

        if (count === 0) return `${base} ${empty}`;

        return `${base} ${filled}`;
    };

    return (
        <div className="mb-8">
            <div className={`flex mb-4 items-center ${isReverse ? 'flex-row-reverse' : 'flex-row justify-between'}`}>
                <h3 className="text-lg font-bold text-text-main flex gap-2">{isReverse && '🔄'} Gezieltes Üben</h3>
                <label className={`flex items-center gap-2 cursor-pointer text-sm text-text-muted hover:text-text-main ${isReverse ? 'mr-auto ml-4' : ''}`}>
                    <span>Schreiben ✍️</span>
                    <input type="checkbox" className="accent-indigo-500 w-4 h-4" checked={practiceWithWriting} onChange={e => setPracticeWithWriting(e.target.checked)} />
                </label>
            </div>

            {/* Grid Layout */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {[1, 2, 3, 4, 5].map(box => {
                    const count = cards.filter(c => c.box === box).length;
                    return (
                        <Link key={box} to={`/learn/${deckId}?box=${box}&mode=${practiceWithWriting ? 'practice-writing' : 'practice'}${isReverse ? '&direction=reverse' : ''}`}
                            className={getBoxStyle(count)}>

                            {/* Label: "Drawer Label" style */}
                            <div className="text-xs font-bold uppercase tracking-widest mb-1 text-text-muted">
                                Box {box}
                            </div>

                            {/* Count: Big and Bold */}
                            <div className={`text-3xl font-bold ${count === 0 ? 'opacity-50' : ''}`}>
                                {count}
                            </div>

                            {/* Visual Stack Cue (Simple layered effect for non-empty boxes) */}
                            {count > 0 && (
                                <div className="absolute bottom-2 w-8 h-1 bg-current opacity-10 rounded-full" />
                            )}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
};
