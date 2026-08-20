"use client";

import { QRCodeSVG } from "qrcode.react";
import { X } from "lucide-react";

/**
 * Fullscreen dialog with a large QR code + room code for joining. The QR
 * encodes the same join URL a student would type in by hand.
 * Ported from TaughtMe/Laufdiktat's components/shared/RoomQrOverlay.tsx.
 */
export function RoomQrOverlay({ roomCode, onClose }: { roomCode: string; onClose: () => void }) {
  const joinUrl = `${window.location.origin}/raum?code=${roomCode}`;

  return (
    <div className="qr-overlay" role="dialog" aria-modal="true" aria-label="QR-Code für den Raumbeitritt">
      <button type="button" className="qr-overlay__backdrop" onClick={onClose} aria-label="Schließen" />
      <div className="qr-overlay__panel">
        <div className="qr-overlay__heading">
          <h3>Raum {roomCode}</h3>
          <button type="button" onClick={onClose} aria-label="Schließen"><X className="qr-overlay__icon" /></button>
        </div>
        <div className="qr-overlay__code">
          <QRCodeSVG value={joinUrl} size={280} level="H" />
        </div>
        <p className="qr-overlay__hint">Neben den QR-Code tippen zum Schließen.</p>
      </div>
    </div>
  );
}
