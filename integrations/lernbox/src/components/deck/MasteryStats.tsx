import React from 'react';
import type { Card } from '../../types';

interface MasteryStatsProps {
    cards: Card[];
}

export const MasteryStats: React.FC<MasteryStatsProps> = ({ cards }) => {
    const goldCount = cards.filter(c => (c.writingStreak || 0) >= 3).length;
    const silverCount = cards.filter(c => (c.writingStreak || 0) === 2).length;
    const bronzeCount = cards.filter(c => (c.writingStreak || 0) === 1).length;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {/* Gold */}
            <div className="bg-surface rounded-2xl p-6 border border-amber-500/20 flex flex-col items-center justify-center relative overflow-hidden group hover:bg-surface-hover transition-all shadow-sm">
                <div className="absolute inset-0 bg-amber-500/5 pointer-events-none" />
                <div className="relative z-10 text-center">
                    <div className="mb-3 text-4xl filter drop-shadow-lg transform group-hover:scale-110 transition-transform duration-300">
                        🥇
                    </div>
                    <div className="text-3xl font-bold text-yellow-700 dark:text-yellow-500 mb-1 font-mono">{goldCount}</div>
                    <div className="text-xs font-bold text-yellow-700 dark:text-yellow-500 tracking-widest uppercase">Gold</div>
                </div>
            </div>

            {/* Silver */}
            <div className="bg-surface rounded-2xl p-6 border border-border-default flex flex-col items-center justify-center relative overflow-hidden group hover:bg-surface-hover transition-all shadow-sm">
                <div className="absolute inset-0 bg-slate-400/5 pointer-events-none" />
                <div className="relative z-10 text-center">
                    <div className="mb-3 text-4xl filter drop-shadow-lg transform group-hover:scale-110 transition-transform duration-300">
                        🥈
                    </div>
                    <div className="text-3xl font-bold text-slate-600 dark:text-slate-400 mb-1 font-mono">{silverCount}</div>
                    <div className="text-xs font-bold text-slate-600 dark:text-slate-400 tracking-widest uppercase">Silber</div>
                </div>
            </div>

            {/* Bronze */}
            <div className="bg-surface rounded-2xl p-6 border border-orange-700/20 flex flex-col items-center justify-center relative overflow-hidden group hover:bg-surface-hover transition-all shadow-sm">
                <div className="absolute inset-0 bg-orange-700/5 pointer-events-none" />
                <div className="relative z-10 text-center">
                    <div className="mb-3 text-4xl filter drop-shadow-lg transform group-hover:scale-110 transition-transform duration-300">
                        🥉
                    </div>
                    <div className="text-3xl font-bold text-orange-700 dark:text-orange-500 mb-1 font-mono">{bronzeCount}</div>
                    <div className="text-xs font-bold text-orange-700 dark:text-orange-500 tracking-widest uppercase">Bronze</div>
                </div>
            </div>
        </div>
    );
};
