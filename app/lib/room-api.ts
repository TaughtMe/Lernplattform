/**
 * RPC-Zugriffe auf das Raum-Schema des Laufdiktats (supabase/migrations).
 * Namen und Parameter sind identisch mit TaughtMe/Laufdiktat
 * (src/utils/rooms/roomApi.ts), damit beide Oberflächen dieselbe Datenbank
 * nutzen können.
 *
 * Sicherheitsmodell:
 * - access_token = Lehrer-Schreibrecht, verlässt das Lehrergerät nie.
 * - participant_token = zufälliges Teilnehmertoken je Gerät und Raum
 *   (nur im sessionStorage, in der DB nur als SHA-256-Hash).
 */
import type { WordItem } from "@/src/domain/dictation";
import { supabase } from "./supabase";

export type GameMode = "LAUFDIKTAT" | "UEBUNG" | "BATTLE";
export type RoomStatus = "lobby" | "live" | "ended";

/** rooms.config – kompatibel zum Laufdiktat (buildRoomConfig). */
export interface RoomConfig {
  words: WordItem[];
  gameMode: GameMode;
  battleOptions: { ink: boolean; flicker: boolean };
  stationMode: boolean;
  stationCount: number;
  isTtsEnabled: boolean;
  uebungMaxAttempts: number;
  showStars: boolean;
  shuffleWords: boolean;
  strictTypingMode: boolean;
  stationShuffle?: boolean;
  appVersion: string;
  /** Lernraum-Erweiterung: Fehlerwörter an den Wortspeicher übergeben ("alle" | "fehler" | "keine"). */
  transfer?: "alle" | "fehler" | "keine";
  title?: string;
  className?: string;
}

export const APP_VERSION = "lernraum-1.0.0";

const withRetry = async <T,>(fn: () => Promise<T>, attempts = 2, delayMs = 400): Promise<T> => {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); } catch (err) { last = err; if (i < attempts - 1) await new Promise((r) => setTimeout(r, delayMs)); }
  }
  throw last;
};

function fail(error: { message: string } | null, fallback: string): never {
  throw new Error(error?.message ?? fallback);
}

export async function openRoom(config: Partial<RoomConfig> = {}): Promise<{ roomId: string; code: string; accessToken: string }> {
  const { data, error } = await supabase().rpc("open_room_secure", { p_config: config });
  const row = data?.[0];
  if (error || !row) fail(error, "Raum konnte nicht geöffnet werden.");
  return { roomId: row.room_id, code: row.code, accessToken: row.access_token };
}

export interface JoinedRoom { roomId: string; stationMode: boolean; status: RoomStatus; studentName: string; participantToken: string }

export async function joinRoom(code: string, name: string, existingToken?: string): Promise<JoinedRoom | null> {
  return withRetry(async () => {
    const { data, error } = await supabase().rpc("join_room_secure", { p_code: code, p_student_key: name, p_participant_token: existingToken ?? null });
    if (error) fail(error, "Beitritt fehlgeschlagen.");
    const row = data?.[0];
    if (!row) return null;
    return { roomId: row.room_id, stationMode: row.station_mode, status: row.status, studentName: row.assigned_student_key, participantToken: row.participant_token };
  });
}

export async function touchParticipant(roomId: string, participantToken: string): Promise<void> {
  const { error } = await supabase().rpc("touch_participant_secure", { p_room_id: roomId, p_participant_token: participantToken });
  if (error) fail(error, "Heartbeat fehlgeschlagen.");
}

export async function getRoomState(roomId: string, credentials: { participantToken?: string; accessToken?: string }): Promise<{ status: RoomStatus; sessionId: string | null; config: Partial<RoomConfig> } | null> {
  const { data, error } = await supabase().rpc("get_room_state_secure", { p_room_id: roomId, p_participant_token: credentials.participantToken ?? null, p_access_token: credentials.accessToken ?? null });
  if (error) fail(error, "Raumzustand nicht lesbar.");
  const row = data?.[0];
  return row ? { status: row.status, sessionId: row.session_id, config: row.config ?? {} } : null;
}

export async function updateSession(roomId: string, accessToken: string, sessionId: string, config: RoomConfig): Promise<void> {
  return withRetry(async () => {
    const { error } = await supabase().rpc("update_session_secure", { p_room_id: roomId, p_access_token: accessToken, p_session_id: sessionId, p_config: config });
    if (error) fail(error, "Sitzung konnte nicht gestartet werden.");
  });
}

export async function endRoom(roomId: string, accessToken: string): Promise<void> {
  const { error } = await supabase().rpc("end_room_secure", { p_room_id: roomId, p_access_token: accessToken });
  if (error) fail(error, "Raum konnte nicht beendet werden.");
}

export interface StudentProgress { currentIndex: number; peeks: number; attempts: number; errors: number; finished: boolean }

export async function upsertProgress(input: StudentProgress & { roomId: string; sessionId: string; participantToken: string; studentKey: string; durationMs?: number; wordErrors?: Record<string, number>; stationNumber?: number }): Promise<void> {
  const { error } = await supabase().rpc("upsert_progress_secure", {
    p_room_id: input.roomId, p_session_id: input.sessionId, p_participant_token: input.participantToken, p_student_key: input.studentKey,
    p_current_index: input.currentIndex, p_peeks: input.peeks, p_attempts: input.attempts, p_errors: input.errors, p_finished: input.finished,
    p_duration_ms: input.durationMs ?? null, p_word_errors: input.wordErrors ?? null, p_app_version: APP_VERSION, p_station_number: input.stationNumber ?? null,
  });
  if (error) fail(error, "Fortschritt nicht gespeichert.");
}

export async function getMyProgress(roomId: string, sessionId: string, participantToken: string, studentKey?: string): Promise<StudentProgress | null> {
  const { data, error } = await supabase().rpc("get_my_progress_secure", { p_room_id: roomId, p_session_id: sessionId, p_participant_token: participantToken, p_student_key: studentKey ?? null });
  if (error) fail(error, "Fortschritt nicht lesbar.");
  const row = data?.[0];
  return row ? { currentIndex: row.current_index, peeks: row.peeks, attempts: row.attempts, errors: row.errors, finished: row.finished } : null;
}

export interface RoomStudentRow extends StudentProgress { studentKey: string; stationNumber: number | null; durationMs: number | null; wordErrors: Record<string, number>; sessionId: string }

export async function getRoomStudents(roomId: string, accessToken: string): Promise<RoomStudentRow[]> {
  const { data, error } = await supabase().rpc("get_room_students_secure", { p_room_id: roomId, p_access_token: accessToken });
  if (error) fail(error, "Ergebnisse nicht lesbar.");
  return (data ?? []).map((r: Record<string, unknown>) => ({
    studentKey: r.student_key as string, sessionId: r.session_id as string, stationNumber: (r.station_number as number | null) ?? null,
    currentIndex: r.current_index as number, peeks: r.peeks as number, attempts: r.attempts as number, errors: r.errors as number,
    finished: r.finished as boolean, durationMs: (r.duration_ms as number | null) ?? null, wordErrors: (r.word_errors as Record<string, number>) ?? {},
  }));
}

export async function getRoomParticipants(roomId: string, accessToken: string): Promise<{ studentKey: string; lastSeenAt: string | null }[]> {
  const { data, error } = await supabase().rpc("get_room_participants_secure", { p_room_id: roomId, p_access_token: accessToken });
  if (error) fail(error, "Teilnehmer nicht lesbar.");
  return (data ?? []).map((r: Record<string, unknown>) => ({ studentKey: r.student_key as string, lastSeenAt: (r.last_seen_at as string | null) ?? null }));
}

export async function removeParticipant(roomId: string, accessToken: string, studentKey: string): Promise<void> {
  const { error } = await supabase().rpc("remove_room_participant_secure", { p_room_id: roomId, p_access_token: accessToken, p_student_key: studentKey });
  if (error) fail(error, "Teilnehmer konnte nicht entfernt werden.");
}

/* ---- sessionStorage (flüchtig, wie im Laufdiktat: keine dauerhafte Speicherung von Tokens) ---- */

export function readSession<T>(key: string): T | null {
  try { const raw = sessionStorage.getItem(`lernraum:room:${key}`); return raw ? (JSON.parse(raw) as T) : null; } catch { return null; }
}
export function writeSession(key: string, value: unknown): void {
  try { if (value == null) sessionStorage.removeItem(`lernraum:room:${key}`); else sessionStorage.setItem(`lernraum:room:${key}`, JSON.stringify(value)); } catch { /* ignorieren */ }
}
