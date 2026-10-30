import {
  NO_PIN_ATTEMPTS,
  isLocked,
  type PinAttempts,
} from "../domain/teacher-lock";
import {
  pinVerifierSchema,
  type PinVerifier,
} from "../integrations/crypto/pin";

/**
 * Speicher der Lehrer-Sperre (Regel D3-4). Auf dem Gerät liegt nur der
 * Prüfwert der PIN (`PinVerifier`: Salz, Iterationszahl, PBKDF2-Ableitung),
 * nie die PIN selbst. Wer entsperrt hat und wann zuletzt genutzt wurde, steht
 * nur im Arbeitsspeicher: Ein Neustart der Seite sperrt wieder.
 */
export const TEACHER_LOCK_KEY = "lernraum.lehrer-sperre";
/** Zähler der falschen PIN-Eingaben samt Ende der Wartezeit (lokal, übersteht Neuladen). */
export const TEACHER_LOCK_ATTEMPTS_KEY = "lernraum.lehrer-sperre-versuche";
const CHANGE_EVENT = "lernraum-teacher-lock-change";

type LockStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function defaultStorage(): LockStorage {
  return window.localStorage;
}

/** Unlesbares oder Fremdes zählt als „keine PIN“. */
export function parsePinVerifier(raw: string | null): PinVerifier | null {
  if (!raw) return null;
  try {
    const parsed = pinVerifierSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function readPinVerifier(
  getStorage: () => LockStorage = defaultStorage,
): PinVerifier | null {
  try {
    return parsePinVerifier(getStorage().getItem(TEACHER_LOCK_KEY));
  } catch {
    return null;
  }
}

/** Roher Eintrag für `useSyncExternalStore`. */
export function pinVerifierSnapshot(
  getStorage: () => LockStorage = defaultStorage,
): string | null {
  try {
    return getStorage().getItem(TEACHER_LOCK_KEY);
  } catch {
    return null;
  }
}

export function savePinVerifier(
  verifier: PinVerifier,
  getStorage: () => LockStorage = defaultStorage,
): boolean {
  try {
    getStorage().setItem(
      TEACHER_LOCK_KEY,
      JSON.stringify(pinVerifierSchema.parse(verifier)),
    );
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return true;
  } catch {
    return false;
  }
}

export function clearPinVerifier(
  getStorage: () => LockStorage = defaultStorage,
): boolean {
  try {
    getStorage().removeItem(TEACHER_LOCK_KEY);
    // Ohne PIN gibt es nichts mehr zu erraten: Zähler und Wartezeit enden mit.
    getStorage().removeItem(TEACHER_LOCK_ATTEMPTS_KEY);
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return true;
  } catch {
    return false;
  }
}

export function subscribePinVerifier(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(CHANGE_EVENT, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(CHANGE_EVENT, listener);
  };
}

// ---------- Falsche Eingaben und Wartezeit ----------

/** Unlesbares oder Fremdes zählt als „keine falschen Eingaben“. */
export function parsePinAttempts(raw: string | null): PinAttempts {
  if (!raw) return NO_PIN_ATTEMPTS;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return NO_PIN_ATTEMPTS;
    const { failures, lockedUntil } = value as Record<string, unknown>;
    if (
      typeof failures !== "number" ||
      !Number.isInteger(failures) ||
      failures < 0 ||
      (lockedUntil !== null &&
        (typeof lockedUntil !== "number" || !Number.isFinite(lockedUntil)))
    ) {
      return NO_PIN_ATTEMPTS;
    }
    return { failures, lockedUntil };
  } catch {
    return NO_PIN_ATTEMPTS;
  }
}

export function readPinAttempts(
  getStorage: () => LockStorage = defaultStorage,
): PinAttempts {
  try {
    return parsePinAttempts(getStorage().getItem(TEACHER_LOCK_ATTEMPTS_KEY));
  } catch {
    return NO_PIN_ATTEMPTS;
  }
}

/** Roher Eintrag für `useSyncExternalStore`. */
export function pinAttemptsSnapshot(
  getStorage: () => LockStorage = defaultStorage,
): string | null {
  try {
    return getStorage().getItem(TEACHER_LOCK_ATTEMPTS_KEY);
  } catch {
    return null;
  }
}

/** Ein Zähler ohne Besonderheit wird nicht gespeichert, sondern gelöscht. */
export function savePinAttempts(
  attempts: PinAttempts,
  getStorage: () => LockStorage = defaultStorage,
): boolean {
  try {
    if (attempts.failures === 0 && attempts.lockedUntil === null) {
      getStorage().removeItem(TEACHER_LOCK_ATTEMPTS_KEY);
    } else {
      getStorage().setItem(
        TEACHER_LOCK_ATTEMPTS_KEY,
        JSON.stringify({
          failures: attempts.failures,
          lockedUntil: attempts.lockedUntil,
        }),
      );
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return true;
  } catch {
    return false;
  }
}

// ---------- Entsperrzustand im Arbeitsspeicher ----------

export type LockSession = {
  unlockedAt: number | null;
  lastActivityAt: number | null;
};

let session: LockSession = { unlockedAt: null, lastActivityAt: null };
const listeners = new Set<() => void>();

function setSession(next: LockSession) {
  session = next;
  for (const listener of listeners) listener();
}

/** Stabiler Schnappschuss für `useSyncExternalStore`. */
export const lockSessionSnapshot = (): LockSession => session;

export function subscribeLockSession(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

export function markUnlocked(now: number) {
  setSession({ unlockedAt: now, lastActivityAt: now });
}

/**
 * Nutzung merken. Eine Sperre, die schon fällig ist, verlängert sich dadurch
 * nicht: Wer nach 20 Minuten Pause tippt, muss die PIN eingeben.
 */
export function touchLockSession(now: number) {
  if (isLocked({ pinSet: true, ...session, now })) return;
  // Kleine Sprünge nicht melden: sonst rendert jeder Mausschubs neu.
  if (session.lastActivityAt !== null && now - session.lastActivityAt < 5_000) {
    return;
  }
  setSession({ ...session, lastActivityAt: now });
}

/** Sofort sperren (nur Arbeitsspeicher). Auch für Tests, die den Start nachstellen. */
export function resetLockSession() {
  setSession({ unlockedAt: null, lastActivityAt: null });
}
