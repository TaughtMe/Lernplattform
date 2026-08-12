import React from 'react';
import { Check, X } from 'lucide-react';

interface ActionButtonsProps {
    onCorrect: () => void;
    onWrong: () => void;
    className?: string;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({ onCorrect, onWrong, className = '' }) => {
    return (
        <div className={`flex justify-center gap-6 ${className}`}>
            <button
                onClick={(e) => { e.stopPropagation(); onWrong(); }}
                className="w-16 h-16 flex items-center justify-center border-2 border-red-500/50 bg-transparent hover:bg-red-500/10 text-red-500 rounded-2xl transition-colors active:scale-95 shadow-sm"
                aria-label="Wiederholen"
            >
                <X className="w-8 h-8" />
            </button>
            <button
                onClick={(e) => { e.stopPropagation(); onCorrect(); }}
                className="w-16 h-16 flex items-center justify-center border-2 border-green-500/50 bg-transparent hover:bg-green-500/10 text-green-500 rounded-2xl transition-colors active:scale-95 shadow-sm"
                aria-label="Gewusst"
            >
                <Check className="w-8 h-8" />
            </button>
        </div>
    );
};
