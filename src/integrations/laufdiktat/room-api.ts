import { getLiveRoomClient, type LiveRoomConfig } from "./live-room-client";

export type JoinedLiveRoom = {
  roomId: string;
  stationMode: boolean;
  status: "lobby" | "live" | "ended";
  studentName: string;
  participantToken: string;
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
