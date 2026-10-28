import type * as z from "zod";
import {
  parseRoundSnapshot,
  type RoundSnapshot,
  type RoundSnapshotModule,
} from "../domain/round-snapshot";

/**
 * Zwischenstand einer Übungsrunde im `localStorage` (Befund C-001), ein Eintrag
 * je Modul. Es steht nur darin, was zum Fortsetzen nötig ist; die Antworten
 * selbst liegen wie bisher in der Datenbank. Die Schlüssel stehen in
 * `STUDENT_LOCAL_KEYS` und verschwinden mit dem Gerätelöschen und im Gastmodus.
 *
 * Jeder Zugriff fängt Fehler ab (gesperrter oder voller Speicher): Ohne
 * Zwischenstand läuft die Runde einfach wie früher.
 */
export const ROUND_SNAPSHOT_KEYS: Record<RoundSnapshotModule, string> = {
  wortspeicher: "lernraum-runde-wortspeicher",
  lernbox: "lernraum-runde-lernbox",
  kopfrechnen: "lernraum-runde-kopfrechnen",
  laufdiktat: "lernraum-runde-laufdiktat",
};

type SnapshotStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function defaultStorage(): SnapshotStorage {
  return window.localStorage;
}

/** Speichert den Zwischenstand; `false`, wenn der Speicher ihn nicht annimmt. */
export function saveRoundSnapshot(
  snapshot: RoundSnapshot<unknown>,
  getStorage: () => SnapshotStorage = defaultStorage,
): boolean {
  try {
    getStorage().setItem(
      ROUND_SNAPSHOT_KEYS[snapshot.module],
      JSON.stringify(snapshot),
    );
    return true;
  } catch {
    return false;
  }
}

/** Roher Eintrag für `useSyncExternalStore` (bleibt zwischen Aufrufen gleich, solange nichts gespeichert wird). */
export function readRoundSnapshotRaw(
  module: RoundSnapshotModule,
  getStorage: () => SnapshotStorage = defaultStorage,
): string | null {
  try {
    return getStorage().getItem(ROUND_SNAPSHOT_KEYS[module]);
  } catch {
    return null;
  }
}

/** Liest den Zwischenstand des Moduls; `null`, wenn keiner da oder er nicht brauchbar ist. */
export function loadRoundSnapshot<State>(
  module: RoundSnapshotModule,
  schema: z.ZodType<State>,
  options: { now?: Date; getStorage?: () => SnapshotStorage } = {},
): RoundSnapshot<State> | null {
  return parseRoundSnapshot(readRoundSnapshotRaw(module, options.getStorage), {
    module,
    now: options.now ?? new Date(),
    state: schema,
  });
}

/** Verwirft den Zwischenstand (Runde beendet oder „Neu anfangen“). */
export function clearRoundSnapshot(
  module: RoundSnapshotModule,
  getStorage: () => SnapshotStorage = defaultStorage,
): void {
  try {
    getStorage().removeItem(ROUND_SNAPSHOT_KEYS[module]);
  } catch {
    // Ohne Zugriff gibt es auch nichts zu löschen.
  }
}
