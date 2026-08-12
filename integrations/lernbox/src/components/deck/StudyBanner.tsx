import React from 'react';
import { Link } from 'react-router-dom';
import { Mic, PenTool } from 'lucide-react';
import { NextReviewTimer } from '../NextReviewTimer';

interface StudyBannerProps {
    dueCount: number;
    deckId: string;
    isReverse?: boolean;
}

export const StudyBanner: React.FC<StudyBannerProps> = ({ dueCount, deckId, isReverse = false }) => {
    return (
        // Gradient Direction Change based on isReverse
        <div className={`rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden group mb-8 transition-all duration-700 ${isReverse ? 'bg-gradient-to-r from-purple-600 to-indigo-600' : 'bg-gradient-to-br from-indigo-600 to-purple-700'}`}>
            <div className={`absolute top-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 blur-3xl pointer-events-none transition-all duration-700 ${isReverse ? 'left-0 -translate-x-16' : 'right-0 translate-x-16'}`}></div>

            <div className={`relative z-10 flex flex-col sm:flex-row justify-between items-center gap-8 ${isReverse ? 'sm:flex-row-reverse text-right' : 'text-left'}`}>

                {/* Text Content Wrapper */}
                <div className={`flex flex-col ${isReverse ? 'items-end' : 'items-start'} flex-1`}>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
                        {isReverse ? 'Spiegelwelt bereit?' : 'Bereit zu lernen?'}
                    </h2>
                    <p className="text-indigo-100 mb-8 max-w-lg text-sm sm:text-base opacity-90">
                        {isReverse
                            ? <span>Du hast <strong className="text-white">{dueCount} Karten</strong> andersherum zu lernen.</span>
                            : <span>Du hast <strong className="text-white">{dueCount} Karten</strong>, die jetzt fällig sind.</span>
                        }
                    </p>

                    {/* Button Row - Reversed in Mirror Mode */}
                    <div className={`flex flex-wrap gap-4 w-full sm:w-auto ${isReverse ? 'flex-row-reverse' : 'flex-row'}`}>
                        <Link to={`/learn/${deckId}?mode=oral${isReverse ? '&direction=reverse' : ''}`} className={`flex-1 min-w-[140px] bg-white text-indigo-900 py-3 px-6 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] transition-all ${dueCount === 0 ? 'opacity-50 grayscale' : ''}`}>
                            <Mic className="w-5 h-5" /> <span>Mündlich</span>
                        </Link>

                        <Link to={`/learn/${deckId}?mode=writing${isReverse ? '&direction=reverse' : ''}`} className={`flex-1 min-w-[140px] bg-emerald-500/20 border border-emerald-400/30 text-emerald-100 py-3 px-6 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-emerald-500/30 hover:scale-[1.02] transition-all ${dueCount === 0 ? 'opacity-50 grayscale' : ''}`}>
                            <PenTool className="w-5 h-5" /> <span>Schriftlich</span>
                        </Link>

                    </div>
                </div>

                {/* Timer Component */}
                <div className="hidden sm:block"> {/* Hide on very small screens if needed, or wrap */}
                    <NextReviewTimer deckId={deckId} isReverse={isReverse} dueCount={dueCount} />
                </div>
            </div>
        </div>
    );
};
