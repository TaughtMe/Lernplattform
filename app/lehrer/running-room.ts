"use client";

import { useEffect, useState } from "react";
import { readTeacherLiveRoom } from "../../src/integrations/laufdiktat/room-api";
import { roomTimeState } from "../../src/integrations/laufdiktat/room-limits";
import type { StartRoom } from "../views/lehrer/start-screen";

/** Ziel von „Zum Raum“: Der Live-Raum nimmt den offenen Raum wieder auf. */
export const LIVE_ROOM_HREF = "/lehrer/live";

/**
 * Raum, den dieses Browserfenster gerade offen hat (Sitzungsspeicher des
 * Live-Raums). Nach 120 Minuten schließt der Server jeden Raum; ein älterer
 * Eintrag zählt dann nicht mehr. Wie viele Kinder dabei sind, weiß nur der
 * Server; das zeigt der Live-Raum selbst.
 */
export function readRunningRoom(now = Date.now()): StartRoom | null {
  const room = readTeacherLiveRoom();
  if (!room) return null;
  if (
    room.openedAt &&
    roomTimeState(new Date(room.openedAt), new Date(now)) === "closed"
  ) {
    return null;
  }
  return { code: room.code, href: LIVE_ROOM_HREF };
}

/** `readRunningRoom` als Zustand; liest neu bei Seitenwechsel und Rückkehr. */
export function useRunningRoom(pathname?: string): StartRoom | null {
  const [room, setRoom] = useState<StartRoom | null>(null);
  useEffect(() => {
    const update = () => {
      const next = readRunningRoom();
      setRoom((current) =>
        current?.code === next?.code && current?.href === next?.href
          ? current
          : next,
      );
    };
    update();
    const onVisible = () => {
      if (document.visibilityState === "visible") update();
    };
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [pathname]);
  return room;
}
