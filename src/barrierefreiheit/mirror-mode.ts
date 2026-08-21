import { hashPin, verifyPin, type StoredPin } from "../klasse/teacher-auth.ts";

export const MIRROR_PIN_STORAGE_KEY = "lernraum-mirror-pin";
export const MIRROR_UNTIL_STORAGE_KEY = "lernraum-mirror-until";

/** Dauer-Voreinstellungen in Minuten — Startwert, nicht endgültig kalibriert, wie BOX_INTERVAL_DAYS anderswo. */
export const MIRROR_DURATION_PRESETS_MIN = [10, 20, 30] as const;
export const DEFAULT_MIRROR_DURATION_MIN = 20;

export function computeMirrorUntil(durationMinutes: number, now: number = Date.now()): string {
  return new Date(now + durationMinutes * 60_000).toISOString();
}

export function isMirrorActive(untilIso: string | null, now: number = Date.now()): boolean {
  if (!untilIso) return false;
  const until = Date.parse(untilIso);
  return !Number.isNaN(until) && until > now;
}

/** Aufgerundet, damit "1 Minute übrig" nicht schon bei 0:01 verschwindet. */
export function remainingMinutes(untilIso: string | null, now: number = Date.now()): number {
  if (!untilIso) return 0;
  const until = Date.parse(untilIso);
  if (Number.isNaN(until)) return 0;
  return Math.max(0, Math.ceil((until - now) / 60_000));
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function hasMirrorPin(): boolean {
  if (!isBrowser()) return false;
  try {
    return window.localStorage.getItem(MIRROR_PIN_STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

/** Erstmalige Einrichtung (oder Ändern) der geräteweiten Freigabe-PIN — unabhängig von der Lehrer-Cockpit-PIN, da dieses Gerät ein Schülergerät sein kann, das nie unter /lehrer läuft. */
export async function setMirrorPin(pin: string): Promise<void> {
  if (!isBrowser()) return;
  const stored = await hashPin(pin);
  try {
    window.localStorage.setItem(MIRROR_PIN_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // localStorage kann in privaten Fenstern fehlen — die PIN gilt dann nur für diese Seitenansicht.
  }
}

export async function verifyMirrorPin(pin: string): Promise<boolean> {
  if (!isBrowser()) return false;
  try {
    const raw = window.localStorage.getItem(MIRROR_PIN_STORAGE_KEY);
    if (!raw) return false;
    return verifyPin(pin, JSON.parse(raw) as StoredPin);
  } catch {
    return false;
  }
}

export function getMirrorUntil(): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(MIRROR_UNTIL_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function grantMirrorMode(durationMinutes: number): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(MIRROR_UNTIL_STORAGE_KEY, computeMirrorUntil(durationMinutes));
  } catch {
    // s.o.
  }
}

export function endMirrorMode(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(MIRROR_UNTIL_STORAGE_KEY);
  } catch {
    // s.o.
  }
}
