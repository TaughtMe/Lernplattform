import * as z from "zod";
import {
  TEACHER_DEVICE_TYPES,
  type TeacherDeviceType,
} from "../domain/teacher-device";

/**
 * Gerätetyp dieses Geräts (Befund B-009, Regeln D3-1 bis D3-3): Die Lehrkraft
 * wählt beim ersten Öffnen des Lehrerbereichs „Mein Gerät“ oder „Tafel /
 * geteiltes Gerät“. Die Wahl liegt nur im `localStorage` dieses Geräts und
 * wird tolerant gelesen: Unlesbares oder Fremdes zählt als „noch nicht
 * gewählt“.
 */
export const TEACHER_DEVICE_KEY = "lernraum.lehrer-geraet";
const CHANGE_EVENT = "lernraum-teacher-device-change";

export const teacherDeviceSchema = z.object({
  v: z.literal(1),
  type: z.enum(TEACHER_DEVICE_TYPES),
  chosenAt: z.iso.datetime(),
});
export type TeacherDeviceState = z.infer<typeof teacherDeviceSchema>;

type DeviceStorage = Pick<Storage, "getItem" | "setItem">;

function defaultStorage(): DeviceStorage {
  return window.localStorage;
}

export function parseTeacherDevice(
  raw: string | null,
): TeacherDeviceState | null {
  if (!raw) return null;
  try {
    const parsed = teacherDeviceSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function readTeacherDevice(
  getStorage: () => DeviceStorage = defaultStorage,
): TeacherDeviceState | null {
  try {
    return parseTeacherDevice(getStorage().getItem(TEACHER_DEVICE_KEY));
  } catch {
    return null;
  }
}

/**
 * Gerätetyp für den Abgleich: Solange nichts gewählt ist, gilt das Gerät als
 * „eigenes“. Der Lehrerbereich fragt vorher; der Abgleich selbst fragt nicht.
 */
export function readTeacherDeviceType(
  getStorage: () => DeviceStorage = defaultStorage,
): TeacherDeviceType {
  return readTeacherDevice(getStorage)?.type ?? "own";
}

/** Roher Eintrag für `useSyncExternalStore` (muss zwischen Aufrufen gleich bleiben). */
export function teacherDeviceSnapshot(
  getStorage: () => DeviceStorage = defaultStorage,
): string | null {
  try {
    return getStorage().getItem(TEACHER_DEVICE_KEY);
  } catch {
    return null;
  }
}

export function saveTeacherDevice(
  type: TeacherDeviceType,
  now: Date,
  getStorage: () => DeviceStorage = defaultStorage,
): boolean {
  try {
    const state = teacherDeviceSchema.parse({
      v: 1,
      type,
      chosenAt: now.toISOString(),
    });
    getStorage().setItem(TEACHER_DEVICE_KEY, JSON.stringify(state));
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return true;
  } catch {
    return false;
  }
}

export function subscribeTeacherDevice(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(CHANGE_EVENT, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(CHANGE_EVENT, listener);
  };
}
