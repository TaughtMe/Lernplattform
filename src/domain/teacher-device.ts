/**
 * Gerätetyp des Lehrerbereichs (Befund B-009, Regeln D3-1 und D3-2). Die
 * Lehrkraft sagt dem Gerät einmal, ob es ihr eigenes ist oder eine Tafel bzw.
 * ein geteiltes Gerät. Auf der Tafel gibt es nur Material: Bereiche mit
 * Personendaten bleiben zu. Reine Regeln, ohne Speicher und Oberfläche.
 */

export const TEACHER_DEVICE_TYPES = ["own", "board"] as const;
export type TeacherDeviceType = (typeof TEACHER_DEVICE_TYPES)[number];

export const TEACHER_DEVICE_LABELS: Record<TeacherDeviceType, string> = {
  own: "Mein Gerät",
  board: "Tafel / geteiltes Gerät (nur Material)",
};

/** Bereiche des Lehrerbereichs; die Kennungen entsprechen der Navigation. */
export type TeacherDeviceArea =
  | "content"
  | "live"
  | "classes"
  | "material"
  | "assignments"
  | "houses"
  | "settings";

/**
 * Bereiche mit Personendaten: Klassen und Schülerliste (mit Einschreibe- und
 * Gast-QR), Aufgaben und Abgaben, Häuser (Punkte der Kinder). Material,
 * Live-Raum, Start und Einstellungen gehören nicht dazu.
 */
export const PERSONAL_DATA_AREAS: readonly TeacherDeviceArea[] = [
  "classes",
  "assignments",
  "houses",
];

/** Auf einer Tafel ist der Bereich gesperrt und in der Navigation ausgeblendet. */
export function isAreaBlockedOnDevice(
  device: TeacherDeviceType | null,
  area: TeacherDeviceArea,
): boolean {
  return device === "board" && PERSONAL_DATA_AREAS.includes(area);
}

/**
 * Bereiche, die eine eingerichtete PIN-Sperre (D3-4) verlangt. Die
 * Einstellungen gehören dazu, weil dort Datenexport und Abgleich liegen. Der
 * Sperrbildschirm selbst ist von der Sperre ausgenommen.
 */
export const PIN_PROTECTED_AREAS: readonly TeacherDeviceArea[] = [
  ...PERSONAL_DATA_AREAS,
  "settings",
];

export function isAreaPinProtected(area: TeacherDeviceArea): boolean {
  return PIN_PROTECTED_AREAS.includes(area);
}

/** Datenexport und -import (Lehrerdatenbank) gibt es nur außerhalb der Tafel. */
export function canExportTeacherData(device: TeacherDeviceType | null) {
  return device !== "board";
}

/** Die PIN-Sperre ist nur auf „Mein Gerät“ wählbar. */
export function canUsePinLock(device: TeacherDeviceType | null) {
  return device === "own";
}
