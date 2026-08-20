// Remembers this device's participant identity for one room in
// sessionStorage (deliberately not localStorage — a fresh browser tab starts
// with a fresh identity). Lets a manual rejoin (retyping the code) reuse the
// same participant token instead of registering as a second participant
// ("21 participants for 19 students").
const ROOM_KEY = "laufdiktatRoomCode";
const NAME_KEY = "laufdiktatStudentName";
const TOKEN_KEY = "laufdiktatParticipantToken";

export interface RoomIdentity {
  name: string;
  participantToken: string;
}

export function saveRoomIdentity(code: string, name: string, participantToken?: string): void {
  try {
    sessionStorage.setItem(ROOM_KEY, code);
    sessionStorage.setItem(NAME_KEY, name);
    if (participantToken) sessionStorage.setItem(TOKEN_KEY, participantToken);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // private browsing etc. — not fatal
  }
}

/** Reads the remembered identity for exactly this room code. */
export function readRoomIdentity(code: string): RoomIdentity | null {
  try {
    if (sessionStorage.getItem(ROOM_KEY) !== code) return null;
    const name = sessionStorage.getItem(NAME_KEY);
    const participantToken = sessionStorage.getItem(TOKEN_KEY);
    if (!name || !participantToken) return null;
    return { name, participantToken };
  } catch {
    return null;
  }
}

/** Clears the remembered identity. Only when the room provably no longer exists. */
export function clearRoomIdentity(): void {
  try {
    sessionStorage.removeItem(ROOM_KEY);
    sessionStorage.removeItem(NAME_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}
