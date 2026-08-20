"use client";

import { useEffect } from "react";
import { touchParticipant } from "./room-api.ts";
import { HEARTBEAT_INTERVAL_MS } from "./presence-config.ts";

/**
 * Connection-independent DB heartbeat: periodically marks the device as
 * "online" (room_participants.last_seen_at). The teacher dashboard reads this
 * timestamp to show who's currently connected, independent of how sluggish
 * Supabase Presence is at noticing a real disconnect.
 */
export function useParticipantHeartbeat(
  roomId: string | undefined,
  participantToken: string | undefined,
  enabled = true,
): void {
  useEffect(() => {
    if (!roomId || !participantToken || !enabled) return;
    let cancelled = false;

    const beat = () => {
      if (cancelled || document.visibilityState !== "visible") return;
      touchParticipant(roomId, participantToken).catch(() => {});
    };

    beat();
    const intervalId = setInterval(beat, HEARTBEAT_INTERVAL_MS);
    const onVisible = () => beat();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [roomId, participantToken, enabled]);
}
