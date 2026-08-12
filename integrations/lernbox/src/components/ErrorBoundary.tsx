import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    private handleReload = () => {
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-background text-text-main flex items-center justify-center p-4">
                    <div className="bg-surface border border-red-500/30 rounded-2xl p-8 max-w-md w-full shadow-2xl text-center space-y-6 animate-in fade-in zoom-in duration-300">
                        <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
                            <AlertTriangle className="w-8 h-8 text-red-500" />
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-white">Oje, ein Fehler!</h2>
                            <p className="text-slate-400 text-sm">
                                Da ist etwas schiefgelaufen. Wir haben den Fehler protokolliert.
                            </p>
                        </div>

                        {this.state.error && (
                            <div className="bg-slate-950 rounded-lg p-3 text-left overflow-auto max-h-32 text-xs font-mono text-slate-500 border border-slate-800">
                                {this.state.error.toString()}
                            </div>
                        )}

                        <button
                            onClick={this.handleReload}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Seite neu laden
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
