/**
 * Hauswahl und Standnummer (persönlich) sowie Klassenbriefkasten (Lehrkraft).
 * Beides liegt nur lokal; der Brief wird per QR ohne Netzwerk übertragen.
 */
import * as z from "zod";
import {
  houseIdSchema,
  signedHouseLetterSchema,
  type HouseInbox,
  type HouseScanStatus,
} from "../domain/houses";
import { LOCAL_DATA_AREAS } from "./local-data-boundaries";

export const HOUSE_STATE_KEY = `${LOCAL_DATA_AREAS.personal}:house`;
export const HOUSE_INBOX_KEY = `${LOCAL_DATA_AREAS.teacher}:house-inbox`;
const CHANGE_EVENT = "lernraum-house-change";

export const houseStateSchema = z
  .object({
    version: z.literal(1),
    house: houseIdSchema.nullable(),
    sequence: z.number().int().min(0),
    share: z
      .object({
        points: z.boolean(),
        rounds: z.boolean(),
        correct: z.boolean(),
      })
      .strict(),
  })
  .strict();
export type HouseState = z.infer<typeof houseStateSchema>;

export const DEFAULT_HOUSE_STATE: HouseState = {
  version: 1,
  house: null,
  sequence: 0,
  share: { points: true, rounds: true, correct: false },
};

const scanLogEntrySchema = z
  .object({
    alias: z.string(),
    house: z.string(),
    status: z.enum([
      "neu",
      "aktualisiert",
      "doppelt",
      "veraltet",
      "klassenfremd",
      "unbekannt",
      "ungueltig",
    ]),
    at: z.iso.datetime(),
  })
  .strict();
export type HouseScanLogEntry = {
  alias: string;
  house: string;
  status: HouseScanStatus;
  at: string;
};

const inboxStoreSchema = z.record(
  z.string(),
  z
    .object({
      letters: z.record(z.string(), signedHouseLetterSchema),
      log: z.array(scanLogEntrySchema),
    })
    .strict(),
);
type InboxStore = z.infer<typeof inboxStoreSchema>;

function readJson<T>(key: string, schema: z.ZodType<T>, fallback: T): T {
  try {
    const parsed = schema.safeParse(
      JSON.parse(window.localStorage.getItem(key) ?? "null"),
    );
    return parsed.success ? parsed.data : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Speicher voll oder gesperrt: Anzeige läuft weiter, Stand geht beim Neuladen verloren */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeHouse(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(CHANGE_EVENT, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(CHANGE_EVENT, listener);
  };
}

let stateCache: { raw: string | null; value: HouseState } | null = null;
export function readHouseState(): HouseState {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(HOUSE_STATE_KEY);
  } catch {
    /* gesperrt */
  }
  if (stateCache && stateCache.raw === raw) return stateCache.value;
  const value = readJson(
    HOUSE_STATE_KEY,
    houseStateSchema,
    DEFAULT_HOUSE_STATE,
  );
  stateCache = { raw, value };
  return value;
}

export function writeHouseState(update: (prev: HouseState) => HouseState) {
  writeJson(HOUSE_STATE_KEY, houseStateSchema.parse(update(readHouseState())));
}

let inboxCache: { raw: string | null; value: InboxStore } | null = null;
function readInboxStore(): InboxStore {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(HOUSE_INBOX_KEY);
  } catch {
    /* gesperrt */
  }
  if (inboxCache && inboxCache.raw === raw) return inboxCache.value;
  const value = readJson(HOUSE_INBOX_KEY, inboxStoreSchema, {});
  inboxCache = { raw, value };
  return value;
}

const EMPTY: { letters: HouseInbox; log: HouseScanLogEntry[] } = {
  letters: {},
  log: [],
};
export function readHouseInbox(classId: string) {
  return readInboxStore()[classId] ?? EMPTY;
}

export function writeHouseInbox(
  classId: string,
  letters: HouseInbox,
  entry?: HouseScanLogEntry,
) {
  const store = readInboxStore();
  const current = store[classId] ?? EMPTY;
  writeJson(HOUSE_INBOX_KEY, {
    ...store,
    [classId]: {
      letters,
      log: entry ? [entry, ...current.log].slice(0, 50) : current.log,
    },
  });
}

export function clearHouseInbox(classId: string) {
  const store = { ...readInboxStore() };
  delete store[classId];
  writeJson(HOUSE_INBOX_KEY, store);
}
