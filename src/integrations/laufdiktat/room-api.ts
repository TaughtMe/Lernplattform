import {
  openedRoomSchema,
  joinedRoomSchema,
  roomStateSchema,
  progressRowSchema,
  studentRowSchema,
  participantRowSchema,
  storedTeacherRoomSchema,
  storedIdentitySchema,
  parseRpcRows,
} from "./room-contract";
import { getLiveRoomClient, type LiveRoomConfig } from "./live-room-client";
import { LIVE_APP_VERSION } from "../../app-version";
import {
  animalTokenFromDisplayName,
  type AnimalToken,
} from "../../domain/learner-profile";
import {
  createRoomJoinPayload,
  createRoomReentryToken,
  roomIdentityStorageKey,
} from "../../domain/room-identity";

async function withLiveRoomRetry<T>(
  operation: () => Promise<T>,
  attempts = 2,
  delayMs = 400,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError;
}

export type JoinedLiveRoom = {
  roomId: string;
  stationMode: boolean;
  status: "lobby" | "live" | "ended";
  studentName: string;
  participantToken: string;
  animalToken: AnimalToken | null;
  animalNumber: number;
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
  durationMs?: number | undefined;
  wordErrors?: Record<string, number> | undefined;
  stationNumber?: number | null | undefined;
};

export type OpenedLiveRoom = {
  roomId: string;
  code: string;
  accessToken: string;
};

export type LiveRoomParticipant = {
  studentName: string;
  animalToken: AnimalToken | null;
  animalNumber: number;
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
): Promise<OpenedLiveRoom> {
  const { data, error } = await getLiveRoomClient(config).rpc(
    "open_room_secure",
    {
      p_config: roomConfig,
    },
  );
  if (error) throw new Error(error.message);
  const row = parseRpcRows(openedRoomSchema, data)[0];
  if (!row) throw new Error("Lehrkraftfreigabe fehlt oder ist ungültig.");
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
  return withLiveRoomRetry(async () => {
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
  });
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
  return parseRpcRows(participantRowSchema, data).map((row) => ({
    studentName: row.student_key,
    animalToken: row.animal_token ?? null,
    animalNumber: row.animal_number ?? 0,
    lastSeenAt: row.last_seen_at,
  }));
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
  return parseRpcRows(studentRowSchema, data).map((row) => ({
    studentName: row.student_key,
    stationNumber: row.station_number ?? null,
    currentIndex: row.current_index,
    peeks: row.peeks,
    attempts: row.attempts,
    errors: row.errors,
    finished: row.finished,
    durationMs: row.duration_ms ?? undefined,
    wordErrors: row.word_errors ?? {},
    appVersion: row.app_version,
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
    sessionStorage.setItem(
      TEACHER_ROOM_KEY,
      JSON.stringify(storedTeacherRoomSchema.parse(room)),
    );
  } catch {
    // Nur Wiederherstellung im selben Browserfenster; der Raum bleibt nutzbar.
  }
}

export function readTeacherLiveRoom(): OpenedLiveRoom | null {
  try {
    const result = storedTeacherRoomSchema.safeParse(
      JSON.parse(sessionStorage.getItem(TEACHER_ROOM_KEY) ?? "null"),
    );
    return result.success ? result.data : null;
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
  studentNameOrIdentity:
    string | { animalToken: AnimalToken | null; participantToken?: string },
  participantToken?: string,
): Promise<JoinedLiveRoom | null> {
  const animalToken =
    typeof studentNameOrIdentity === "string"
      ? animalTokenFromDisplayName(studentNameOrIdentity)
      : studentNameOrIdentity.animalToken;
  const requestedToken =
    typeof studentNameOrIdentity === "string"
      ? participantToken
      : studentNameOrIdentity.participantToken;
  const payload = createRoomJoinPayload(
    animalToken,
    requestedToken ?? createRoomReentryToken(),
  );
  return withLiveRoomRetry(async () => {
    const { data, error } = await getLiveRoomClient(config).rpc(
      "join_room_secure",
      {
        p_code: code,
        p_student_key: payload.animalToken,
        p_participant_token: payload.reentryToken,
      },
    );
    if (error) throw new Error(error.message);
    const row = parseRpcRows(joinedRoomSchema, data)[0];
    if (!row) return null;
    return {
      roomId: row.room_id,
      stationMode: row.station_mode,
      status: row.status,
      studentName: row.assigned_student_key,
      participantToken: row.participant_token,
      animalToken: row.animal_token ?? null,
      animalNumber: row.animal_number ?? 0,
    };
  });
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
  const row = parseRpcRows(roomStateSchema, data)[0];
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
  const row = parseRpcRows(progressRowSchema, data)[0];
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

const LEGACY_IDENTITY_KEY = "lernraum-live-room-identity";

type StoredIdentity = {
  code: string;
  name: string;
  participantToken: string;
  animalToken?: AnimalToken | null | undefined;
  participantKey?: string | undefined;
};

export function readLiveRoomIdentity(code: string): StoredIdentity | null {
  try {
    const raw =
      sessionStorage.getItem(roomIdentityStorageKey(code)) ??
      sessionStorage.getItem(LEGACY_IDENTITY_KEY);
    const result = storedIdentitySchema.safeParse(JSON.parse(raw ?? "null"));
    return result.success && result.data.code === code ? result.data : null;
  } catch {
    return null;
  }
}

export function saveLiveRoomIdentity(identity: StoredIdentity) {
  try {
    const storedIdentity = storedIdentitySchema.parse({
      ...identity,
      participantKey: identity.participantKey ?? identity.name,
      ...(identity.animalToken !== undefined
        ? { animalToken: identity.animalToken }
        : { animalToken: animalTokenFromDisplayName(identity.name) }),
    });
    sessionStorage.setItem(
      roomIdentityStorageKey(storedIdentity.code),
      JSON.stringify(storedIdentity),
    );
  } catch {
    // Der Raum funktioniert weiter, auch wenn der Browser Sitzungsspeicher sperrt.
  }
}
