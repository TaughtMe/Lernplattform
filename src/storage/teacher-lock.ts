import { isLocked } from "../domain/teacher-lock";
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
