/**
 * Merkt sich im Tab den laufenden Unterrichtsraum eines Schülers, damit er
 * nach dem Verlassen der Raumseite (z. B. zum Weiterüben) für die Lehrkraft
 * als „übt weiter“ sichtbar bleibt. Nach 45 Minuten ohne Raumseite endet
 * das, um Verbindungen zu sparen.
 */
const KEY = "lernraum-active-room";
export const ROOM_ACTIVITY_TIMEOUT_MS = 45 * 60 * 1000;

export type ActiveRoom = {
  code: string;
  studentName: string;
  /** Zeitpunkt, zu dem der Schüler zuletzt auf der Raumseite war. */
  lastRoomAt: number;
};

export type RoomActivity = "room" | "practice";

export function rememberActiveRoom(code: string, studentName: string) {
  try {
    const value: ActiveRoom = { code, studentName, lastRoomAt: Date.now() };
    sessionStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // Ohne Speicher bleibt nur die Anwesenheit auf der Raumseite.
  }
}

export function readActiveRoom(now = Date.now()): ActiveRoom | null {
  try {
    const value = JSON.parse(
      sessionStorage.getItem(KEY) ?? "null",
    ) as Partial<ActiveRoom> | null;
    if (
      !value ||
      typeof value.code !== "string" ||
      !/^\d{4}$/.test(value.code) ||
      typeof value.studentName !== "string" ||
      typeof value.lastRoomAt !== "number"
    )
      return null;
    if (now - value.lastRoomAt > ROOM_ACTIVITY_TIMEOUT_MS) {
      forgetActiveRoom();
      return null;
    }
    return value as ActiveRoom;
  } catch {
    return null;
  }
}

export function forgetActiveRoom() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // nichts zu tun
  }
}
