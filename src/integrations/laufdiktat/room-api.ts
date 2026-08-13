import { getLiveRoomClient, type LiveRoomConfig } from "./live-room-client";

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
};

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
  participantToken: string,
): Promise<LiveRoomState | null> {
  const { data, error } = await getLiveRoomClient(config).rpc(
    "get_room_state_secure",
    {
      p_room_id: roomId,
      p_participant_token: participantToken,
      p_access_token: null,
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
      p_student_key: identity.studentName,
      p_current_index: progress.currentIndex,
      p_peeks: progress.peeks,
      p_attempts: progress.attempts,
      p_errors: progress.errors,
      p_finished: progress.finished,
      p_duration_ms: progress.durationMs ?? null,
      p_word_errors: progress.wordErrors ?? null,
      p_app_version: "lernraum-0.1.0",
      p_station_number: null,
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
