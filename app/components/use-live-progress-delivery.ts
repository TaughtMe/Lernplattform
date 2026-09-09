"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createProgressDelivery,
  type ProgressDeliveryStatus,
} from "../../src/integrations/laufdiktat/progress-delivery";
import {
  saveLiveProgress,
  type LiveProgress,
} from "../../src/integrations/laufdiktat/room-api";
import type { LiveRoomConfig } from "../../src/integrations/laufdiktat/live-room-client";

export function useLiveProgressDelivery(
  config: LiveRoomConfig | null,
  roomId: string | undefined,
  participantToken: string | undefined,
  studentName: string | undefined,
  sessionId: string | undefined,
) {
  const [status, setStatus] = useState<ProgressDeliveryStatus>("idle");
  const delivery = useRef<ReturnType<typeof createProgressDelivery> | null>(
    null,
  );
  useEffect(() => {
    if (!config || !roomId || !participantToken || !studentName || !sessionId)
      return;
    const active = createProgressDelivery(
      (progress) =>
        saveLiveProgress(
          config,
          { roomId, participantToken, studentName, sessionId },
          progress,
        ),
      setStatus,
    );
    delivery.current = active;
    const retry = () => active.retry();
    window.addEventListener("online", retry);
    return () => {
      active.dispose();
      delivery.current = null;
      window.removeEventListener("online", retry);
    };
  }, [config, roomId, participantToken, studentName, sessionId]);
  return {
    status,
    send: useCallback(
      (progress: LiveProgress) => delivery.current?.send(progress),
      [],
    ),
    retry: useCallback(() => delivery.current?.retry(), []),
  };
}
