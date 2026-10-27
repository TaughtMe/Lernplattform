/**
 * Lokale Sperre des Lehrerbereichs (Regel D3-4): PIN mit 6 Ziffern. Die Sperre
 * ist ein Sichtschutz gegen neugierige Blicke, keine Verschlüsselung. Reine
 * Regeln; die Zeit kommt von außen, damit Tests sie festlegen können.
 */

export const PIN_LENGTH = 6;

/** Nach so langer Zeit ohne Nutzung verlangen die Personenbereiche die PIN erneut. */
export const LOCK_IDLE_LIMIT_MS = 15 * 60_000;

/** Geht die Uhr weiter zurück, gilt die Sperre als fällig (Uhr verstellt). */
const BACKWARD_TOLERANCE_MS = 60_000;

/** Ehrlicher Hinweis, überall dort, wo die Sperre angeboten wird. */
export const PIN_LOCK_NOTICE =
  "Sichtschutz, keine Verschlüsselung: Die Sperre hält neugierige Blicke ab. Wer das Gerät mit Werkzeugen untersucht, kommt trotzdem an die Daten.";

export function isValidPin(pin: string): boolean {
  return /^[0-9]{6}$/.test(pin);
}

/** Aus einer Eingabe nur die Ziffern behalten, höchstens so viele wie die PIN lang ist. */
export function sanitizePinInput(raw: string): string {
  return raw.replace(/[^0-9]/g, "").slice(0, PIN_LENGTH);
}

export type LockInput = {
  /** Eine PIN ist eingerichtet. */
  pinSet: boolean;
  /** Zeitpunkt der letzten Entsperrung; `null` = seit dem Start nicht entsperrt. */
  unlockedAt: number | null;
  /** Zeitpunkt der letzten Nutzung; `null` = seit dem Entsperren keine. */
  lastActivityAt: number | null;
  now: number;
};

function lastUse({ unlockedAt, lastActivityAt }: LockInput) {
  return Math.max(lastActivityAt ?? 0, unlockedAt ?? 0);
}

/** Ist der Lehrerbereich mit Personendaten gerade gesperrt? */
export function isLocked(input: LockInput): boolean {
  if (!input.pinSet) return false;
  if (input.unlockedAt === null) return true;
  const idle = input.now - lastUse(input);
  return idle >= LOCK_IDLE_LIMIT_MS || idle < -BACKWARD_TOLERANCE_MS;
}

/** Restzeit bis zur nächsten Sperre in Millisekunden; 0, wenn schon gesperrt. */
export function msUntilLock(input: LockInput): number {
  if (isLocked(input) || input.unlockedAt === null) return 0;
  return Math.max(0, lastUse(input) + LOCK_IDLE_LIMIT_MS - input.now);
}
