import React from 'react';
import QRCode from 'react-qr-code';
import type { Card } from '../types';
import { X, AlertTriangle, Copy, Check, Share2, Download } from 'lucide-react';

import { SAFE_QR_LIMIT, calculateExportSize, getCapacityColor } from '../utils/exportUtils';

interface DeckExportProps {
    // Modified to be compatible with DeckDetail parent
    cards: Card[];
    onClose: () => void;
    deckName?: string;
    isOpen?: boolean; // Optional/Ignored as parent handles rendering
}

export const DeckExport: React.FC<DeckExportProps> = ({ cards, onClose, deckName = 'Deck' }) => {
    const [copied, setCopied] = React.useState(false);

    // Prepare data for export: [front, back, tag]
    // We only export what is visible (the filtered cards)
    // const exportData = cards.map(c => [c.question, c.answer, c.tag || '']);
    // const jsonString = JSON.stringify(exportData);
    const charCount = calculateExportSize(cards);

    // We still need the JSON string for the value
    const exportData = cards.map(c => [c.question, c.answer, c.tag || '']);
    const jsonString = JSON.stringify(exportData);

    // Limits
    const isOverLimit = charCount > SAFE_QR_LIMIT;
    const usagePercent = Math.min(100, (charCount / SAFE_QR_LIMIT) * 100);

    // Color logic
    const progressColor = getCapacityColor(charCount);

    const handleCopy = () => {
        navigator.clipboard.writeText(jsonString);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${deckName.replace(/\s+/g, '_')}_export.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="bg-surface rounded-2xl shadow-xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="p-6 border-b border-border-default flex justify-between items-center sticky top-0 bg-surface z-10">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Share2 className="w-5 h-5 text-indigo-600" />
                        Deck Export
                    </h2>
                    <p className="text-sm text-gray-500">
                        {cards.length} Karten ausgewählt
                    </p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-surface-hover rounded-full transition-colors">
                    <X className="w-5 h-5 text-gray-500" />
                </button>
            </div>

            <div className="p-6 space-y-6">
                {/* Capacity Meter */}
                <div className="space-y-2">
                    <div className="flex justify-between text-sm font-medium">
                        <span className={isOverLimit ? 'text-red-500' : 'text-text-muted'}>
                            QR Kapazität: {charCount} / {SAFE_QR_LIMIT}
                        </span>
                        <span className="text-gray-400">{Math.round(usagePercent)}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-500 ${progressColor}`}
                            style={{ width: `${usagePercent}%` }}
                        />
                    </div>
                </div>

                {/* QR Code Area */}
                <div className="flex justify-center">
                    {isOverLimit ? (
                        <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 border-dashed rounded-xl p-8 text-center max-w-xs w-full aspect-square flex flex-col items-center justify-center gap-3">
                            <AlertTriangle className="w-12 h-12 text-amber-500" />
                            <div className="font-bold text-amber-700 dark:text-amber-500">Zu viele Daten für QR</div>
                            <p className="text-xs text-amber-600/80 dark:text-amber-400/80">
                                Bitte nutze Filter (Tags/Suche) um die Anzahl der Karten zu reduzieren oder nutze den Text-Export.
                            </p>
                        </div>
                    ) : (
                        <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100">
                            <QRCode
                                value={jsonString}
                                size={256}
                                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                viewBox={`0 0 256 256`}
                            />
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="space-y-3">
                    <div className="flex gap-2">
                        <button
                            onClick={handleCopy}
                            className="flex-1 flex items-center justify-center gap-2 bg-surface-hover hover:brightness-90 text-text-main py-3 rounded-lg font-medium transition-colors"
                        >
                            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            {copied ? 'Kopiert!' : 'Code kopieren'}
                        </button>
                        <button
                            onClick={handleDownload}
                            className="flex items-center justify-center gap-2 px-4 bg-surface-hover hover:brightness-90 text-text-main rounded-lg transition-colors"
                            title="Als Datei herunterladen"
                        >
                            <Download className="w-5 h-5" />
                        </button>
                    </div>

                    <p className="text-xs text-gray-400 text-center">
                        {isOverLimit
                            ? "Kopiere den Text-Code, um das Deck manuell zu importieren."
                            : "Scanne diesen Code mit der LernBox App um das Deck zu importieren."}
                    </p>
                </div>
            </div>
        </div>
    );
};
