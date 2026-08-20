"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { supabase } from "./supabase-client.ts";
import { getRoomState } from "./room-api.ts";
import { useParticipantHeartbeat } from "./use-participant-heartbeat.ts";
import type { SessionStartData } from "./types.ts";

interface UseGameRoomArgs {
  roomCode: string | undefined;
  studentName: string | undefined;
  roomId: string | undefined;
  participantToken: string | undefined;
  currentWordIndexRef: RefObject<number>;
  onSessionStart: (data: SessionStartData) => void;
  onSessionEnded: () => void;
}

/**
 * Student-side Supabase Realtime connection: subscribed channel, incoming
 * events (session start/end, roster progress) and the send functions.
 * Ported (trimmed of battle/station mode) from TaughtMe/Laufdiktat's
 * hooks/game/useGameRoom.ts.
 */
export function useGameRoom({
  roomCode,
  studentName,
  roomId,
  participantToken,
  currentWordIndexRef,
  onSessionStart,
  onSessionEnded,
}: UseGameRoomArgs) {
  const [connectionWarning, setConnectionWarning] = useState(false);
  const [presenceOk, setPresenceOk] = useState(false);
  const [roster, setRoster] = useState<Record<string, number>>({});
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const hasFetchedRoomStateRef = useRef(false);

  useEffect(() => {
    if (!roomCode || !roomId || !participantToken) return;
    hasFetchedRoomStateRef.current = false;

    // Broadcasts are only a fast hint, never the source of session truth.
    // State and config are read from the DB with the invisible participant
    // token — a forged session-start/-ended broadcast can neither inject
    // answers nor end a session.
    const syncAuthoritativeRoomState = async () => {
      try {
        const room = await getRoomState(roomId, { participantToken });
        hasFetchedRoomStateRef.current = true;
        if (room?.status === "live" && room.sessionId) {
          onSessionStart({ ...(room.config as unknown as SessionStartData), sessionId: room.sessionId });
        } else if (room?.status === "ended") {
          onSessionEnded();
        }
      } catch {
        // transient — the next broadcast or reconnect retries this
      }
    };

    const channel = supabase.channel(
      `room-${roomCode}`,
      studentName ? { config: { presence: { key: studentName } } } : undefined,
    );
    channelRef.current = channel;

    const trackPresence = async (): Promise<void> => {
      if (!studentName) return;
      for (let attempt = 1; attempt <= 5; attempt++) {
        if (channelRef.current !== channel) return;
        const result = await channel.track({ name: studentName });
        if (result === "ok") {
          setPresenceOk(true);
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      }
      setPresenceOk(false);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      if (channel.state === "joined") {
        void trackPresence();
      } else {
        supabase.realtime.connect();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    channel
      .on("presence", { event: "sync" }, () => {
        const present = new Set(Object.keys(channel.presenceState()));
        setRoster((prev) => {
          const entries = Object.entries(prev).filter(([name]) => present.has(name));
          return entries.length === Object.keys(prev).length ? prev : Object.fromEntries(entries);
        });
      })
      .on("broadcast", { event: "session-start" }, () => {
        void syncAuthoritativeRoomState();
      })
      .on("broadcast", { event: "session-ended" }, () => {
        void syncAuthoritativeRoomState();
      })
      .on("broadcast", { event: "student-progress" }, (payload) => {
        const { name, index } = payload.payload;
        if (typeof name === "string" && typeof index === "number" && index >= 0 && index <= 10000 && name !== studentName) {
          setRoster((prev) => ({ ...prev, [name]: index }));
        }
      })
      .on("broadcast", { event: "request-progress" }, () => {
        if (studentName) {
          channel.send({
            type: "broadcast",
            event: "student-progress",
            payload: { name: studentName, index: currentWordIndexRef.current },
          });
        }
      })
      .subscribe(async (status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setConnectionWarning(true);
          setPresenceOk(false);
        } else if (status === "CLOSED") {
          setPresenceOk(false);
        } else if (status === "SUBSCRIBED") {
          setConnectionWarning(false);
          if (studentName) {
            await trackPresence();
            await channel.send({
              type: "broadcast",
              event: "student-progress",
              payload: { name: studentName, index: currentWordIndexRef.current },
            });
            await channel.send({ type: "broadcast", event: "request-progress", payload: {} });
          }
          if (!hasFetchedRoomStateRef.current) {
            await syncAuthoritativeRoomState();
          }
        }
      });

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      channelRef.current = null;
      setPresenceOk(false);
      supabase.removeChannel(channel);
    };
  }, [roomCode, studentName, roomId, participantToken, currentWordIndexRef, onSessionStart, onSessionEnded]);

  useParticipantHeartbeat(roomId, participantToken);

  const sendProgress = useCallback(
    (index: number) => {
      if (studentName) {
        channelRef.current?.send({
          type: "broadcast",
          event: "student-progress",
          payload: { name: studentName, index },
        });
      }
    },
    [studentName],
  );

  const sendFinished = useCallback((payload: Record<string, unknown>) => {
    channelRef.current?.send({ type: "broadcast", event: "student-finished", payload });
  }, []);

  return { connectionWarning, presenceOk, roster, sendProgress, sendFinished };
}
