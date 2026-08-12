import React from 'react';
import { usePWAUpdate } from '../hooks/usePWAUpdate';
import { Download } from 'lucide-react';

export const UpdateBanner: React.FC = () => {
    const { needRefresh, handleSafeUpdate } = usePWAUpdate();

    if (!needRefresh) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom-5 duration-300">
            <div className="max-w-md mx-auto bg-gray-900 border border-indigo-500/30 text-white rounded-xl shadow-2xl p-4 flex items-center justify-between gap-4 backdrop-blur-md bg-opacity-95">
                <div className="flex-1">
                    <h3 className="font-bold text-sm">Update verfügbar</h3>
                    <p className="text-xs text-gray-300 mt-0.5">Neue Funktionen & Verbesserungen.</p>
                </div>
                <button
                    onClick={handleSafeUpdate}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-lg transition-all font-medium text-xs shadow-lg shadow-indigo-600/20"
                >
                    <Download className="w-3.5 h-3.5" />
                    <span className="whitespace-nowrap">Sichern & Update</span>
                </button>
            </div>
        </div>
    );
};
