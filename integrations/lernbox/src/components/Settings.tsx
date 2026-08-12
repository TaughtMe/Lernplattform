import React, { useState } from 'react';
import { ArrowLeft, CheckCircle, RefreshCw, Trash2, Download, Upload, ChevronDown, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePWAUpdate } from '../hooks/usePWAUpdate';
import { useSettings } from '../context/SettingsContext';
import { useDeckListManager } from '../hooks/useDeckListManager';
import { PageLayout } from './layout/PageLayout';
import { Toggle } from './ui/Toggle';
import { db } from '../services/db.service';

export const Settings: React.FC = () => {
    const { checkForUpdates, needRefresh, handleSafeUpdate } = usePWAUpdate();
    const { hapticsEnabled, setHapticsEnabled, triggerHaptic } = useSettings();
    const { exportBackup, importBackup } = useDeckListManager();
    const APP_VERSION = "1.2.3-a";
    const [checking, setChecking] = useState(false);

    // Collapsible States
    const [isAppStatusOpen, setIsAppStatusOpen] = useState(false);
    const [isGeneralOpen, setIsGeneralOpen] = useState(false);
    const [isBackupOpen, setIsBackupOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isDataOpen, setIsDataOpen] = useState(false);

    const handleCheckUpdate = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setChecking(true);
        // Add a small delay for UX so the user sees the spinner
        await new Promise(resolve => setTimeout(resolve, 800));
        await checkForUpdates();
        setChecking(false);
    };

    const handleHapticsChange = (enabled: boolean) => {
        setHapticsEnabled(enabled);
        if (enabled) {
            triggerHaptic('success');
        }
    };

    const handleResetHistory = async () => {
        if (window.confirm("Bist du sicher? Alle Lernfortschritte werden auf 'Ungeübt' zurückgesetzt. Dieser Vorgang kann nicht rückgängig gemacht werden.")) {
            try {
                // Reset all cards to level 0 and reset nextReview
                // We leave the deck structure intact
                await db.cards.toCollection().modify({
                    level: 1, // Reset to Level 1 (Leitner Start)
                    nextReview: Date.now() // Reset due date to now
                });
                triggerHaptic('success');
                alert("Lern-Verlauf wurde zurückgesetzt.");
            } catch (error) {
                console.error("Failed to reset history", error);
                triggerHaptic('error');
                alert("Fehler beim Zurücksetzen.");
            }
        }
    };

    const Header = (
        <div className="bg-background border-b border-border-default shadow-sm">
            <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
                <Link to="/" className="p-2 -ml-2 text-text-muted hover:text-text-main hover:bg-surface-hover rounded-full transition-all">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <h1 className="text-2xl font-bold text-text-main">
                    Einstellungen
                </h1>
            </div>
        </div>
    );

    const Content = (
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
            {/* App Status Section */}
            <div className="bg-surface rounded-2xl border border-border-default overflow-hidden shadow-lg transition-all duration-300">
                <div
                    className="p-6 flex items-center justify-between cursor-pointer hover:bg-surface-hover transition-colors"
                    onClick={() => setIsAppStatusOpen(!isAppStatusOpen)}
                >
                    <h2 className="text-text-main font-bold flex items-center gap-2 h-9 text-lg">
                        <span className="bg-primary w-1 h-5 rounded-full block"></span>
                        App Status
                        <span className="font-mono text-xs text-text-muted font-normal border border-border-default px-2 py-0.5 rounded-md ml-2">v{APP_VERSION}</span>
                    </h2>
                    {isAppStatusOpen ? <ChevronDown className="w-5 h-5 text-indigo-400" /> : <ChevronRight className="w-5 h-5 text-text-muted" />}
                </div>

                {isAppStatusOpen && (
                    <div className="px-6 pb-6 animate-in slide-in-from-top-2 duration-200">
                        <div className="bg-background/50 rounded-xl border border-border-default p-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {!needRefresh && !checking ? (
                                    <div className="text-green-500 flex items-center gap-2">
                                        <CheckCircle className="w-5 h-5" />
                                        <span className="font-medium">Alles aktuell</span>
                                    </div>
                                ) : (
                                    <span className="text-text-main font-medium">Updates verfügbar</span>
                                )}
                            </div>

                            {needRefresh ? (
                                <button
                                    onClick={handleSafeUpdate}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary hover:opacity-90 text-white rounded-lg transition-colors font-medium text-sm"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Sichern & Aktualisieren
                                </button>
                            ) : (
                                <button
                                    onClick={handleCheckUpdate}
                                    disabled={checking}
                                    className="flex items-center gap-2 px-4 py-2 bg-surface-hover hover:opacity-80 disabled:opacity-50 text-text-muted rounded-lg transition-colors font-medium text-sm"
                                >
                                    {checking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                    {checking ? 'Suche...' : 'Prüfen'}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Preferences Section */}
            <div className="bg-surface rounded-2xl border border-border-default overflow-hidden shadow-lg transition-all duration-300">
                <div
                    className="p-6 flex items-center justify-between cursor-pointer hover:bg-surface-hover transition-colors"
                    onClick={() => setIsGeneralOpen(!isGeneralOpen)}
                >
                    <h2 className="text-text-main font-bold flex items-center gap-2 h-9 text-lg">
                        <span className="bg-purple-500 w-1 h-5 rounded-full block"></span>
                        Allgemein
                    </h2>
                    {isGeneralOpen ? <ChevronDown className="w-5 h-5 text-indigo-400" /> : <ChevronRight className="w-5 h-5 text-text-muted" />}
                </div>

                {isGeneralOpen && (
                    <div className="px-6 pb-6 animate-in slide-in-from-top-2 duration-200">
                        <div className="bg-background/50 rounded-xl border border-border-default p-4 flex items-center justify-between">
                            <div>
                                <p className="font-medium text-text-main">Haptisches Feedback</p>
                                <p className="text-sm text-text-muted">Vibration bei Interaktionen</p>
                            </div>
                            <Toggle checked={hapticsEnabled} onChange={handleHapticsChange} />
                        </div>
                    </div>
                )}
            </div>

            {/* Backup Section */}
            <div className="bg-surface rounded-2xl border border-border-default overflow-hidden shadow-lg transition-all duration-300">
                <div
                    className="p-6 flex items-center justify-between cursor-pointer hover:bg-surface-hover transition-colors"
                    onClick={() => setIsBackupOpen(!isBackupOpen)}
                >
                    <h2 className="text-text-main font-bold flex items-center gap-2 h-9 text-lg">
                        <span className="bg-purple-500 w-1 h-5 rounded-full block"></span>
                        Backup
                    </h2>
                    {isBackupOpen ? <ChevronDown className="w-5 h-5 text-indigo-400" /> : <ChevronRight className="w-5 h-5 text-text-muted" />}
                </div>

                {isBackupOpen && (
                    <div className="px-6 pb-6 animate-in slide-in-from-top-2 duration-200">
                        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700/50 flex flex-col sm:flex-row gap-4">
                            <label className="flex items-center justify-center gap-2 text-base font-medium bg-gray-700 text-white hover:bg-gray-600 px-4 py-3 rounded-xl transition-all cursor-pointer w-full active:scale-[0.98] border border-gray-600" title="Backup importieren">
                                <Upload className="w-5 h-5" />
                                <span>Backup importieren</span>
                                <input type="file" accept=".json" onChange={importBackup} className="hidden" />
                            </label>
                            <button
                                onClick={exportBackup}
                                className="flex items-center justify-center gap-2 text-base font-medium bg-transparent text-white border border-gray-600 hover:bg-gray-700 px-4 py-3 rounded-xl transition-all w-full active:scale-[0.98]"
                                title="Backup exportieren"
                            >
                                <Download className="w-5 h-5" />
                                <span>Backup exportieren</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Version History Section */}
            <div className="bg-surface rounded-2xl border border-border-default overflow-hidden shadow-lg transition-all duration-300">
                <div
                    className="p-6 flex items-center justify-between cursor-pointer hover:bg-surface-hover transition-colors"
                    onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                >
                    <h2 className="text-text-main font-bold flex items-center gap-2 h-9 text-lg">
                        <span className="bg-blue-500 w-1 h-5 rounded-full block"></span>
                        Versionsverlauf
                    </h2>
                    {isHistoryOpen ? <ChevronDown className="w-5 h-5 text-indigo-400" /> : <ChevronRight className="w-5 h-5 text-text-muted" />}
                </div>

                {isHistoryOpen && (
                    <div className="px-6 pb-6 animate-in slide-in-from-top-2 duration-200">
                        <div className="space-y-4">
                            {/* v1.2.2-b */}
                            <div className="bg-background/50 rounded-xl border border-border-default p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="font-bold text-text-main">v1.2.3-a</span>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-medium">Test Build</span>
                                </div>
                                <ul className="space-y-2 text-sm text-text-muted">
                                    <li className="flex gap-2">
                                        <span className="text-primary">•</span>
                                        <span>v1.2.3-a: Fix für Auto-Update (Zwang zu manueller Bestätigung).</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-primary">•</span>
                                        <span>v1.2.2-b: Test des Sicherheits-Updates (Backup vor Neustart).</span>
                                    </li>
                                </ul>
                            </div>
                            {/* v1.2.1-b */}
                            <div className="bg-background/50 rounded-xl border border-border-default p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="font-bold text-text-main">v1.2.1-b</span>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-medium">Test Build</span>
                                </div>
                                <ul className="space-y-2 text-sm text-text-muted">
                                    <li className="flex gap-2">
                                        <span className="text-primary">•</span>
                                        <span>v1.2.1-b: Update-Funktionstest erfolgreich.</span>
                                    </li>
                                </ul>
                            </div>

                            {/* v1.2.0 */}
                            <div className="bg-background/50 rounded-xl border border-border-default p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="font-bold text-text-main">v1.2.0</span>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">Mobile Experience Update</span>
                                </div>
                                <ul className="space-y-2 text-sm text-text-muted">
                                    <li className="flex gap-2">
                                        <span className="text-primary">•</span>
                                        <span>Neues Karten-Design: Optimiertes Format für Smartphones.</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-primary">•</span>
                                        <span>Haptisches Feedback: Vibration beim Lernen (deaktivierbar).</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-primary">•</span>
                                        <span>Bessere Lesbarkeit: Texte passen sich nun der Kartengröße an.</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-primary">•</span>
                                        <span>Backup-Verwaltung: Import/Export übersichtlich in den Einstellungen.</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Data Management Section */}
            <div className="bg-surface rounded-2xl border border-border-default overflow-hidden shadow-lg transition-all duration-300">
                <div
                    className="p-6 flex items-center justify-between cursor-pointer hover:bg-surface-hover transition-colors"
                    onClick={() => setIsDataOpen(!isDataOpen)}
                >
                    <h2 className="text-text-main font-bold flex items-center gap-2 h-9 text-lg">
                        <span className="bg-red-500 w-1 h-5 rounded-full block"></span>
                        Daten & Speicher
                    </h2>
                    {isDataOpen ? <ChevronDown className="w-5 h-5 text-indigo-400" /> : <ChevronRight className="w-5 h-5 text-text-muted" />}
                </div>

                {isDataOpen && (
                    <div className="px-6 pb-6 animate-in slide-in-from-top-2 duration-200">
                        <div className="bg-background/50 rounded-xl border border-border-default p-4 flex items-center justify-between">
                            <p className="text-text-muted text-sm font-medium flex-1 mr-4">
                                Zurücksetzen aller Vokabeln und Lernstand dieser Box auf Box 1
                            </p>
                            <button
                                onClick={handleResetHistory}
                                className="flex items-center gap-2 px-4 py-2 bg-surface-hover hover:opacity-80 text-red-600 rounded-lg transition-colors font-medium text-sm flex-shrink-0"
                            >
                                <Trash2 className="w-4 h-4" />
                                Reset
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <PageLayout
            header={Header}
            content={Content}
        />
    );
};

