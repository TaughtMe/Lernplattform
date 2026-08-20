// Thin wrapper around the RPC functions defined in supabase/migrations/.
// Ported from TaughtMe/Laufdiktat's utils/rooms/roomApi.ts to keep the exact
// RPC contract, so these calls work unmodified once those migrations are
// applied to a Supabase project.
//
// Security model (see migration comments):
// - accessToken is teacher-only write access (openRoom/updateSession/endRoom/
//   getRoomStudents) and never leaves the dashboard.
// - participantToken is randomly generated per device+room on join. Only its
//   SHA-256 hash is stored in the database.

import { supabase } from "./supabase-client.ts";
import type { RoomConfig } from "./types.ts";

async function withRetry<T>(fn: () => Promise<T>, attempts = 2, delayMs = 400): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastErr;
}

export interface OpenRoomResult {
  roomId: string;
  code: string;
  accessToken: string;
}

export interface JoinedRoom {
  roomId: string;
  status: "lobby" | "live" | "ended";
  studentName: string;
  participantToken: string;
  stationMode: boolean;
}

export interface RoomState {
  status: "lobby" | "live" | "ended";
  sessionId: string | null;
  config: Partial<RoomConfig>;
}

/** Creates a new room (collision-checked code assignment, see open_room_secure() in the migration). */
export async function openRoom(config: Record<string, unknown> = {}): Promise<OpenRoomResult> {
  const { data, error } = await supabase.rpc("open_room_secure", { p_config: config });
  const row = data?.[0];
  if (error || !row) {
    throw new Error(error?.message ?? "open_room_secure() returned no data");
  }
  return { roomId: row.room_id, code: row.code, accessToken: row.access_token };
}

/** Joins a room and returns the device-bound participant token. */
export async function joinRoom(
  code: string,
  studentName: string,
  existingParticipantToken?: string,
): Promise<JoinedRoom | null> {
  return withRetry(async () => {
    const { data, error } = await supabase.rpc("join_room_secure", {
      p_code: code,
      p_student_key: studentName,
      p_participant_token: existingParticipantToken ?? null,
    });
    if (error) throw new Error(error.message);
    const row = data?.[0];
    if (!row) return null;
    return {
      roomId: row.room_id,
      status: row.status,
      studentName: row.assigned_student_key,
      participantToken: row.participant_token,
      stationMode: row.station_mode,
    };
  });
}

/** Lightweight DB heartbeat: marks this device as "still here" (room_participants.last_seen_at). */
export async function touchParticipant(roomId: string, participantToken: string): Promise<void> {
  const { error } = await supabase.rpc("touch_participant_secure", {
    p_room_id: roomId,
    p_participant_token: participantToken,
  });
  if (error) throw new Error(error.message);
}

/** Reads room state with either a participant or a teacher access token. */
export async function getRoomState(
  roomId: string,
  credentials: { participantToken?: string; accessToken?: string },
): Promise<RoomState | null> {
  const { data, error } = await supabase.rpc("get_room_state_secure", {
    p_room_id: roomId,
    p_participant_token: credentials.participantToken ?? null,
    p_access_token: credentials.accessToken ?? null,
  });
  if (error) throw new Error(error.message);
  const row = data?.[0];
  if (!row) return null;
  return { status: row.status, sessionId: row.session_id, config: row.config ?? {} };
}

/** Starts/updates a room's session (teacher dashboard, token-bound). */
export async function updateSession(
  roomId: string,
  accessToken: string,
  sessionId: string,
  config: RoomConfig,
): Promise<void> {
  return withRetry(async () => {
    const { error } = await supabase.rpc("update_session_secure", {
      p_room_id: roomId,
      p_access_token: accessToken,
      p_session_id: sessionId,
      p_config: config,
    });
    if (error) throw new Error(error.message);
  });
}

/** Ends a room and immediately frees its code (teacher dashboard, token-bound). */
export async function endRoom(roomId: string, accessToken: string): Promise<void> {
  const { error } = await supabase.rpc("end_room_secure", { p_room_id: roomId, p_access_token: accessToken });
  if (error) throw new Error(error.message);
}

export interface StudentProgress {
  currentIndex: number;
  peeks: number;
  attempts: number;
  errors: number;
  finished: boolean;
}

/** Reads back a student's own progress (resync after a reload/device change). `null` if nothing was saved yet. */
export async function getMyProgress(
  roomId: string,
  sessionId: string,
  participantToken: string,
  studentKey?: string,
): Promise<StudentProgress | null> {
  const { data, error } = await supabase.rpc("get_my_progress_secure", {
    p_room_id: roomId,
    p_session_id: sessionId,
    p_participant_token: participantToken,
    p_student_key: studentKey ?? null,
  });
  if (error) throw new Error(error.message);
  const row = data?.[0];
  if (!row) return null;
  return {
    currentIndex: row.current_index,
    peeks: row.peeks,
    attempts: row.attempts,
    errors: row.errors,
    finished: row.finished,
  };
}

export interface UpsertProgressInput extends StudentProgress {
  roomId: string;
  sessionId: string;
  participantToken: string;
  studentKey: string;
  durationMs?: number;
  wordErrors?: Record<string, number>;
  appVersion?: string;
  /** Set only in station mode. */
  stationNumber?: number;
}

/** Writes/updates exactly one student's progress (see upsert_progress_secure() in the migration). */
export async function upsertProgress(input: UpsertProgressInput): Promise<void> {
  const { error } = await supabase.rpc("upsert_progress_secure", {
    p_room_id: input.roomId,
    p_session_id: input.sessionId,
    p_participant_token: input.participantToken,
    p_student_key: input.studentKey,
    p_current_index: input.currentIndex,
    p_peeks: input.peeks,
    p_attempts: input.attempts,
    p_errors: input.errors,
    p_finished: input.finished,
    p_duration_ms: input.durationMs ?? null,
    p_word_errors: input.wordErrors ?? null,
    p_app_version: input.appVersion ?? null,
    p_station_number: input.stationNumber ?? null,
  });
  if (error) throw new Error(error.message);
}

export interface RoomStudentRow extends StudentProgress {
  roomId: string;
  sessionId: string;
  studentKey: string;
  stationNumber: number | null;
  durationMs: number | null;
  wordErrors: Record<string, number>;
  appVersion: string | null;
}

export interface RoomParticipantRow {
  studentKey: string;
  lastSeenAt: string | null;
}

/** Reads all REGISTERED participants of a room (teacher dashboard, token-bound). */
export async function getRoomParticipants(roomId: string, accessToken: string): Promise<RoomParticipantRow[]> {
  const { data, error } = await supabase.rpc("get_room_participants_secure", {
    p_room_id: roomId,
    p_access_token: accessToken,
  });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Record<string, unknown>) => ({
    studentKey: row.student_key as string,
    lastSeenAt: (row.last_seen_at as string | null) ?? null,
  }));
}

/** Removes a registered participant and their progress from the room (teacher dashboard, token-bound). */
export async function removeRoomParticipant(roomId: string, accessToken: string, studentKey: string): Promise<void> {
  const { error } = await supabase.rpc("remove_room_participant_secure", {
    p_room_id: roomId,
    p_access_token: accessToken,
    p_student_key: studentKey,
  });
  if (error) throw new Error(error.message);
}

/** Reads the progress of ALL students in a room (teacher dashboard, token-bound — rehydration after a reload). */
export async function getRoomStudents(roomId: string, accessToken: string): Promise<RoomStudentRow[]> {
  const { data, error } = await supabase.rpc("get_room_students_secure", {
    p_room_id: roomId,
    p_access_token: accessToken,
  });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Record<string, unknown>) => ({
    roomId: row.room_id as string,
    sessionId: row.session_id as string,
    studentKey: row.student_key as string,
    stationNumber: (row.station_number as number | null) ?? null,
    currentIndex: row.current_index as number,
    peeks: row.peeks as number,
    attempts: row.attempts as number,
    errors: row.errors as number,
    finished: row.finished as boolean,
    durationMs: row.duration_ms as number | null,
    wordErrors: (row.word_errors as Record<string, number>) ?? {},
    appVersion: row.app_version as string | null,
  }));
}
