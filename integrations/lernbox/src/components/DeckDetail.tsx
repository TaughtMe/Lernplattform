import React from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Share2, ArrowRightLeft, ChevronDown, ChevronRight, Check, X, ClipboardList } from 'lucide-react';

import { useDeckManager } from '../hooks/useDeckManager';
import { NewCardForm } from './NewCardForm';
import { DeckImport } from './DeckImport';
import { DeckExport } from './DeckExport';
import { StudyBanner } from './deck/StudyBanner';
import { LeitnerGrid } from './deck/LeitnerGrid';
import { CardList } from './deck/CardList';
import { PageLayout } from './layout/PageLayout';

import { VocabTestConfig, type VocabTestConfiguration } from './vocab-test/VocabTestConfig';
import { VocabTestSession } from './vocab-test/VocabTestSession';

import { vocabularyService } from '../services/db.service';
// useDeckManager is already imported above at line 5

export const DeckDetail: React.FC = () => {
    const { deckId } = useParams<{ deckId: string }>();
    const { state, data, actions } = useDeckManager(deckId);

    // Trigger Lazy Penalty & Hard Regression Check on Load
    React.useEffect(() => {
        vocabularyService.checkCardDecay();
        if (deckId) {
            vocabularyService.checkAndProcessRegressions(parseInt(deckId));
        }
    }, [deckId]);

    const { activeCards, dueCount, stats, availableTags, exportData } = data;
    const { loading, deckName, isSelectionMode, selectedIds, showExport, isReverse, isFlipping, isNewCardOpen, isCardListOpen, selectedCards } = state;

    // Vocab Test State
    const [isVocabTestConfigOpen, setIsVocabTestConfigOpen] = React.useState(false);
    const [isVocabTestSessionActive, setIsVocabTestSessionActive] = React.useState(false);
    const [vocabTestConfig, setVocabTestConfig] = React.useState<VocabTestConfiguration | null>(null);

    const handleStartVocabTestConfig = () => {
        setIsVocabTestConfigOpen(true);
    };

    const handleStartVocabTestSession = (config: VocabTestConfiguration) => {
        setVocabTestConfig(config);
        setIsVocabTestConfigOpen(false);
        setIsVocabTestSessionActive(true);
    };

    const handleCancelVocabTest = () => {
        setIsVocabTestConfigOpen(false);
        setIsVocabTestSessionActive(false);
        setVocabTestConfig(null);
    };

    if (loading) return <div className="p-8 text-center text-white">Lade...</div>;

    if (isVocabTestSessionActive && vocabTestConfig && deckId) {
        return (
            <VocabTestSession
                deckId={parseInt(deckId)}
                config={vocabTestConfig}
                onClose={handleCancelVocabTest}
            />
        );
    }

    const Header = (
        <div className={`transition-all duration-500 border-b shadow-xl bg-background/95 backdrop-blur-sm border-border-default`}>
            <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
                <button onClick={actions.navigateHome} className="text-text-muted hover:text-text-main transition-colors"><ArrowLeft className="w-6 h-6" /></button>

                <h1 className="font-bold text-text-main text-lg truncate px-4 flex-1 text-center flex items-center justify-center gap-2">
                    {deckName}
                    {isReverse && <span className="text-[10px] bg-indigo-500 text-white px-1.5 py-0.5 rounded uppercase tracking-widest">Spiegelwelt</span>}
                </h1>

                <div className="flex gap-2">
                    {/* THE FLIP BUTTON */}
                    <button
                        onClick={actions.toggleReverseMode}
                        className={`p-2 rounded-full transition-all duration-500 ${isReverse ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'text-text-muted hover:bg-surface-hover'}`}
                        title="Modus wechseln"
                    >
                        <ArrowRightLeft className={`w-5 h-5 transition-transform duration-700 ${isFlipping ? 'rotate-180 scale-110' : ''}`} />
                    </button>
                </div>
            </div>

            {/* MEDAILLEN (Gespiegelt im Reverse Mode) */}
            <div className="max-w-4xl mx-auto px-4 pb-3">
                <div className={`grid grid-cols-3 gap-3 transition-all duration-500 ${isFlipping ? 'opacity-0 scale-95 blur-sm' : 'opacity-100 scale-100 blur-0'}`}>
                    {!isReverse ? (
                        <>
                            <MedalBox emoji="🥇" label="Gold" count={stats.gold} color="text-yellow-700" border="border-yellow-500/20" />
                            <MedalBox emoji="🥈" label="Silber" count={stats.silver} color="text-slate-600" border="border-border-default" />
                            <MedalBox emoji="🥉" label="Bronze" count={stats.bronze} color="text-orange-700" border="border-orange-500/20" />
                        </>
                    ) : (
                        <>
                            <MedalBox emoji="🥉" label="Bronze" count={stats.bronze} color="text-orange-700" border="border-orange-500/20" />
                            <MedalBox emoji="🥈" label="Silber" count={stats.silver} color="text-slate-600" border="border-border-default" />
                            <MedalBox emoji="🥇" label="Gold" count={stats.gold} color="text-yellow-700" border="border-yellow-500/20" />
                        </>
                    )}
                </div>
            </div>
        </div>
    );

    const Content = (
        <div className={`max-w-4xl mx-auto px-4 py-6 space-y-8 transition-all duration-500 ease-in-out ${isFlipping ? 'opacity-50 scale-95 blur-sm translate-y-4' : 'opacity-100 scale-100 blur-0 translate-y-0'}`}>
            <StudyBanner
                dueCount={dueCount}
                deckId={deckId || ''}
                isReverse={isReverse}
            />

            <LeitnerGrid cards={activeCards} deckId={deckId || ''} isReverse={isReverse} />

            {/* NEW: Vokabeltest Button */}
            <div className="bg-gradient-to-r from-indigo-500/10 to-indigo-600/10 rounded-2xl border border-indigo-500/20 overflow-hidden shadow-lg transition-all duration-300 hover:shadow-indigo-500/20 hover:border-indigo-500/40">
                <button
                    type="button"
                    className="w-full p-6 flex items-center justify-between cursor-pointer group text-left"
                    onClick={handleStartVocabTestConfig}
                >
                    <div className="flex items-center gap-4">
                        <div className="bg-indigo-500 p-3 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                            <ClipboardList className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="text-text-main font-bold text-lg">Vokabeltest starten</h3>
                            <p className="text-text-muted text-sm">Üben ohne Einfluss auf den Lernstand</p>
                        </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-indigo-400 group-hover:translate-x-1 transition-transform" />
                </button>
            </div>

            <hr className="border-border-default" />

            {/* Collapsible: Neue Karte */}
            <div className="bg-surface rounded-2xl border border-border-default overflow-hidden shadow-lg transition-all duration-300">
                <button
                    type="button"
                    className="w-full p-6 flex items-center justify-between cursor-pointer hover:bg-surface-hover transition-colors text-left"
                    onClick={actions.toggleNewCard}
                    aria-expanded={isNewCardOpen}
                >
                    <h3 className="text-text-main font-bold flex items-center gap-2 h-9">
                        <span className="bg-indigo-500 w-1 h-5 rounded-full block"></span>
                        Neue Karte
                    </h3>
                    {isNewCardOpen ? <ChevronDown className="w-5 h-5 text-indigo-400" /> : <ChevronRight className="w-5 h-5 text-text-muted" />}
                </button>

                {isNewCardOpen && (
                    <div className="px-6 pb-6 animate-in slide-in-from-top-2 duration-200">
                        <NewCardForm
                            onAdd={actions.addCard}
                            existingTags={availableTags}
                            frontLang={state.deck?.front_lang}
                            backLang={state.deck?.back_lang}
                        />
                        <div className="mt-6 pt-6 border-t border-border-default"><DeckImport /></div>
                    </div>
                )}
            </div>

            {/* Collapsible: Vokabelübersicht (CardList) */}
            <div className="bg-surface rounded-2xl border border-border-default overflow-hidden shadow-lg transition-all duration-300">
                <button
                    type="button"
                    className="w-full p-6 flex items-center justify-between cursor-pointer hover:bg-surface-hover transition-colors text-left"
                    onClick={actions.toggleCardList}
                    aria-expanded={isCardListOpen}
                >
                    <div className="flex-1 flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <span className={`w-1 h-5 rounded-full block ${isSelectionMode ? 'bg-emerald-500' : 'bg-indigo-500'}`}></span>
                            <h3 className="text-text-main font-bold">Vokabelübersicht</h3>
                        </div>

                        {/* Capacity Bar */}
                        {isSelectionMode && isCardListOpen && (
                            <div className="ml-3 mt-1 flex items-center gap-3 animate-in fade-in slide-in-from-left-2 md:mr-32">
                                <div className="flex-1 h-1.5 bg-background border border-border-default rounded-full overflow-hidden max-w-[200px]">
                                    <div className={`h-full transition-all duration-300 ${exportData.color}`} style={{ width: `${exportData.usage}%` }} />
                                </div>
                                <span className="text-[10px] text-text-muted font-mono">{selectedIds.length} cards</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {isSelectionMode ? (
                            <div className="flex bg-background border border-border-default rounded-lg p-1 mr-2" onClick={e => e.stopPropagation()}>
                                <button onClick={actions.selectAll} className="px-2 py-1 text-xs text-text-muted hover:text-text-main">Alle</button>
                                <div className="w-px bg-border-default mx-1"></div>
                                <button onClick={actions.finishShare} className="px-2 py-1 text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Fertig
                                </button>
                                <button onClick={actions.cancelShare} className="ml-1 p-1 text-text-muted hover:text-red-400 rounded">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={actions.startShare}
                                className="p-2 mr-2 text-indigo-400 hover:bg-indigo-500/10 rounded-full transition-colors"
                                title="Auswahl teilen"
                            >
                                <Share2 className="w-5 h-5" />
                            </button>
                        )}

                        {isCardListOpen ? <ChevronDown className="w-5 h-5 text-indigo-400" /> : <ChevronRight className="w-5 h-5 text-text-muted" />}
                    </div>
                </button>

                {isCardListOpen && (
                    <div className="px-6 pb-6 animate-in slide-in-from-top-2 duration-200">
                        <CardList
                            cards={activeCards}
                            onDelete={actions.deleteCard}
                            onEdit={actions.updateCard}
                            isReverse={isReverse}
                            selectionMode={isSelectionMode}
                            selectedIds={selectedIds}
                            onToggleSelect={actions.toggleSelect}
                        />
                    </div>
                )}
            </div>

            {showExport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={actions.closeExport}>
                    <div onClick={e => e.stopPropagation()} className="w-full max-w-md">
                        <DeckExport
                            cards={selectedCards}
                            onClose={actions.closeExport}
                            isOpen={true}
                            deckName={deckName}
                        />
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <PageLayout
            className="transition-colors duration-700 bg-background"
            header={Header}
            content={
                <>
                    {Content}
                    {isVocabTestConfigOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={handleCancelVocabTest}>
                            <div onClick={e => e.stopPropagation()} className="w-full max-w-lg">
                                <VocabTestConfig
                                    deckId={parseInt(deckId!)}
                                    onStart={handleStartVocabTestSession}
                                    onCancel={handleCancelVocabTest}
                                />
                            </div>
                        </div>
                    )}
                </>
            }
        />
    );
};

interface MedalBoxProps {
    emoji: string;
    label: string;
    count: number;
    color: string;
    border: string;
}

// UI Component (Pure View)
const MedalBox = ({ emoji, label, count, color, border }: MedalBoxProps) => (
    <div className={`bg-surface border ${border} rounded-lg p-1.5 flex flex-col items-center transition-all hover:scale-105 shadow-sm`}>
        <span className="text-lg">{emoji}</span>
        <span className={`text-[10px] font-bold ${color} tracking-wider uppercase`}>{label} {count}</span>
    </div>
);
