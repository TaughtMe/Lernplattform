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

// ---------- Wartezeit nach falscher PIN ----------

/** So viele falsche Eingaben in Folge sind erlaubt, dann beginnt die Wartezeit. */
export const MAX_PIN_ATTEMPTS = 5;

/** Wartezeit nach der letzten erlaubten falschen Eingabe. */
export const PIN_LOCKOUT_MS = 60_000;

/**
 * Zähler der falschen Eingaben. `lockedUntil` ist das Ende der Wartezeit;
 * `null` heißt: keine läuft. Nach Ablauf der Wartezeit beginnt der Zähler bei 0
 * (wieder 5 Versuche). Der Zustand liegt lokal, damit Neuladen nichts aufhebt.
 */
export type PinAttempts = {
  failures: number;
  lockedUntil: number | null;
};

export const NO_PIN_ATTEMPTS: PinAttempts = { failures: 0, lockedUntil: null };

/**
 * Restzeit der Wartezeit in Millisekunden; 0, wenn die Eingabe frei ist. Wurde
 * die Uhr zurückgestellt, gilt höchstens die volle Wartezeit: Die Sperre dauert
 * nie länger als eine Minute, auch wenn `lockedUntil` weit in der Zukunft liegt.
 */
export function pinWaitMs(attempts: PinAttempts, now: number): number {
  if (attempts.lockedUntil === null) return 0;
  return Math.min(PIN_LOCKOUT_MS, Math.max(0, attempts.lockedUntil - now));
}

/** Wie viele falsche Eingaben sind bis zur Wartezeit noch erlaubt? */
export function pinAttemptsLeft(attempts: PinAttempts): number {
  return Math.max(0, MAX_PIN_ATTEMPTS - attempts.failures);
}

/**
 * Eine falsche Eingabe zählen. Während der Wartezeit zählt nichts (die Eingabe
 * ist dann ohnehin gesperrt); die fünfte falsche Eingabe startet die Wartezeit.
 */
export function recordWrongPin(
  attempts: PinAttempts,
  now: number,
): PinAttempts {
  if (pinWaitMs(attempts, now) > 0) return attempts;
  const failures = (attempts.lockedUntil === null ? attempts.failures : 0) + 1;
  if (failures >= MAX_PIN_ATTEMPTS) {
    return { failures: 0, lockedUntil: now + PIN_LOCKOUT_MS };
  }
  return { failures, lockedUntil: null };
}

/** Die richtige PIN setzt den Zähler zurück. */
export function resetPinAttempts(): PinAttempts {
  return NO_PIN_ATTEMPTS;
}

/** „45 Sekunden“ bzw. „1 Minute“; die letzte angefangene Sekunde zählt voll. */
export function describePinWait(ms: number): string {
  const seconds = Math.max(1, Math.ceil(ms / 1000));
  if (seconds >= 60) return "1 Minute";
  return seconds === 1 ? "1 Sekunde" : `${seconds} Sekunden`;
}
