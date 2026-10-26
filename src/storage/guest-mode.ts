import * as z from "zod";

/**
 * Gastzustand eines geteilten Geräts (Befunde B-009, B-010): Solange der Eintrag
 * im `localStorage` steht, ist das Gerät ein Gastgerät, dessen Schülerdaten am
 * Ende gelöscht werden (`clearStudentData`). Der Eintrag wird tolerant gelesen:
 * Unlesbares oder Fremdes zählt als „kein Gastmodus“.
 */
export const GUEST_MODE_KEY = "lernraum.gastmodus";
const CHANGE_EVENT = "lernraum-guest-mode-change";

/** Ein Gastmodus, der länger als 12 Stunden läuft, endet beim nächsten Start. */
export const GUEST_MODE_MAX_AGE_MS = 12 * 60 * 60_000;
/** Ein Startzeitpunkt in der Zukunft (falsche Uhr) wird nur kurz toleriert. */
const FUTURE_TOLERANCE_MS = 5 * 60_000;

export const guestModeSchema = z.object({
  v: z.literal(1),
  startedAt: z.iso.datetime(),
  classId: z.string().uuid(),
});
export type GuestModeState = z.infer<typeof guestModeSchema>;

type GuestStorage = Pick<Storage, "getItem" | "setItem">;

function defaultStorage(): GuestStorage {
  return window.localStorage;
}

export function parseGuestMode(raw: string | null): GuestModeState | null {
  if (!raw) return null;
  try {
    const parsed = guestModeSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function readGuestMode(
  getStorage: () => GuestStorage = defaultStorage,
): GuestModeState | null {
  try {
    return parseGuestMode(getStorage().getItem(GUEST_MODE_KEY));
  } catch {
    return null;
  }
}

/** Roher Eintrag für `useSyncExternalStore` (muss zwischen Aufrufen gleich bleiben). */
export function guestModeSnapshot(
  getStorage: () => GuestStorage = defaultStorage,
): string | null {
  try {
    return getStorage().getItem(GUEST_MODE_KEY);
  } catch {
    return null;
  }
}

export function startGuestMode(
  classId: string,
  now: Date,
  getStorage: () => GuestStorage = defaultStorage,
): boolean {
  try {
    const state = guestModeSchema.parse({
      v: 1,
      startedAt: now.toISOString(),
      classId,
    });
    getStorage().setItem(GUEST_MODE_KEY, JSON.stringify(state));
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return true;
  } catch {
    return false;
  }
}

export function subscribeGuestMode(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(CHANGE_EVENT, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(CHANGE_EVENT, listener);
  };
}

/**
 * Soll ein laufender Gastmodus beim App-Start beendet werden? Ja, wenn er mehr
 * als 12 Stunden läuft oder sein Start deutlich in der Zukunft liegt (die Uhr
 * ging falsch; sonst liefe er nie ab). Die Zeit wird übergeben, damit der Test
 * sie festlegen kann.
 */
export function isGuestModeExpired(state: GuestModeState, now: Date) {
  const age = now.getTime() - Date.parse(state.startedAt);
  return age > GUEST_MODE_MAX_AGE_MS || age < -FUTURE_TOLERANCE_MS;
}

export type GuestCleanupDecision = "none" | "keep" | "end";

/** Entscheidung beim App-Start: kein Gastmodus, weiterlaufen lassen oder beenden. */
export function decideGuestCleanup(
  state: GuestModeState | null,
  now: Date,
): GuestCleanupDecision {
  if (!state) return "none";
  return isGuestModeExpired(state, now) ? "end" : "keep";
}
