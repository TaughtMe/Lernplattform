"use client";

import { useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";
import { X } from "lucide-react";

export interface ScanFeedback {
  ok: boolean;
  label: string;
}

interface Props {
  onScan: (text: string) => void;
  onClose: () => void;
  feedback: ScanFeedback | null;
  statusLine: string;
}

const REPEAT_COOLDOWN_MS = 2500;

/**
 * Fortlaufender Scanmodus für den Klassenbriefkasten (siehe Entscheidungs-
 * protokoll Punkt 6) — bleibt offen über mehrere Scans hinweg, statt sich
 * wie QrScannerOverlay nach einem Treffer zu schließen. `feedback` kommt vom
 * Elternteil zurück, sobald die (async) Signaturprüfung fertig ist, und wird
 * hier als grüner/roter Rahmen samt Name/Status angezeigt.
 */
export function ContinuousQrScannerOverlay({ onScan, onClose, feedback, statusLine }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const lastTextRef = useRef<string | null>(null);
  const lastAtRef = useRef(0);
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  });

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const scanner = new QrScanner(
      video,
      (result) => {
        const now = Date.now();
        if (result.data === lastTextRef.current && now - lastAtRef.current < REPEAT_COOLDOWN_MS) return;
        lastTextRef.current = result.data;
        lastAtRef.current = now;
        onScanRef.current(result.data);
      },
      { highlightScanRegion: true, highlightCodeOutline: true, preferredCamera: "environment" },
    );

    scanner.start().catch(() => {
      setError("Kamera konnte nicht gestartet werden. Bitte erlaube den Kamera-Zugriff im Browser.");
    });

    return () => {
      scanner.stop();
      scanner.destroy();
    };
  }, []);

  return (
    <div className="qr-overlay" role="dialog" aria-modal="true" aria-label="Klassenbriefkasten scannen">
      <div className={`qr-overlay__panel${feedback ? (feedback.ok ? " qr-overlay__panel--ok" : " qr-overlay__panel--fail") : ""}`}>
        <div className="qr-overlay__heading">
          <h3>Fortlaufend scannen</h3>
          <button type="button" onClick={onClose} aria-label="Schließen"><X className="qr-overlay__icon" /></button>
        </div>

        {error ? (
          <div className="qr-overlay__error">{error}</div>
        ) : (
          <div className="qr-overlay__video">
            <video ref={videoRef} playsInline muted />
          </div>
        )}

        <p className="qr-overlay__hint">{statusLine}</p>
        {feedback && <p className={`continuous-scanner__feedback${feedback.ok ? " continuous-scanner__feedback--ok" : " continuous-scanner__feedback--fail"}`}>{feedback.label}</p>}

        <button type="button" className="button button--quiet qr-overlay__cancel" onClick={onClose}>Beenden</button>
      </div>
    </div>
  );
}
