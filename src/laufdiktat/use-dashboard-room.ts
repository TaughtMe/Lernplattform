"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { supabase } from "./supabase-client.ts";
import { APP_VERSION } from "./app-version.ts";
import {
  openRoom,
  updateSession,
  endRoom,
  getRoomState,
  getRoomStudents,
  getRoomParticipants,
  removeRoomParticipant,
  type RoomStudentRow,
  type RoomParticipantRow,
} from "./room-api.ts";
import { ONLINE_THRESHOLD_MS, PARTICIPANTS_POLL_MS } from "./presence-config.ts";
import { createDebounced, type Debounced } from "./debounce.ts";
import { saveDashboardRoomSession, readDashboardRoomSession, clearDashboardRoomSession } from "./dashboard-room-session.ts";
import type { BattleOptions, GameMode, RoomConfig, StationStudentState, WordItem } from "./types.ts";

export interface StudentResult {
  name: string;
  peeks: number;
  attempts: number;
  errors: number;
  durationMs?: number;
  wordErrors?: Record<string, number>;
}

export type DashboardStep = "IMPORT" | "SETTINGS" | "LOBBY" | "LIVE";

const resultsFromStudents = (students: RoomStudentRow[]): StudentResult[] =>
  students
    .filter((s) => s.finished)
    .map((s) => ({
      name: s.studentKey,
      peeks: s.peeks,
      attempts: s.attempts,
      errors: s.errors,
      durationMs: s.durationMs ?? undefined,
      wordErrors: s.wordErrors,
    }));

const stationStatesFromStudents = (students: RoomStudentRow[]): Map<number, StationStudentState> => {
  const map = new Map<number, StationStudentState>();
  for (const s of students) {
    if (s.stationNumber != null) {
      map.set(s.stationNumber, { currentIndex: s.currentIndex, peeks: s.peeks, finished: s.finished });
    }
  }
  return map;
};

interface UseDashboardRoomArgs {
  stepRef: RefObject<DashboardStep>;
  setCurrentStep: (step: DashboardStep) => void;
  words: WordItem[];
  gameMode: GameMode;
  battleOptions: BattleOptions;
  stationMode: boolean;
  stationCount: number;
  uebungMaxAttempts: number;
  showStars: boolean;
  shuffleWords: boolean;
  strictTypingMode: boolean;
  clearWords: () => void;
}

/**
 * Teacher-side Supabase Realtime connection: subscribed channel, live student
 * state, and the open lobby / start session / end session actions. Ported
 * (trimmed of battle/station mode) from TaughtMe/Laufdiktat's
 * hooks/dashboard/useDashboardRoom.ts.
 */
export function useDashboardRoom({
  stepRef,
  setCurrentStep,
  words,
  gameMode,
  battleOptions,
  stationMode,
  stationCount,
  uebungMaxAttempts,
  showStars,
  shuffleWords,
  strictTypingMode,
  clearWords,
}: UseDashboardRoomArgs) {
  const [roomCode, setRoomCode] = useState("");
  const [openLobbyError, setOpenLobbyError] = useState<string | null>(null);
  const [results, setResults] = useState<StudentResult[]>([]);
  const [presentKeys, setPresentKeys] = useState<Set<string>>(new Set());
  const [participants, setParticipants] = useState<RoomParticipantRow[]>([]);
  const [connectionWarning, setConnectionWarning] = useState(false);
  const [liveProgress, setLiveProgress] = useState<Record<string, number>>({});
  const [stationStates, setStationStates] = useState<Map<number, StationStudentState>>(new Map());
  const stationStatesRef = useRef<Map<number, StationStudentState>>(new Map());
  const [nowTs, setNowTs] = useState(() => Date.now());

  useEffect(() => {
    stationStatesRef.current = stationStates;
  }, [stationStates]);

  const registeredStudents = useMemo(() => participants.map((p) => p.studentKey), [participants]);

  const connectedStudents = useMemo(() => {
    const freshSince = nowTs - ONLINE_THRESHOLD_MS;
    const online = new Set(presentKeys);
    for (const p of participants) {
      if (p.lastSeenAt && new Date(p.lastSeenAt).getTime() >= freshSince) {
        online.add(p.studentKey);
      }
    }
    return [...online];
  }, [presentKeys, participants, nowTs]);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const sessionIdRef = useRef<string>("");
  const roomIdRef = useRef<string>("");
  const accessTokenRef = useRef<string>("");

  const applyAuthoritativeStudents = (students: RoomStudentRow[]) => {
    const currentStudents = sessionIdRef.current ? students.filter((s) => s.sessionId === sessionIdRef.current) : students;
    setResults(resultsFromStudents(currentStudents));
    setStationStates(stationStatesFromStudents(currentStudents));
    setLiveProgress((prev) => ({
      ...prev,
      ...Object.fromEntries(currentStudents.map((s) => [s.studentKey, s.currentIndex])),
    }));
  };

  const refreshAuthoritativeStudents = async (): Promise<void> => {
    if (!roomIdRef.current || !accessTokenRef.current) return;
    const students = await getRoomStudents(roomIdRef.current, accessTokenRef.current);
    applyAuthoritativeStudents(students);
  };

  const refreshParticipants = async (): Promise<void> => {
    if (!roomIdRef.current || !accessTokenRef.current) return;
    const rows = await getRoomParticipants(roomIdRef.current, accessTokenRef.current);
    setParticipants(rows);
  };

  const participantsRefreshRef = useRef<Debounced | null>(null);
  const studentsRefreshRef = useRef<Debounced | null>(null);
  useEffect(() => {
    participantsRefreshRef.current = createDebounced(() => {
      refreshParticipants().catch(() => {});
    }, { delayMs: 300, maxWaitMs: 2000 });
    studentsRefreshRef.current = createDebounced(() => {
      refreshAuthoritativeStudents().catch(() => {});
    }, { delayMs: 300, maxWaitMs: 2000 });
    return () => {
      participantsRefreshRef.current?.cancel();
      studentsRefreshRef.current?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const scheduleParticipantsRefresh = () => participantsRefreshRef.current?.schedule();
  const scheduleAuthoritativeRefresh = () => studentsRefreshRef.current?.schedule();

  const handleRemoveStudent = async (studentKey: string) => {
    if (!roomIdRef.current || !accessTokenRef.current) return;
    await removeRoomParticipant(roomIdRef.current, accessTokenRef.current, studentKey);
    setParticipants((prev) => prev.filter((p) => p.studentKey !== studentKey));
    setPresentKeys((prev) => {
      if (!prev.has(studentKey)) return prev;
      const next = new Set(prev);
      next.delete(studentKey);
      return next;
    });
    setLiveProgress((prev) => {
      const next = { ...prev };
      delete next[studentKey];
      return next;
    });
  };

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      if (!channelRef.current) return;
      if (channelRef.current.state !== "joined") supabase.realtime.connect();
      scheduleAuthoritativeRefresh();
      scheduleParticipantsRefresh();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  useEffect(() => {
    if (!roomCode) return;
    const poll = () => {
      if (document.visibilityState !== "visible") return;
      setNowTs(Date.now());
      refreshParticipants().catch(() => {});
      refreshAuthoritativeStudents().catch(() => {});
    };
    const intervalId = setInterval(poll, PARTICIPANTS_POLL_MS);
    document.addEventListener("visibilitychange", poll);
    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", poll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode]);

  const attachChannel = (code: string) => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    const channel = supabase.channel(`room-${code}`);
    channelRef.current = channel;

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<{ name: string }>();
      setPresentKeys(new Set(Object.keys(state)));
      scheduleParticipantsRefresh();
    });

    channel.on("presence", { event: "join" }, ({ key }) => {
      if (stepRef.current === "LIVE") {
        // A later join/reconnect within the same session -> same sessionId,
        // targeted only at this one student, so a single reconnect doesn't
        // reset everyone else's already-running or already-finished progress.
        channel.send({
          type: "broadcast",
          event: "session-start",
          payload: { appVersion: APP_VERSION, targetStudent: key },
        });
      }
    });

    channel.on("broadcast", { event: "student-finished" }, () => scheduleAuthoritativeRefresh());
    channel.on("broadcast", { event: "student-progress" }, () => scheduleAuthoritativeRefresh());

    // Station mode: a station tablet joining asks whether the dashboard
    // already has a progress state for its number (e.g. the dashboard
    // reloaded mid-session); if so, it's told to fetch it from the DB.
    channel.on("broadcast", { event: "request-station-state" }, (payload) => {
      const { studentNumber } = payload.payload as { studentNumber: number };
      if (stationStatesRef.current.get(studentNumber)) {
        channel.send({ type: "broadcast", event: "sync-station-state", payload: { studentNumber } });
        return;
      }
      refreshAuthoritativeStudents()
        .then(() => channel.send({ type: "broadcast", event: "sync-station-state", payload: { studentNumber } }))
        .catch(() => {});
    });
    channel.on("broadcast", { event: "update-station-state" }, (payload) => {
      const { studentNumber } = payload.payload as { studentNumber: number };
      if (typeof studentNumber === "number") scheduleAuthoritativeRefresh();
    });

    return channel;
  };

  // Once on mount, try to restore a previously open room after a dashboard reload.
  useEffect(() => {
    const saved = readDashboardRoomSession();
    if (!saved) return;
    (async () => {
      let room;
      try {
        room = await getRoomState(saved.roomId, { accessToken: saved.accessToken });
      } catch {
        clearDashboardRoomSession();
        return;
      }
      if (!room || room.status === "ended") {
        clearDashboardRoomSession();
        return;
      }
      roomIdRef.current = saved.roomId;
      accessTokenRef.current = saved.accessToken;
      if (room.sessionId) sessionIdRef.current = room.sessionId;
      setRoomCode(saved.roomCode);

      try {
        const students = await getRoomStudents(saved.roomId, saved.accessToken);
        applyAuthoritativeStudents(students);
      } catch {
        // not fatal — the next broadcast fills in details
      }
      refreshParticipants().catch(() => {});

      const channel = attachChannel(saved.roomCode);
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setConnectionWarning(false);
          setCurrentStep(room.status === "live" ? "LIVE" : "LOBBY");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setConnectionWarning(true);
        }
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenLobby = async (wordsOverride?: WordItem[]) => {
    if ((wordsOverride ?? words).length === 0) return;
    setOpenLobbyError(null);
    setPresentKeys(new Set());
    setParticipants([]);

    let room;
    try {
      room = await openRoom({});
    } catch {
      setOpenLobbyError("Der Raum konnte nicht angelegt werden. Bitte Internetverbindung prüfen und erneut versuchen.");
      return;
    }
    roomIdRef.current = room.roomId;
    accessTokenRef.current = room.accessToken;
    setRoomCode(room.code);
    saveDashboardRoomSession({ roomId: room.roomId, accessToken: room.accessToken, roomCode: room.code });

    const channel = attachChannel(room.code);
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setConnectionWarning(false);
        setCurrentStep("LOBBY");
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        setConnectionWarning(true);
      }
    });
  };

  const handleStartSession = async () => {
    if (!channelRef.current) await handleOpenLobby();
    if (!channelRef.current || !roomIdRef.current) return;

    sessionIdRef.current = crypto.randomUUID();
    const config: RoomConfig = {
      words,
      gameMode,
      battleOptions,
      stationMode,
      // Station numbers have a fixed spatial mapping to the word at that
      // station, so never shuffle in station mode.
      stationCount,
      uebungMaxAttempts,
      showStars,
      shuffleWords: stationMode ? false : shuffleWords,
      strictTypingMode,
      appVersion: APP_VERSION,
    };
    try {
      await updateSession(roomIdRef.current, accessTokenRef.current, sessionIdRef.current, config);
    } catch {
      setOpenLobbyError("Die Sitzung konnte serverseitig nicht gestartet werden. Bitte Internetverbindung prüfen und erneut versuchen.");
      return;
    }

    await channelRef.current.send({
      type: "broadcast",
      event: "session-start",
      payload: { appVersion: APP_VERSION },
    });
    setCurrentStep("LIVE");
  };

  const handleEndSession = async () => {
    if (roomIdRef.current) {
      try {
        await endRoom(roomIdRef.current, accessTokenRef.current);
      } catch {
        setOpenLobbyError("Der Raum konnte serverseitig nicht beendet werden. Bitte Internetverbindung prüfen und erneut versuchen.");
        return;
      }
    }
    if (channelRef.current) {
      await channelRef.current.send({ type: "broadcast", event: "session-ended" });
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setCurrentStep("IMPORT");
    clearWords();
    setResults([]);
    setPresentKeys(new Set());
    setParticipants([]);
    setLiveProgress({});
    setStationStates(new Map());
    setRoomCode("");
    roomIdRef.current = "";
    accessTokenRef.current = "";
    sessionIdRef.current = "";
    clearDashboardRoomSession();
  };

  return {
    roomCode,
    openLobbyError,
    results,
    connectedStudents,
    registeredStudents,
    connectionWarning,
    liveProgress,
    stationStates,
    handleOpenLobby,
    handleStartSession,
    handleEndSession,
    handleRemoveStudent,
  };
}
