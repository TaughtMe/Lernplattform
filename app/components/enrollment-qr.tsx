import { QRCodeSVG } from "qrcode.react";

/**
 * Der Einschreibe-QR sieht mit und ohne Schreiberleichterung gleich aus
 * (Befund B-008): gleiche Kantenlänge und gleiche Modulzahl. Mit Freigabe
 * trägt der Code etwa 100 Zeichen mehr; ohne feste Mindestversion wäre er
 * dichter (69 statt 61 Module) und fiele auf einem Bogen oder einer Projektion
 * auf. Version 13 (69 Module, Fehlerkorrektur L) fasst beide Fälle. Nur
 * ungewöhnlich lange Namen führen darüber hinaus.
 */
export const ENROLLMENT_QR_MIN_VERSION = 13;

/** Kantenlänge in px: Einzelansicht und Druckbogen. */
export const ENROLLMENT_QR_SIZE = { single: 240, sheet: 180 } as const;

export function EnrollmentQr({
  value,
  label,
  variant,
}: {
  value: string;
  label: string;
  variant: keyof typeof ENROLLMENT_QR_SIZE;
}) {
  return (
    <QRCodeSVG
      value={value}
      size={ENROLLMENT_QR_SIZE[variant]}
      minVersion={ENROLLMENT_QR_MIN_VERSION}
      role="img"
      aria-label={label}
    />
  );
}
