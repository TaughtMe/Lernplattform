import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { vocabularyService } from '../services/db.service';
import { Download, CheckCircle, X, Camera } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

// Define strict type for internal usage
type ImportItem = { question: string; answer: string; tag?: string };

export const DeckImport: React.FC = () => {
    const { deckId } = useParams<{ deckId: string }>();
    const [jsonInput, setJsonInput] = useState('');
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [isScanning, setIsScanning] = useState(false);

    // Ref to hold the scanner instance to handle cleanup properly
    const scannerRef = useRef<Html5Qrcode | null>(null);

    // Cleanup scanner on unmount or when scanning stops
    useEffect(() => {
        return () => {
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(err => console.warn('Scanner stop error', err));
            }
        };
    }, []);

    useEffect(() => {
        if (isScanning) {
            startScanner();
        } else {
            // Ensure scanner is stopped if we exit scanning mode
            if (scannerRef.current?.isScanning) {
                scannerRef.current.stop().then(() => {
                    scannerRef.current?.clear();
                }).catch(console.error);
            }
        }
        // The scanner lifecycle is intentionally tied only to this state.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isScanning]);

    const startScanner = async () => {
        await new Promise(r => setTimeout(r, 100)); // Small delay for DOM

        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;

        const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
        };

        try {
            await html5QrCode.start(
                { facingMode: "environment" },
                config,
                (decodedText) => {
                    // Success callback
                    handleScanSuccess(decodedText);
                },
                () => {
                    // Error callback (ignore frequent scan errors)
                }
            );
        } catch (err) {
            console.error("Error starting scanner", err);
            setStatus('error');
            setMessage('Kamera konnte nicht gestartet werden. Bitte Berechtigungen prüfen.');
            setIsScanning(false);
        }
    };

    const handleScanSuccess = (decodedText: string) => {
        if (scannerRef.current) {
            scannerRef.current.stop().then(() => {
                scannerRef.current?.clear();
                setIsScanning(false);
                setJsonInput(decodedText); // Fill input
                processImport(decodedText); // Auto-trigger import
            }).catch(console.error);
        }
    };

    const validateImportData = (data: any): ImportItem[] => {
        if (!Array.isArray(data)) throw new Error('Ungültiges Format: Daten müssen ein Array sein.');
        // Limit to prevent memory issues or massive database spam
        if (data.length > 2000) throw new Error('Import-Limit überschritten (Max 2000 Karten).');

        const validItems: ImportItem[] = [];

        for (const item of data) {
            // Check for [Question, Answer, Tag?] format
            if (Array.isArray(item)) {
                if (item.length < 2) continue; // Skip incomplete

                // Strict type checks for content
                const [q, a, t] = item;

                if (typeof q !== 'string' || typeof a !== 'string') continue;

                // Sanitize/Limit lengths
                if (q.trim().length === 0 || a.trim().length === 0) continue;
                if (q.length > 10000 || a.length > 10000) continue; // Reasonable limit per card side

                validItems.push({
                    question: q.trim(),
                    answer: a.trim(),
                    tag: (typeof t === 'string' && t.length < 100) ? t.trim() : undefined
                });
            }
        }

        if (validItems.length === 0) throw new Error('Keine gültigen Karten im Datensatz gefunden.');
        return validItems;
    };

    const processImport = async (inputData: string) => {
        if (!deckId) return;

        try {
            // Parsing JSON
            let data;
            try {
                data = JSON.parse(inputData);
            } catch {
                throw new Error('Ungültiges JSON-Format.');
            }

            // Validating data
            const itemsToImport = validateImportData(data);

            // Importing to DB
            await vocabularyService.importCards(parseInt(deckId), itemsToImport);

            const count = itemsToImport.length;
            setStatus('success');
            setMessage(`${count} Karten erfolgreich importiert!`);
            setJsonInput(''); // Clear input on success

            setTimeout(() => {
                setStatus('idle');
                setMessage('');
            }, 3000);

        } catch (e) {
            console.error("Import error:", e);
            setStatus('error');
            setMessage(e instanceof Error ? e.message : 'Unbekannter Fehler beim Import.');
        }
    };

    const handleImportClick = () => {
        if (!jsonInput.trim()) {
            // Empty input -> Start Scanner
            setMessage('');
            setStatus('idle');
            setIsScanning(true);
        } else {
            // Has input -> Process Text
            processImport(jsonInput);
        }
    };

    return (
        <div className="space-y-4">
            <h4 className="text-text-main font-bold flex items-center gap-2">
                <Download className="w-4 h-4 text-primary" />
                Deck importieren
            </h4>

            {!isScanning && (
                <>
                    <p className="text-xs text-text-muted">
                        JSON-Code einfügen oder Button klicken um QR-Code zu scannen.
                    </p>

                    <textarea
                        value={jsonInput}
                        onChange={(e) => setJsonInput(e.target.value)}
                        placeholder='["Frage", "Antwort", "Tag"]...'
                        className="w-full h-24 bg-background border border-border-default text-xs font-mono text-text-muted p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
                    />
                </>
            )}

            {isScanning && (
                <div className="relative rounded-lg overflow-hidden border border-border-default bg-black">
                    <div id="reader" className="w-full"></div>
                    <button
                        onClick={() => setIsScanning(false)}
                        className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full hover:bg-black/80"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <div className="absolute bottom-2 left-0 right-0 text-center text-white text-xs bg-black/50 py-1">
                        Kamera auf QR-Code richten
                    </div>
                </div>
            )}

            {!isScanning && (
                <button
                    onClick={handleImportClick}
                    disabled={status === 'success'}
                    className={`
                        w-full py-2 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2
                        ${status === 'success' ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/30' :
                            status === 'error' ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/30' :
                                'bg-primary hover:bg-primary-hover text-white'}
                    `}
                >
                    {status === 'success' ? (
                        <><CheckCircle className="w-4 h-4" /> Importiert!</>
                    ) : (
                        // Show Camera icon if input is empty, else Download icon
                        !jsonInput.trim() ? (
                            <><Camera className="w-4 h-4" /> Importieren (Kamera)</>
                        ) : (
                            <><Download className="w-4 h-4" /> Importieren</>
                        )
                    )}
                </button>
            )}

            {message && (
                <div className={`text-xs text-center ${status === 'error' ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                    {message}
                </div>
            )}
        </div>
    );
};
