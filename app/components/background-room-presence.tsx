"use client";

import { useEffect } from "react";
import {
  getLiveRoomClient,
  type LiveRoomConfig,
} from "../../src/integrations/laufdiktat/live-room-client";
import {
  forgetActiveRoom,
  readActiveRoom,
  ROOM_ACTIVITY_TIMEOUT_MS,
  type RoomActivity,
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
    if (!room) return;
    const client = getLiveRoomClient(liveRoomConfig);
    const channel = client.channel(`room-${room.code}`, {
      config: { presence: { key: room.studentName } },
    });
    let stopped = false;
    const stop = () => {
      if (stopped) return;
      stopped = true;
      window.clearTimeout(timer);
      void client.removeChannel(channel);
    };
    const activity: RoomActivity = "practice";
    channel
      .on("broadcast", { event: "session-ended" }, () => {
        forgetActiveRoom();
        stop();
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED")
          void channel.track({ name: room.studentName, activity });
      });
    const remaining = Math.max(
      0,
      room.lastRoomAt + ROOM_ACTIVITY_TIMEOUT_MS - Date.now(),
    );
    const timer = window.setTimeout(() => {
      forgetActiveRoom();
      stop();
    }, remaining);
    return stop;
  }, [enabled, liveRoomConfig]);
  return null;
}
