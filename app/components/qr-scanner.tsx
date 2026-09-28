"use client";

import { useEffect, useRef, useState } from "react";

interface DetectedBarcode { rawValue: string }
interface BarcodeDetectorLike { detect(source: CanvasImageSource): Promise<DetectedBarcode[]> }
type DetectorCtor = new (opts: { formats: string[] }) => BarcodeDetectorLike;

export function qrScanSupported(): boolean {
  return typeof window !== "undefined" && "BarcodeDetector" in window && !!navigator.mediaDevices?.getUserMedia;
}

/**
 * Kamera-Scanner über die native BarcodeDetector-API (Chrome/Edge/Android).
 * `continuous`: nach einem Treffer weiter scannen (Klassen-Scanmodus), gleiche
 * Codes werden 2,5 s lang nicht erneut gemeldet.
 */
export function QrScanner({ onCode, continuous = false, className = "", frameColor }: { onCode: (value: string) => void; continuous?: boolean; className?: string; frameColor?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onCodeRef = useRef(onCode);
  const supported = qrScanSupported();
  const [error, setError] = useState<string | null>(supported ? null : "Dieser Browser kann keine QR-Codes mit der Kamera lesen. Bitte Code eintippen.");
  useEffect(() => { onCodeRef.current = onCode; }, [onCode]);

  useEffect(() => {
    if (!supported) return;
    let stream: MediaStream | null = null;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const recent = new Map<string, number>();
    const Detector = (window as unknown as { BarcodeDetector: DetectorCtor }).BarcodeDetector;
    const detector = new Detector({ formats: ["qr_code"] });

    const tick = async () => {
      if (stopped || !videoRef.current) return;
      try {
        if (videoRef.current.readyState >= 2) {
          const codes = await detector.detect(videoRef.current);
          const now = Date.now();
          for (const c of codes) {
            if ((recent.get(c.rawValue) ?? 0) > now - 2500) continue;
            recent.set(c.rawValue, now);
            onCodeRef.current(c.rawValue);
            if (!continuous) { stopped = true; return; }
          }
        }
      } catch {
        /* einzelne Frames dürfen fehlschlagen */
      }
      timer = setTimeout(tick, 250);
    };

    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((s) => {
        if (stopped) { s.getTracks().forEach((t) => t.stop()); return; }
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          void videoRef.current.play();
        }
        void tick();
      })
      .catch(() => setError("Kein Kamerazugriff. Bitte Code eintippen oder Kamera erlauben."));

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [continuous, supported]);

  return (
    <div className={className} style={{ position: "relative", display: "grid", placeItems: "center", minHeight: 150, borderRadius: 16, overflow: "hidden", background: "repeating-linear-gradient(135deg,#2a2723 0 10px,#211f1b 10px 20px)" }}>
      {error ? (
        <p style={{ padding: 16, color: "#cfc7b6", fontSize: 13, textAlign: "center" }}>{error}</p>
      ) : (
        <>
          <video ref={videoRef} muted playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          <span style={{ position: "absolute", inset: "18% 26%", borderRadius: 12, border: `3px solid ${frameColor ?? "rgba(240,207,132,.8)"}`, transition: "border-color .2s" }} />
        </>
      )}
    </div>
  );
}
