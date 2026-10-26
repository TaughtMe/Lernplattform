import { z } from "zod";
import { animalTokenSchema } from "../../domain/learner-profile";
import { getLiveRoomClient, type LiveRoomConfig } from "./live-room-client";
import type { JoinedLiveRoom } from "./room-api";

const activitySchema = z.object({
  peers: z.array(
    z.object({
      key: z.string().min(1).max(64),
      animal: animalTokenSchema.nullable(),
      number: z.number().int().nonnegative(),
      index: z.number().int().min(0).max(10_000),
    }),
  ),
  attacks: z.array(
    z.object({
      id: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
      from: z.string().min(1).max(80),
      type: z.enum(["ink", "flicker"]),
    }),
  ),
});

/** Only server-authorized state is shown; there is no public broadcast fallback. */
export async function getLiveRoomActivity(
  config: LiveRoomConfig,
  room: Pick<JoinedLiveRoom, "roomId" | "participantToken">,
  sessionId: string,
  afterAttackId: number,
) {
  const { data, error } = await getLiveRoomClient(config).rpc(
    "get_room_activity_secure",
    {
      p_room_id: room.roomId,
      p_participant_token: room.participantToken,
      p_session_id: sessionId,
      p_after_attack_id: afterAttackId,
    },
  );
  if (error) throw new Error(error.message);
  return activitySchema.parse(data);
}

/** The server derives the sender from the token, never from a submitted name. */
export async function sendLiveRoomAttack(
  config: LiveRoomConfig,
  room: Pick<JoinedLiveRoom, "roomId" | "participantToken">,
  sessionId: string,
  target: string,
  type: "ink" | "flicker",
) {
  const { data, error } = await getLiveRoomClient(config).rpc(
    "send_room_attack_secure",
    {
      p_room_id: room.roomId,
      p_participant_token: room.participantToken,
      p_session_id: sessionId,
      p_target: target,
      p_type: type,
    },
  );
  if (error) throw new Error(error.message);
  return data === true;
}
