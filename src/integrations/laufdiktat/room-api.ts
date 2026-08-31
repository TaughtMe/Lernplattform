import { getLiveRoomClient, type LiveRoomConfig } from "./live-room-client";
import { LIVE_APP_VERSION } from "../../app-version";

export type JoinedLiveRoom = {
  roomId: string;
  stationMode: boolean;
  status: "lobby" | "live" | "ended";
  studentName: string;
  participantToken: string;
};

export type LiveRoomState = {
  status: "lobby" | "live" | "ended";
  sessionId: string | null;
  config: Record<string, unknown>;
};

export type LiveProgress = {
  currentIndex: number;
  peeks: number;
  attempts: number;
  errors: number;
  finished: boolean;
  durationMs?: number;
  wordErrors?: Record<string, number>;
  stationNumber?: number | null;
};

export type OpenedLiveRoom = {
  roomId: string;
  code: string;
  accessToken: string;
};

export type LiveRoomParticipant = {
  studentName: string;
  lastSeenAt: string | null;
};

export type LiveRoomStudent = LiveProgress & {
  studentName: string;
  stationNumber: number | null;
  appVersion: string | null;
};

export async function openLiveRoom(
  config: LiveRoomConfig,
  roomConfig: Record<string, unknown>,
  teacherAccessCode: string,
): Promise<OpenedLiveRoom> {
  const { data, error } = await getLiveRoomClient(config).rpc(
    "open_room_secure",
    {
      p_config: roomConfig,
      p_teacher_token: teacherAccessCode,
    },
  );
  if (error) throw new Error(error.message);
  const row = data?.[0];
  if (!row) throw new Error("Der Raum konnte nicht geöffnet werden.");
  return {
    roomId: row.room_id,
    code: row.code,
    accessToken: row.access_token,
  };
}

export async function updateLiveSession(
  config: LiveRoomConfig,
  room: Pick<OpenedLiveRoom, "roomId" | "accessToken">,
  sessionId: string,
  roomConfig: Record<string, unknown>,
) {
  const { error } = await getLiveRoomClient(config).rpc(
    "update_session_secure",
    {
      p_room_id: room.roomId,
      p_access_token: room.accessToken,
      p_session_id: sessionId,
      p_config: roomConfig,
    },
  );
  if (error) throw new Error(error.message);
}

export async function endLiveRoom(
  config: LiveRoomConfig,
  room: Pick<OpenedLiveRoom, "roomId" | "accessToken">,
) {
  const { error } = await getLiveRoomClient(config).rpc("end_room_secure", {
    p_room_id: room.roomId,
    p_access_token: room.accessToken,
  });
  if (error) throw new Error(error.message);
}

export async function getLiveRoomParticipants(
  config: LiveRoomConfig,
  room: Pick<OpenedLiveRoom, "roomId" | "accessToken">,
): Promise<LiveRoomParticipant[]> {
  const { data, error } = await getLiveRoomClient(config).rpc(
    "get_room_participants_secure",
    {
      p_room_id: room.roomId,
      p_access_token: room.accessToken,
    },
  );
  if (error) throw new Error(error.message);
  return (data ?? []).map(
    (row: { student_key: string; last_seen_at: string | null }) => ({
      studentName: row.student_key,
      lastSeenAt: row.last_seen_at,
    }),
  );
}

export async function getLiveRoomStudents(
  config: LiveRoomConfig,
  room: Pick<OpenedLiveRoom, "roomId" | "accessToken">,
): Promise<LiveRoomStudent[]> {
  const { data, error } = await getLiveRoomClient(config).rpc(
    "get_room_students_secure",
    { p_room_id: room.roomId, p_access_token: room.accessToken },
  );
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Record<string, unknown>) => ({
    studentName: row["student_key"] as string,
    stationNumber: (row["station_number"] as number | null) ?? null,
    currentIndex: row["current_index"] as number,
    peeks: row["peeks"] as number,
    attempts: row["attempts"] as number,
    errors: row["errors"] as number,
    finished: row["finished"] as boolean,
    durationMs: (row["duration_ms"] as number | null) ?? undefined,
    wordErrors: (row["word_errors"] as Record<string, number>) ?? {},
    appVersion: (row["app_version"] as string | null) ?? null,
  }));
}

export async function removeLiveRoomParticipant(
  config: LiveRoomConfig,
  room: Pick<OpenedLiveRoom, "roomId" | "accessToken">,
  studentName: string,
) {
  const { error } = await getLiveRoomClient(config).rpc(
    "remove_room_participant_secure",
    {
      p_room_id: room.roomId,
      p_access_token: room.accessToken,
      p_student_key: studentName,
    },
  );
  if (error) throw new Error(error.message);
}

const TEACHER_ROOM_KEY = "lernraum-teacher-live-room";

export function saveTeacherLiveRoom(room: OpenedLiveRoom) {
  try {
    sessionStorage.setItem(TEACHER_ROOM_KEY, JSON.stringify(room));
  } catch {
    // Nur Wiederherstellung im selben Browserfenster; der Raum bleibt nutzbar.
  }
}

export function readTeacherLiveRoom(): OpenedLiveRoom | null {
  try {
    const parsed = JSON.parse(
      sessionStorage.getItem(TEACHER_ROOM_KEY) ?? "null",
    ) as Partial<OpenedLiveRoom> | null;
    return parsed?.roomId && parsed.code && parsed.accessToken
      ? {
          roomId: parsed.roomId,
          code: parsed.code,
          accessToken: parsed.accessToken,
        }
      : null;
  } catch {
    return null;
  }
}

export function clearTeacherLiveRoom() {
  try {
    sessionStorage.removeItem(TEACHER_ROOM_KEY);
  } catch {
    // ignore
  }
}

export async function joinLiveRoom(
  config: LiveRoomConfig,
  code: string,
  studentName: string,
  participantToken?: string,
): Promise<JoinedLiveRoom | null> {
  const { data, error } = await getLiveRoomClient(config).rpc(
    "join_room_secure",
    {
      p_code: code,
      p_student_key: studentName,
      p_participant_token: participantToken ?? null,
    },
  );

  if (error) throw new Error(error.message);
  const row = data?.[0];
  if (!row) return null;

  return {
    roomId: row.room_id,
    stationMode: row.station_mode,
    status: row.status,
    studentName: row.assigned_student_key,
    participantToken: row.participant_token,
  };
}

export async function getLiveRoomState(
  config: LiveRoomConfig,
  roomId: string,
  credentials: { participantToken?: string; accessToken?: string },
): Promise<LiveRoomState | null> {
  const { data, error } = await getLiveRoomClient(config).rpc(
    "get_room_state_secure",
    {
      p_room_id: roomId,
      p_participant_token: credentials.participantToken ?? null,
      p_access_token: credentials.accessToken ?? null,
    },
  );
  if (error) throw new Error(error.message);
  const row = data?.[0];
  if (!row) return null;
  return {
    status: row.status,
    sessionId: row.session_id,
    config: row.config ?? {},
  };
}

export async function saveLiveProgress(
  config: LiveRoomConfig,
  identity: {
    roomId: string;
    sessionId: string;
    participantToken: string;
    studentName: string;
  },
  progress: LiveProgress,
) {
  const { error } = await getLiveRoomClient(config).rpc(
    "upsert_progress_secure",
    {
      p_room_id: identity.roomId,
      p_session_id: identity.sessionId,
      p_participant_token: identity.participantToken,
      p_student_key: progress.stationNumber
        ? `station-${progress.stationNumber}`
        : identity.studentName,
      p_current_index: progress.currentIndex,
      p_peeks: progress.peeks,
      p_attempts: progress.attempts,
      p_errors: progress.errors,
      p_finished: progress.finished,
      p_duration_ms: progress.durationMs ?? null,
      p_word_errors: progress.wordErrors ?? null,
      p_app_version: LIVE_APP_VERSION,
      p_station_number: progress.stationNumber ?? null,
    },
  );
  if (error) throw new Error(error.message);
}

export async function getLiveProgress(
  config: LiveRoomConfig,
  identity: {
    roomId: string;
    sessionId: string;
    participantToken: string;
    studentName: string;
  },
): Promise<LiveProgress | null> {
  const { data, error } = await getLiveRoomClient(config).rpc(
    "get_my_progress_secure",
    {
      p_room_id: identity.roomId,
      p_session_id: identity.sessionId,
      p_participant_token: identity.participantToken,
      p_student_key: identity.studentName,
    },
  );
  if (error) throw new Error(error.message);
  const row = data?.[0];
  if (!row) return null;
  return {
    currentIndex: row.current_index,
    peeks: row.peeks,
    attempts: row.attempts,
    errors: row.errors,
    finished: row.finished,
    durationMs: row.duration_ms ?? undefined,
    wordErrors: row.word_errors ?? undefined,
    stationNumber: row.station_number ?? undefined,
  };
}

export async function touchLiveParticipant(
  config: LiveRoomConfig,
  roomId: string,
  participantToken: string,
) {
  const { error } = await getLiveRoomClient(config).rpc(
    "touch_participant_secure",
    {
      p_room_id: roomId,
      p_participant_token: participantToken,
    },
  );
  if (error) throw new Error(error.message);
}

const IDENTITY_KEY = "lernraum-live-room-identity";

type StoredIdentity = {
  code: string;
  name: string;
  participantToken: string;
};

export function readLiveRoomIdentity(code: string): StoredIdentity | null {
  try {
    const stored = JSON.parse(
      sessionStorage.getItem(IDENTITY_KEY) ?? "null",
    ) as StoredIdentity | null;
    return stored?.code === code ? stored : null;
  } catch {
    return null;
  }
}

export function saveLiveRoomIdentity(identity: StoredIdentity) {
  try {
    sessionStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
  } catch {
    // Der Raum funktioniert weiter, auch wenn der Browser Sitzungsspeicher sperrt.
  }
}
