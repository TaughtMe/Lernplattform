import React, { useState, useMemo } from 'react';
import { Search, Pencil, Trash2, Calendar, CheckSquare, Square } from 'lucide-react';
import type { Card } from '../../types';

interface CardListProps {
    cards: Card[];
    onDelete: (id: number) => void;
    onEdit?: (card: Card) => Promise<void>;
    selectionMode?: boolean;
    selectedIds?: number[];
    onToggleSelect?: (id: number) => void;
    isReverse?: boolean;
}

export const CardList: React.FC<CardListProps> = ({ cards, onDelete, onEdit, selectionMode = false, selectedIds = [], onToggleSelect, isReverse = false }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTag, setFilterTag] = useState('All');
    const [sortMode, setSortMode] = useState<string>('newest');

    // Edit State
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editQuestion, setEditQuestion] = useState('');
    const [editAnswer, setEditAnswer] = useState('');
    const [editTag, setEditTag] = useState('');

    const availableTags = useMemo(() => Array.from(new Set(cards.map(c => c.tag).filter(Boolean))).sort(), [cards]);

    const filteredCards = useMemo(() => {
        let result = cards.filter(c =>
            c.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.answer.toLowerCase().includes(searchTerm.toLowerCase())
        );
        if (filterTag !== 'All') result = result.filter(c => c.tag === filterTag);

        return result.sort((a, b) => {
            switch (sortMode) {
                case 'newest': return (b.createdAt || 0) - (a.createdAt || 0);
                case 'oldest': return (a.createdAt || 0) - (b.createdAt || 0);
                case 'az': return a.question.localeCompare(b.question);
                case 'za': return b.question.localeCompare(a.question);
                default: return 0;
            }
        });
    }, [cards, searchTerm, filterTag, sortMode]);

    const startEditing = (card: Card) => {
        setEditingId(card.id!);
        setEditQuestion(card.question);
        setEditAnswer(card.answer);
        setEditTag(card.tag || '');
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditQuestion('');
        setEditAnswer('');
        setEditTag('');
    };

    const saveEdit = async (card: Card) => {
        if (!onEdit) return;
        await onEdit({ ...card, question: editQuestion, answer: editAnswer, tag: editTag });
        setEditingId(null);
    };

    const handleCardClick = (id: number) => {
        if (selectionMode && onToggleSelect) {
            onToggleSelect(id);
        }
    };

    return (
        <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1"><Search className="absolute left-3 top-2.5 w-4 h-4 text-text-muted" /><input type="text" placeholder="Suche..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-background border border-border-default text-text-main placeholder-text-muted pl-9 py-2 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none" /></div>
                <div className="flex gap-2">
                    <select value={filterTag} onChange={e => setFilterTag(e.target.value)} className="bg-background border border-border-default text-text-main px-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"><option value="All">Alle Tags</option>{availableTags.map(t => <option key={t} value={t}>{t}</option>)}</select>
                    <select value={sortMode} onChange={e => setSortMode(e.target.value)} className="bg-background border border-border-default text-text-main px-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none">
                        <option value="newest">Neueste</option>
                        <option value="oldest">Älteste</option>
                        <option value="az">A-Z</option>
                        <option value="za">Z-A</option>
                    </select>
                </div>
            </div>

            {/* COMPACT LIST VIEW */}
            <div className="space-y-2">
                {filteredCards.map(card => {
                    const isEditing = editingId === card.id;
                    const isSelected = selectedIds.includes(card.id!);
                    const displayStreak = isReverse ? (card.reverseWritingStreak || 0) : (card.writingStreak || 0);
                    const displayBox = isReverse ? (card.reverseBox || 1) : card.level;
                    const displayNextReview = isReverse ? (card.reverseNextReview || Date.now()) : card.nextReview;

                    return (
                        <div
                            key={card.id}
                            onClick={selectionMode ? () => handleCardClick(card.id!) : undefined}
                            className={`bg-surface hover:bg-surface-hover active:scale-[0.99] border ${isSelected ? 'border-indigo-500 bg-indigo-500/10' : (isEditing ? 'border-indigo-500' : 'border-border-default')} rounded-xl p-4 flex justify-between items-center transition-all group ${selectionMode ? 'cursor-pointer' : ''}`}
                        >
                            {/* Selection Checkbox */}
                            {selectionMode && (
                                <div className="mr-4 text-indigo-400">
                                    {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 opacity-50" />}
                                </div>
                            )}

                            <div className="flex-1">
                                {isEditing ? (
                                    <div className="space-y-2 mr-4">
                                        <div className="flex gap-2">
                                            <input
                                                autoFocus
                                                value={editQuestion}
                                                onChange={e => setEditQuestion(e.target.value)}
                                                onClick={e => e.stopPropagation()}
                                                maxLength={400}
                                                className="bg-background border border-border-default rounded px-2 py-1 text-text-main font-bold w-full focus:ring-2 focus:ring-primary outline-none"
                                                placeholder="Frage"
                                            />
                                            <input
                                                value={editTag}
                                                onChange={e => setEditTag(e.target.value)}
                                                onClick={e => e.stopPropagation()}
                                                maxLength={20}
                                                className="bg-background border border-border-default rounded px-2 py-1 text-text-muted text-sm w-24 focus:ring-2 focus:ring-primary outline-none"
                                                placeholder="Tag"
                                            />
                                        </div>
                                        <input
                                            value={editAnswer}
                                            onChange={e => setEditAnswer(e.target.value)}
                                            onClick={e => e.stopPropagation()}
                                            maxLength={400}
                                            className="bg-background border border-border-default rounded px-2 py-1 text-text-main w-full focus:ring-2 focus:ring-primary outline-none"
                                            placeholder="Antwort"
                                        />
                                        <div className="flex gap-2 pt-1">
                                            <button onClick={(e) => { e.stopPropagation(); saveEdit(card); }} className="px-3 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-500 font-bold">Speichern</button>
                                            <button onClick={(e) => { e.stopPropagation(); cancelEditing(); }} className="px-3 py-1 bg-surface-hover text-text-muted border border-border-default text-xs rounded hover:brightness-95">Abbrechen</button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-text-main text-lg">{card.question}</span>
                                            {card.tag && <span className="bg-indigo-500/20 text-indigo-300 text-[10px] px-2 py-0.5 rounded-full border border-indigo-500/30">{card.tag}</span>}
                                        </div>
                                        <div className="text-text-muted">{card.answer}</div>
                                        <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
                                            <span className="flex items-center gap-1 bg-surface-hover px-2 py-0.5 rounded text-text-muted">Box {displayBox}</span>
                                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(displayNextReview).toLocaleDateString()}</span>
                                            {/* Streak Medal */}
                                            {displayStreak > 0 && <span>{displayStreak >= 3 ? '🥇' : (displayStreak === 2 ? '🥈' : '🥉')}</span>}
                                        </div>
                                    </>
                                )}
                            </div>

                            {!isEditing && !selectionMode && (
                                <div className="flex gap-2">
                                    <button onClick={(e) => { e.stopPropagation(); startEditing(card); }} className="p-2 text-text-muted hover:text-text-main hover:bg-surface-hover active:bg-surface-active active:scale-95 rounded-lg transition-all" title="Bearbeiten" aria-label="Bearbeiten">
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); onDelete(card.id!); }} className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 active:bg-red-500/20 active:scale-95 rounded-lg transition-all" title="Löschen" aria-label="Löschen">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
