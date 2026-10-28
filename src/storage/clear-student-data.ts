import Dexie from "dexie";
import { GUEST_MODE_KEY } from "./guest-mode";
import { HOUSE_STATE_KEY } from "./house";
import { LAST_BACKUP_KEY } from "./backup-reminder";
import { LEARNER_PROFILE_KEY } from "./learner-profile";
import { LOCAL_DATA_AREAS } from "./local-data-boundaries";

/**
 * Löscht alle Schülerdaten dieses Geräts (Gastmodus, Befunde B-009, B-010).
 * Hier steht die vollständige Liste der Ziele; wer neue Schülerdaten ablegt,
 * trägt sie hier ein (der Test `clear-student-data.test.ts` prüft die Liste).
 *
 * Gelöscht werden die persönlichen Datenbanken samt Rettungstabelle, die
 * Klassenmitgliedschaften, die Einträge des Kindes in `localStorage` und
 * `sessionStorage` und zuletzt der Gastzustand selbst. Die Lehrerdatenbank
 * (`LOCAL_DATA_AREAS.teacher`) und die Schlüssel des Geräte-Abgleichs der
 * Lehrkraft bleiben unangetastet.
 */

/** Datenbanken mit Schülerdaten; die Lehrerdatenbank gehört nie dazu. */
export const STUDENT_DATABASES: readonly string[] = [
  LOCAL_DATA_AREAS.personal,
  LOCAL_DATA_AREAS.classes,
  // Frühere Datenbank der LernBox; wird beim ersten Start übernommen.
  "LernBoxDB",
];

/** `localStorage`-Einträge des Kindes (Profil, Haus, Einstellungen). Der Gastzustand folgt zuletzt. */
export const STUDENT_LOCAL_KEYS: readonly string[] = [
  LEARNER_PROFILE_KEY,
  LAST_BACKUP_KEY,
  HOUSE_STATE_KEY,
  // Darstellung und Einstellungen des Kindes.
  "theme-preference",
  "textbox-layout",
  "tastenwelt-keyboard-settings",
  "lernraum-spiegelschrift-bis",
  "lernraum-laufdiktat-sterne",
];

/**
 * `sessionStorage`-Einträge des Kindes nach Präfix: Raumbeitritt, laufende
 * Runde und Übernahmen aus dem Laufdiktat. Einträge der Lehrkraft
 * (`lernraum-teacher-…`, `lernraum.teacher-…`) passen auf keines.
 */
export const STUDENT_SESSION_PREFIXES: readonly string[] = [
  "lernraum-live-",
  "lernraum-active-room",
  "lernraum:live-",
];

/** Wartezeit, bis ein gesperrtes Löschen aufgegeben wird. */
const DELETE_TIMEOUT_MS = 4000;

export type ClearStudentDataResult = {
  /** Alles gelöscht, auch der Gastzustand. */
  complete: boolean;
  /** Ziele, die sich nicht löschen ließen. */
  failed: string[];
};

type KeyStorage = Pick<Storage, "getItem" | "removeItem" | "key" | "length">;

/** Leert zuerst alle Tabellen (geht auch bei offenen Verbindungen), löscht dann die Datenbank. */
async function clearDatabase(name: string) {
  if (!(await Dexie.exists(name))) return;
  const database = new Dexie(name);
  try {
    await database.open();
    await Promise.all(database.tables.map((table) => table.clear()));
  } finally {
    database.close();
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      Dexie.delete(name),
      new Promise<void>((resolve) => {
        // Eine blockierte Löschung bricht nichts mehr: Die Tabellen sind leer.
        timer = setTimeout(resolve, DELETE_TIMEOUT_MS);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function removeKeys(
  storage: KeyStorage | undefined,
  matches: (key: string) => boolean,
) {
  if (!storage) return;
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key !== null && matches(key)) keys.push(key);
  }
  for (const key of keys) storage.removeItem(key);
}

function browserStorage(read: () => Storage): Storage | undefined {
  try {
    return read();
  } catch {
    return undefined;
  }
}

export async function clearStudentData(
  options: { local?: Storage; session?: Storage } = {},
): Promise<ClearStudentDataResult> {
  const local =
    options.local ??
    (typeof window === "undefined"
      ? undefined
      : browserStorage(() => window.localStorage));
  const session =
    options.session ??
    (typeof window === "undefined"
      ? undefined
      : browserStorage(() => window.sessionStorage));
  const failed: string[] = [];

  for (const name of STUDENT_DATABASES) {
    try {
      await clearDatabase(name);
    } catch {
      failed.push(name);
    }
  }
  try {
    removeKeys(local, (key) => STUDENT_LOCAL_KEYS.includes(key));
  } catch {
    failed.push("localStorage");
  }
  try {
    removeKeys(session, (key) =>
      STUDENT_SESSION_PREFIXES.some((prefix) => key.startsWith(prefix)),
    );
  } catch {
    failed.push("sessionStorage");
  }
  // Der Gastzustand fällt zuletzt: Blieb etwas übrig, versucht es der nächste
  // App-Start erneut.
  if (failed.length === 0) {
    try {
      removeKeys(local, (key) => key === GUEST_MODE_KEY);
    } catch {
      failed.push(GUEST_MODE_KEY);
    }
  }
  return { complete: failed.length === 0, failed };
}
