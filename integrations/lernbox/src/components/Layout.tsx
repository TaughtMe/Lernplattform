import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Settings as SettingsIcon, RefreshCw } from 'lucide-react';
import { usePWAUpdate } from '../hooks/usePWAUpdate';
import { ThemeToggle } from './ThemeToggle';

interface LayoutProps {
    children?: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
    const { needRefresh, handleSafeUpdate } = usePWAUpdate();

    return (
        <div className="min-h-screen bg-background text-text-main flex flex-col transition-colors duration-200 selection:bg-primary/20">
            <header className="bg-background/95 backdrop-blur-sm border-b border-border-default shadow-sm sticky top-0 z-[100] safe-top transition-colors duration-200">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary">
                        <img src={`${import.meta.env.BASE_URL}logo.png`} alt="LernBox Owl" className="w-10 h-10 object-contain hover:scale-110 transition-transform" />
                        <span>LernBox</span>
                    </Link>

                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <Link to="/settings" aria-label="Einstellungen öffnen" className="p-2 text-muted hover:text-primary transition-colors">
                            <SettingsIcon className="w-5 h-5" />
                        </Link>
                    </div>
                </div>
            </header>

            <main className="flex-1 w-full max-w-5xl mx-auto p-4 flex flex-col relative z-0">
                {children || <Outlet />}

                {needRefresh && (
                    <div className="fixed bottom-4 right-4 z-50 animate-fade-in-up">
                        <div className="bg-surface border border-primary/30 rounded-lg shadow-lg p-4 flex items-center gap-4 max-w-sm">
                            <div className="bg-primary/20 p-2 rounded-full">
                                <RefreshCw className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-semibold text-sm text-text-main mb-1">Update verfügbar</h4>
                                <p className="text-xs text-text-muted">Eine neue Version ist verfügbar.</p>
                            </div>
                            <button
                                onClick={handleSafeUpdate}
                                className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-medium rounded transition-colors whitespace-nowrap"
                            >
                                Sichern & Aktualisieren
                            </button>
                        </div>
                    </div>
                )}
            </main>

            <footer className="w-full py-6 mt-auto border-t border-border-default bg-surface text-center">
                <div className="max-w-5xl mx-auto px-4 flex flex-col gap-4">
                    <p className="font-medium text-text-muted text-sm">© {new Date().getFullYear()} Toby Bryson</p>
                    <div className="flex flex-wrap justify-center gap-6 text-sm text-text-muted">
                        <Link to="/legal" className="hover:text-primary transition-colors hover:underline">Impressum</Link>
                        <Link to="/legal" className="hover:text-primary transition-colors hover:underline">Datenschutz</Link>
                        <Link to="/legal" className="hover:text-primary transition-colors hover:underline">Lizenzen (OSS)</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
};
