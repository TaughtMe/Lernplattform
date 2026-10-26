"use client";

import { useEffect } from "react";
import {
  getLiveRoomState,
  touchLiveParticipant,
} from "../../src/integrations/laufdiktat/room-api";
import { type LiveRoomConfig } from "../../src/integrations/laufdiktat/live-room-client";
import {
  forgetActiveRoom,
  readActiveRoom,
  ROOM_ACTIVITY_TIMEOUT_MS,
} from "./room-activity";

/**
 * Hält einen Schüler, der den Raum zum Weiterüben verlassen hat, als
 * „übt weiter“ in der Anwesenheit der Lehrkraft. Endet mit der Runde oder
 * 45 Minuten nach dem letzten Besuch der Raumseite.
 */
export function BackgroundRoomPresence({
  liveRoomConfig,
  enabled,
}: {
  liveRoomConfig: LiveRoomConfig | null;
  enabled: boolean;
}) {
  useEffect(() => {
    if (!liveRoomConfig || !enabled) return;
    const room = readActiveRoom();
    if (!room?.roomId || !room.participantToken) return;
    const roomId = room.roomId;
    const participantToken = room.participantToken;
    let stopped = false;
    let loading = false;
    const beat = async () => {
      if (stopped || loading || document.visibilityState !== "visible") return;
      loading = true;
      try {
        const state = await getLiveRoomState(liveRoomConfig, roomId, {
          participantToken,
        });
        if (stopped) return;
        if (!state || state.status === "ended") {
          forgetActiveRoom();
          stop();
          return;
        }
        await touchLiveParticipant(
          liveRoomConfig,
          roomId,
          participantToken,
          "practice",
        );
      } catch {
        // Retry on the next heartbeat; never publish identity on an open channel.
      } finally {
        loading = false;
      }
    };
    const interval = window.setInterval(() => void beat(), 15_000);
    const onVisible = () => void beat();
    document.addEventListener("visibilitychange", onVisible);
    const remaining = Math.max(
      0,
      room.lastRoomAt + ROOM_ACTIVITY_TIMEOUT_MS - Date.now(),
    );
    const timer = window.setTimeout(() => {
      forgetActiveRoom();
      stop();
    }, remaining);
    function stop() {
      stopped = true;
      window.clearTimeout(timer);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    }
    void beat();
    return stop;
  }, [enabled, liveRoomConfig]);
  return null;
}
