"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";
import { Sheet } from "./sheet";

type QrCodeScannerProps = {
  continuous?: boolean;
  onResult: (value: string) => void;
  /** Klasse des Kamera-Knopfs; Standard ist das bisherige Aussehen. */
  buttonClassName?: string;
  /** Symbolgröße und Strichstärke der Kamera. */
  iconSize?: number;
  iconStrokeWidth?: number;
};

export function QrCodeScanner({
  continuous = false,
  onResult,
  buttonClassName = "ui-icon-btn ui-icon-btn--square",
  iconSize = 20,
  iconStrokeWidth,
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
        className={buttonClassName}
        type="button"
        onClick={openScanner}
        aria-label="QR-Code mit Kamera scannen"
      >
        <Icon
          name="camera"
          size={iconSize}
          {...(iconStrokeWidth ? { strokeWidth: iconStrokeWidth } : {})}
        />
      </button>
      <Sheet open={open} title="QR-Code scannen" onClose={() => setOpen(false)}>
        <div className={`ui-scanner${feedback ? " is-success" : ""}`}>
          <video ref={videoRef} muted playsInline />
        </div>
        {error ? (
          <p className="ui-notice ui-notice--bad" role="alert">
            {error}
          </p>
        ) : null}
        {feedback ? (
          <p
            className="ui-notice ui-notice--good"
            role="status"
            aria-live="polite"
          >
            Code erkannt. Nächsten Code scannen.
          </p>
        ) : null}
        <p className="ui-small ui-muted">
          {continuous
            ? "Mehrere Codes nacheinander scannen. Halte den QR-Code vollständig in den Kamerabereich."
            : "Halte den QR-Code vollständig in den Kamerabereich."}
        </p>
      </Sheet>
    </>
  );
}
