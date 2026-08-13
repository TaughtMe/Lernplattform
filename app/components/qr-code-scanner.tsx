"use client";

import { useEffect, useRef, useState } from "react";

type QrCodeScannerProps = {
  onResult: (value: string) => void;
};

export function QrCodeScanner({ onResult }: QrCodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !videoRef.current) return;
    let disposed = false;
    let scanner: import("qr-scanner").default | undefined;

    void import("qr-scanner")
      .then(({ default: QrScanner }) => {
        if (disposed || !videoRef.current) return;
        scanner = new QrScanner(
          videoRef.current,
          (result) => {
            onResult(result.data);
            setOpen(false);
          },
          {
            preferredCamera: "environment",
            highlightScanRegion: true,
            highlightCodeOutline: true,
            returnDetailedScanResult: true,
          },
        );
        return scanner.start();
      })
      .catch(() => {
        if (!disposed) {
          setError(
            "Die Kamera konnte nicht geöffnet werden. Prüfe die Kamerafreigabe oder gib den Code ein.",
          );
        }
      });

    return () => {
      disposed = true;
      scanner?.destroy();
    };
  }, [onResult, open]);

  function openScanner() {
    setError("");
    setOpen(true);
  }

  return (
    <>
      <button
        className="room-code__camera"
        type="button"
        onClick={openScanner}
        aria-label="QR-Code mit Kamera scannen"
      >
        <span className="room-code__camera-icon" aria-hidden="true" />
      </button>
      {open ? (
        <div className="qr-scanner-backdrop" role="presentation">
          <section
            className="qr-scanner-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="qr-scanner-title"
          >
            <div className="qr-scanner-dialog__heading">
              <div>
                <p className="eyebrow">Code beitreten</p>
                <h2 id="qr-scanner-title">QR-Code scannen</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Scanner schließen"
              >
                ×
              </button>
            </div>
            <div className="qr-scanner-video">
              <video ref={videoRef} muted playsInline />
            </div>
            {error ? <p role="alert">{error}</p> : null}
            <p className="qr-scanner-hint">
              Halte den QR-Code vollständig in den Kamerabereich.
            </p>
          </section>
        </div>
      ) : null}
    </>
  );
}
