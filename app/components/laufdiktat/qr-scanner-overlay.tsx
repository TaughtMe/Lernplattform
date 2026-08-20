"use client";

import { useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";
import { X } from "lucide-react";

/**
 * Fullscreen overlay that scans the room QR code via the device camera.
 * Calls `onResult` with the decoded text (usually a URL with ?code=).
 * Ported from TaughtMe/Laufdiktat's components/shared/QrScannerOverlay.tsx.
 */
export function QrScannerOverlay({ onResult, onClose }: { onResult: (text: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let active = true;

    const scanner = new QrScanner(
      video,
      (result) => {
        if (active) onResult(result.data);
      },
      { highlightScanRegion: true, highlightCodeOutline: true, preferredCamera: "environment" },
    );

    scanner.start().catch(() => {
      setError("Kamera konnte nicht gestartet werden. Bitte erlaube den Kamera-Zugriff im Browser.");
    });

    return () => {
      active = false;
      scanner.stop();
      scanner.destroy();
    };
  }, [onResult]);

  return (
    <div className="qr-overlay">
      <div className="qr-overlay__panel">
        <div className="qr-overlay__heading">
          <h3>QR-Code scannen</h3>
          <button type="button" onClick={onClose} aria-label="Schließen"><X className="qr-overlay__icon" /></button>
        </div>

        {error ? (
          <div className="qr-overlay__error">{error}</div>
        ) : (
          <>
            <div className="qr-overlay__video">
              <video ref={videoRef} playsInline muted />
            </div>
            <p className="qr-overlay__hint">Halte den QR-Code deiner Lehrkraft vor die Kamera.</p>
          </>
        )}

        <button type="button" className="button button--quiet qr-overlay__cancel" onClick={onClose}>Abbrechen</button>
      </div>
    </div>
  );
}
