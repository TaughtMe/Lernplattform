// Remembers roomId/accessToken/roomCode of an open room across a reload of
// the teacher dashboard tab (sessionStorage) — otherwise a reload mid-session
// would "lose" the room, since the hook state only lives in memory.
const KEY = "laufdiktatDashboardRoomSession";

export interface DashboardRoomSession {
  roomId: string;
  accessToken: string;
  roomCode: string;
}

export function saveDashboardRoomSession(session: DashboardRoomSession): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // private browsing etc. — not fatal
  }
}

export function readDashboardRoomSession(): DashboardRoomSession | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DashboardRoomSession>;
    if (typeof parsed.roomId === "string" && typeof parsed.accessToken === "string" && typeof parsed.roomCode === "string") {
      return { roomId: parsed.roomId, accessToken: parsed.accessToken, roomCode: parsed.roomCode };
    }
    return null;
  } catch {
    return null;
  }
}

export function clearDashboardRoomSession(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
