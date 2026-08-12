import React, { useState, useEffect } from 'react';
import { Play, ClipboardList, Clock, Hash } from 'lucide-react';
import { vocabularyService } from '../../services/db.service';

export interface VocabTestConfiguration {
    mode: 'time' | 'count';
    value: number;
    direction: 'forward' | 'reverse' | 'mixed';
    selectedTags: string[];
}

interface VocabTestConfigProps {
    deckId: number;
    onStart: (config: VocabTestConfiguration) => void;
    onCancel: () => void;
}

// ... imports remain same ...

export const VocabTestConfig: React.FC<VocabTestConfigProps> = ({ deckId, onStart, onCancel }) => {
    const [mode, setMode] = useState<'time' | 'count'>('count');
    const [value, setValue] = useState<number>(20); // Default 20 cards or minutes? 20 cards, maybe 5 mins
    const [direction, setDirection] = useState<'forward' | 'reverse' | 'mixed'>('forward');
    const [availableTags, setAvailableTags] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]); // Empty = All 
    const [loadingTags, setLoadingTags] = useState(true);

    useEffect(() => {
        // Default value logic
        if (mode === 'time') setValue(5); // 5 minutes default
        else setValue(20); // 20 cards default
    }, [mode]);

    useEffect(() => {
        const loadTags = async () => {
            const cards = await vocabularyService.getCards(deckId);
            const tags = new Set<string>();
            cards.forEach(card => {
                if (card.tag && card.tag.trim()) {
                    tags.add(card.tag.trim());
                }
            });
            setAvailableTags(Array.from(tags).sort());
            setLoadingTags(false);
        };
        loadTags();
    }, [deckId]);

    const handleTagToggle = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag)
                ? prev.filter(t => t !== tag)
                : [...prev, tag]
        );
    };

    const toggleAllTags = () => {
        if (selectedTags.length === availableTags.length) {
            setSelectedTags([]);
        } else {
            setSelectedTags([...availableTags]);
        }
    };

    const isAllTagsSelected = selectedTags.length === 0 || selectedTags.length === availableTags.length;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onStart({
            mode,
            value,
            direction,
            // If selectedTags is empty, it usually implies "All" in UI logic if we display "All" as default state.
            // But here we might want to be explicit.
            // If we want filtering logic to be strict: empty list = no filtering (all).
            selectedTags: selectedTags.length > 0 ? selectedTags : []
        });
    };

    return (
        <div className="bg-surface p-6 rounded-2xl border border-border-default max-w-lg mx-auto shadow-xl">
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-indigo-100 dark:bg-indigo-500/20 p-2.5 rounded-xl">
                    <ClipboardList className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h2 className="text-xl font-bold text-text-main">Vokabeltest Konfiguration</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Mode Selection */}
                <div className="bg-background p-1 rounded-xl flex border border-border-default">
                    <button
                        type="button"
                        onClick={() => setMode('count')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${mode === 'count' ? 'bg-indigo-600 text-white shadow-md' : 'text-text-muted hover:text-text-main hover:bg-surface'}`}
                    >
                        <Hash className="w-4 h-4" />
                        Nach Anzahl
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('time')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${mode === 'time' ? 'bg-indigo-600 text-white shadow-md' : 'text-text-muted hover:text-text-main hover:bg-surface'}`}
                    >
                        <Clock className="w-4 h-4" />
                        Nach Zeit
                    </button>
                </div>

                {/* Value Input */}
                <div>
                    <label className="block text-text-muted text-sm mb-2 ml-1">
                        {mode === 'count' ? 'Anzahl der Karten' : 'Dauer in Minuten'}
                    </label>
                    <input
                        type="number"
                        min="1"
                        max={mode === 'count' ? 200 : 60}
                        value={value}
                        onChange={(e) => setValue(Number(e.target.value))}
                        className="w-full bg-background border border-border-default text-text-main px-4 py-3 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-center text-xl font-mono placeholder:text-text-muted"
                    />
                </div>

                {/* Direction */}
                <div>
                    <label className="block text-text-muted text-sm mb-2 ml-1">Abfrage-Richtung</label>
                    <div className="relative">
                        <select
                            value={direction}
                            onChange={(e) => setDirection(e.target.value as any)}
                            className="w-full bg-background border border-border-default text-text-main px-4 py-3 rounded-xl appearance-none focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            <option value="forward">Vorderseite → Rückseite</option>
                            <option value="reverse">Rückseite → Vorderseite</option>
                            <option value="mixed">Gemischt (Zufällig)</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
                            ▼
                        </div>
                    </div>
                </div>

                {/* Tag Filter */}
                <div>
                    <div className="flex items-center justify-between mb-2 ml-1">
                        <label className="block text-text-muted text-sm">Themen / Tags</label>
                        <button
                            type="button"
                            onClick={toggleAllTags}
                            className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300"
                        >
                            {isAllTagsSelected ? 'Alle abwählen' : 'Alle auswählen'}
                        </button>
                    </div>

                    <div className="bg-background border border-border-default rounded-xl p-3 max-h-40 overflow-y-auto custom-scrollbar">
                        {loadingTags ? (
                            <div className="text-center text-text-muted py-4">Lade Tags...</div>
                        ) : availableTags.length === 0 ? (
                            <div className="text-center text-text-muted py-4 opacity-70">Keine Tags in diesem Deck gefunden.</div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSelectedTags([])}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${selectedTags.length === 0
                                        ? 'bg-indigo-100 dark:bg-indigo-500/20 border-indigo-200 dark:border-indigo-500/50 text-indigo-700 dark:text-indigo-300'
                                        : 'bg-surface border-border-default text-text-muted hover:bg-surface-hover hover:text-text-main'
                                        }`}
                                >
                                    Alle
                                </button>
                                {availableTags.map(tag => (
                                    <button
                                        key={tag}
                                        type="button"
                                        onClick={() => handleTagToggle(tag)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${selectedTags.includes(tag)
                                            ? 'bg-indigo-100 dark:bg-indigo-500/20 border-indigo-200 dark:border-indigo-500/50 text-indigo-700 dark:text-indigo-300'
                                            : 'bg-surface border-border-default text-text-muted hover:bg-surface-hover hover:text-text-main'
                                            }`}
                                    >
                                        {tag}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-border-default">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 px-4 py-3 rounded-xl text-text-muted hover:bg-surface-hover hover:text-text-main transition-colors font-medium border border-transparent hover:border-border-default"
                    >
                        Abbrechen
                    </button>
                    <button
                        type="submit"
                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/30 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        <Play className="w-4 h-4 fill-current" />
                        Test Starten
                    </button>
                </div>

            </form>
        </div>
    );
};
