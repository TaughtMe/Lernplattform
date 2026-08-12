import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { useDeckListManager } from '../hooks/useDeckListManager';
import type { Deck } from '../types';
import { useDeckStats } from '../hooks/useDeckStats';
import { PageLayout } from './layout/PageLayout';
import { LANGUAGES } from '../constants/languages';

export const DeckList: React.FC = () => {
    const { decks, isLoading, newDeckName, setNewDeckName, frontLang, setFrontLang, backLang, setBackLang, addDeck, deleteDeck } = useDeckListManager();

    const [deckToDelete, setDeckToDelete] = React.useState<Deck | null>(null);

    const handleDeleteClick = (deck: Deck) => {
        setDeckToDelete(deck);
    };

    const confirmDelete = () => {
        if (deckToDelete && deckToDelete.id) {
            deleteDeck(deckToDelete.id);
            setDeckToDelete(null);
        }
    };

    const cancelDelete = () => {
        setDeckToDelete(null);
    };

    if (isLoading) return <div className="text-center py-10">Lade Decks...</div>;

    const Content = (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <form onSubmit={addDeck} className="flex flex-col gap-3 w-full bg-surface shadow-sm p-4 rounded-xl border border-border-default">
                    <div className="flex gap-2">
                        <input
                            aria-label="Name der neuen Lernbox"
                            type="text"
                            value={newDeckName}
                            onChange={(e) => setNewDeckName(e.target.value)}
                            placeholder="Neues Deck erstellen..."
                            maxLength={50}
                            className="flex-1 p-3 rounded-lg border border-border-default bg-background text-text-main focus:ring-2 focus:ring-primary outline-none placeholder-text-muted"
                        />
                        <button
                            type="submit"
                            className="bg-primary text-white px-6 py-3 rounded-lg font-medium hover:brightness-110 active:brightness-90 transition-colors shrink-0"
                        >
                            Erstellen
                        </button>
                    </div>

                    <div className="flex gap-3 text-sm">
                        <div className="flex-1 flex flex-col gap-1">
                            <label htmlFor="new-deck-front-language" className="text-text-muted text-xs uppercase font-bold tracking-wider">Vorderseite</label>
                            <select
                                id="new-deck-front-language"
                                value={frontLang}
                                onChange={(e) => setFrontLang(e.target.value)}
                                className="w-full p-2 rounded-lg border border-border-default bg-background text-text-main focus:ring-2 focus:ring-primary outline-none"
                            >
                                {LANGUAGES.map(l => (
                                    <option key={`front-${l.code}`} value={l.code}>{l.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-end pb-2 text-text-muted">
                            👉
                        </div>

                        <div className="flex-1 flex flex-col gap-1">
                            <label htmlFor="new-deck-back-language" className="text-text-muted text-xs uppercase font-bold tracking-wider">Rückseite</label>
                            <select
                                id="new-deck-back-language"
                                value={backLang}
                                onChange={(e) => setBackLang(e.target.value)}
                                className="w-full p-2 rounded-lg border border-border-default bg-background text-text-main focus:ring-2 focus:ring-primary outline-none"
                            >
                                {LANGUAGES.map(l => (
                                    <option key={`back-${l.code}`} value={l.code}>{l.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </form>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                {decks.map(deck => (
                    <DeckCard key={deck.id} deck={deck} onDelete={() => handleDeleteClick(deck)} />
                ))}
            </div>

            {decks.length === 0 && (
                <div className="text-center py-12 text-text-muted">
                    Noch keine Decks. Erstelle jetzt dein erstes Deck!
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deckToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={cancelDelete}>
                    <div
                        className="bg-surface border border-border-default rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <h3 className="text-xl font-bold text-text-main">Deck löschen?</h3>
                        <p className="text-text-muted">
                            Möchtest du die Box <span className="font-bold text-text-main">"{deckToDelete.name}"</span> wirklich löschen?
                            <br /><br />
                            <span className="text-red-400">Alle darin enthaltenen Karten werden unwiderruflich gelöscht.</span>
                        </p>
                        <div className="flex gap-3 justify-end pt-2">
                            <button
                                onClick={cancelDelete}
                                className="px-4 py-2 rounded-lg text-text-muted hover:bg-surface-hover transition-colors"
                            >
                                Abbrechen
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-colors font-medium flex items-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" /> Löschen
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    return <PageLayout header={null} content={Content} footer={null} />;
};

const DeckCard: React.FC<{ deck: Deck, onDelete: () => void }> = ({ deck, onDelete }) => {
    const { total, due, levels } = useDeckStats(deck.id!);
    const navigate = useNavigate();

    return (
        <div
            onClick={() => navigate(`/deck/${deck.id}`)}
            // Card container adapted for Light Mode
            className="bg-surface p-4 rounded-xl shadow-sm border border-border-default flex flex-col justify-between min-h-[160px] cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg hover:border-primary/50 group"
        >
            <div>
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg truncate flex-1 mr-2 text-text-main">{deck.name}</h3>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onDelete();
                        }}
                        className="text-text-muted hover:text-red-500 p-1"
                        aria-label="Deck löschen"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex gap-4 text-sm mb-4">
                    <div className="flex items-center gap-1 font-medium text-red-400">
                        <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
                        {due} Fällig
                    </div>
                    <div className="flex items-center gap-1 text-text-muted">
                        <span className="font-medium text-text-main">{total}</span> Gesamt
                    </div>
                </div>

                {/* Level Progress Bar */}
                <div className="flex h-2 rounded-full overflow-hidden bg-surface-hover w-full">
                    <div style={{ width: `${(levels[1] / total) * 100}%` }} className="bg-red-400" title={`Level 1: ${levels[1]}`} />
                    <div style={{ width: `${(levels[2] / total) * 100}%` }} className="bg-orange-400" title={`Level 2: ${levels[2]}`} />
                    <div style={{ width: `${(levels[3] / total) * 100}%` }} className="bg-yellow-400" title={`Level 3: ${levels[3]}`} />
                    <div style={{ width: `${(levels[4] / total) * 100}%` }} className="bg-green-400" title={`Level 4: ${levels[4]}`} />
                    <div style={{ width: `${(levels[5] / total) * 100}%` }} className="bg-emerald-600" title={`Level 5: ${levels[5]}`} />
                </div>
            </div>
        </div>
    );
};
