"use client";

import { QRCodeSVG } from "qrcode.react";
import { X } from "lucide-react";
import { encodeEnrollment, type EnrollmentPayloadV1 } from "../../../src/klasse/roster.ts";

interface Props {
  payload: EnrollmentPayloadV1;
  onClose: () => void;
}

/** Einschreibungs-QR für einen einzelnen Schüler — einmalig zeigen/ausdrucken, der Schüler scannt ihn selbst über "Meine Klasse". */
export function EnrollmentQrOverlay({ payload, onClose }: Props) {
  return (
    <div className="qr-overlay" role="dialog" aria-modal="true" aria-label={`Einschreibungscode für ${payload.alias}`}>
      <button type="button" className="qr-overlay__backdrop" onClick={onClose} aria-label="Schließen" />
      <div className="qr-overlay__panel">
        <div className="qr-overlay__heading">
          <h3>{payload.alias} · {payload.className}</h3>
          <button type="button" onClick={onClose} aria-label="Schließen"><X className="qr-overlay__icon" /></button>
        </div>
        <div className="qr-overlay__code">
          <QRCodeSVG value={encodeEnrollment(payload)} size={280} level="M" />
        </div>
        <p className="qr-overlay__hint">Der Schüler scannt diesen Code einmalig unter „Meine Klasse&rdquo;, um sich einzuschreiben.</p>
      </div>
    </div>
  );
}
