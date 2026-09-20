"use client";

import { useEffect, useRef, useState } from "react";
import { CameraIcon, CloseIcon } from "./ui-icons";

type QrCodeScannerProps = {
  continuous?: boolean;
  onResult: (value: string) => void;
};

export function QrCodeScanner({
  continuous = false,
  onResult,
}: QrCodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onResultRef = useRef(onResult);
  const lastResultRef = useRef({ value: "", at: 0 });
  const feedbackTimerRef = useRef<number | undefined>(undefined);
  const audioContextRef = useRef<AudioContext | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState(false);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  function playScanFeedback() {
    try {
      const AudioContextConstructor =
        window.AudioContext ??
        (
          window as typeof window & {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;
      if (!AudioContextConstructor) return;
      const context = audioContextRef.current ?? new AudioContextConstructor();
      audioContextRef.current = context;
      void context.resume();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        context.currentTime + 0.12,
      );
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.12);
    } catch {
      // Audio feedback is an enhancement and can be unavailable in embedded browsers.
    }
  }

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
            const now = Date.now();
            if (
              result.data === lastResultRef.current.value &&
              now - lastResultRef.current.at < 1200
            ) {
              return;
            }
            lastResultRef.current = { value: result.data, at: now };
            onResultRef.current(result.data);
            navigator.vibrate?.(35);
            playScanFeedback();
            if (continuous) {
              setFeedback(true);
              window.clearTimeout(feedbackTimerRef.current);
              feedbackTimerRef.current = window.setTimeout(
                () => setFeedback(false),
                1100,
              );
            } else {
              setOpen(false);
            }
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
      window.clearTimeout(feedbackTimerRef.current);
    };
  }, [continuous, open]);

  useEffect(
    () => () => {
      void audioContextRef.current?.close();
    },
    [],
  );

  function openScanner() {
    setError("");
    setFeedback(false);
    lastResultRef.current = { value: "", at: 0 };
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
        <CameraIcon className="room-code__camera-icon" aria-hidden="true" />
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
                <CloseIcon aria-hidden="true" />
              </button>
            </div>
            <div className={`qr-scanner-video${feedback ? " is-success" : ""}`}>
              <video ref={videoRef} muted playsInline />
            </div>
            {error ? <p role="alert">{error}</p> : null}
            {feedback ? (
              <p
                className="qr-scanner-feedback"
                role="status"
                aria-live="polite"
              >
                Code erkannt. Nächsten Code scannen.
              </p>
            ) : null}
            <p className="qr-scanner-hint">
              {continuous
                ? "Mehrere Codes nacheinander scannen. Halte den QR-Code vollständig in den Kamerabereich."
                : "Halte den QR-Code vollständig in den Kamerabereich."}
            </p>
          </section>
        </div>
      ) : null}
    </>
  );
}
