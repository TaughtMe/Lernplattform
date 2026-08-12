import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
            <p className="animate-pulse text-sm font-medium">Lade Inhalte...</p>
        </div>
    );
};
