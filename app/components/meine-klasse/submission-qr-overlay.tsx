"use client";

import { QRCodeSVG } from "qrcode.react";
import { X } from "lucide-react";

interface Props {
  code: string;
  onClose: () => void;
}

/**
 * Zeigt den signierten Leistungsbrief als QR. Bleibt bewusst ruhig sichtbar,
 * bis der Schüler ihn selbst schließt — keine Erfolgsanimation, kein
 * Rückkanal (siehe Entscheidungsprotokoll Punkt 5, "Air-Gap ohne Rückkanal").
 */
export function SubmissionQrOverlay({ code, onClose }: Props) {
  return (
    <div className="qr-overlay" role="dialog" aria-modal="true" aria-label="Leistungsbrief">
      <button type="button" className="qr-overlay__backdrop" onClick={onClose} aria-label="Schließen" />
      <div className="qr-overlay__panel">
        <div className="qr-overlay__heading">
          <h3>Leistungsbrief</h3>
          <button type="button" onClick={onClose} aria-label="Schließen"><X className="qr-overlay__icon" /></button>
        </div>
        <div className="qr-overlay__code">
          <QRCodeSVG value={code} size={280} level="M" />
        </div>
        <p className="qr-overlay__hint">Zeig diesen Code deiner Lehrkraft zum Scannen. Er schließt sich nur, wenn du es selbst tust.</p>
      </div>
    </div>
  );
}
