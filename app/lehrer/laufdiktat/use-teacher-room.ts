"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { endRoom, getRoomParticipants, getRoomState, getRoomStudents, openRoom, readSession, removeParticipant, updateSession, writeSession, type RoomConfig, type RoomStudentRow } from "../../lib/room-api";
import { isSupabaseConfigured, supabase } from "../../lib/supabase";

interface TeacherRoom { roomId: string; code: string; accessToken: string }
export type TeacherStatus = "idle" | "opening" | "lobby" | "live" | "ended";

const DEMO_NAMES = ["Fuchs", "Capybara", "Igel", "Koala", "Lama", "Orca", "Pfau", "Katze"];

/**
 * Lehrerseite eines Live-Raums: Raum öffnen, Presence verfolgen, Sitzung
 * starten, Fortschritt aus der DB lesen, Raum beenden. Protokoll identisch
 * mit useDashboardRoom im Laufdiktat.
 */
export function useTeacherRoom(onRestore?: (status: "lobby" | "live") => void) {
  const [room, setRoom] = useState<TeacherRoom | null>(null);
  const [status, setStatus] = useState<TeacherStatus>("idle");
  const [present, setPresent] = useState<Set<string>>(new Set());
  const [participants, setParticipants] = useState<{ studentKey: string; lastSeenAt: string | null }[]>([]);
  const [rows, setRows] = useState<RoomStudentRow[]>([]);
  const [error, setError] = useState("");
  const channelRef = useRef<RealtimeChannel | null>(null);
  const sessionRef = useRef<string>("");
  const configRef = useRef<RoomConfig | null>(null);
  const statusRef = useRef<TeacherStatus>("idle");
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => { statusRef.current = status; }, [status]);

  const refreshStudents = useCallback(async (r: TeacherRoom | null = room) => {
    if (!r || !isSupabaseConfigured) return;
    try {
      const all = await getRoomStudents(r.roomId, r.accessToken);
      setRows(sessionRef.current ? all.filter((x) => x.sessionId === sessionRef.current) : all);
    } catch (err) { setError((err as Error).message); }
  }, [room]);

  const refreshParticipants = useCallback(async (r: TeacherRoom | null = room) => {
    if (!r || !isSupabaseConfigured) return;
    try { setParticipants(await getRoomParticipants(r.roomId, r.accessToken)); } catch { /* nächster Durchlauf */ }
  }, [room]);

  const scheduleRefresh = useCallback(() => {
    clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => void refreshStudents(), 700);
  }, [refreshStudents]);

  // Kanal zum Raum
  useEffect(() => {
    if (!room || !isSupabaseConfigured) return;
    const channel = supabase().channel(`room-${room.code}`);
    channelRef.current = channel;
    channel
      .on("presence", { event: "sync" }, () => {
        setPresent(new Set(Object.keys(channel.presenceState())));
        void refreshParticipants(room);
      })
      .on("presence", { event: "join" }, ({ key }) => {
        // Später Beitretende bekommen gezielt den Start (keine ganze Klasse zurücksetzen).
        if (statusRef.current === "live") void channel.send({ type: "broadcast", event: "session-start", payload: { appVersion: configRef.current?.appVersion, targetStudent: key } });
      })
      .on("broadcast", { event: "student-finished" }, scheduleRefresh)
      .on("broadcast", { event: "student-progress" }, scheduleRefresh)
      .on("broadcast", { event: "update-station-state" }, scheduleRefresh)
      .subscribe();
    const poll = setInterval(() => { void refreshParticipants(room); if (statusRef.current === "live") void refreshStudents(room); }, 5000);
    return () => { clearInterval(poll); channelRef.current = null; void supabase().removeChannel(channel); };
  }, [room]); // eslint-disable-line react-hooks/exhaustive-deps

  // Nach Reload wiederherstellen
  useEffect(() => {
    const saved = readSession<TeacherRoom & { sessionId?: string }>("teacher");
    if (!saved || !isSupabaseConfigured) return;
    getRoomState(saved.roomId, { accessToken: saved.accessToken }).then((state) => {
      if (!state || state.status === "ended") { writeSession("teacher", null); return; }
      sessionRef.current = state.sessionId ?? "";
      configRef.current = state.config as RoomConfig;
      setRoom(saved);
      setStatus(state.status === "live" ? "live" : "lobby");
      onRestore?.(state.status === "live" ? "live" : "lobby");
      void refreshStudents(saved);
    }).catch(() => writeSession("teacher", null));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Demo ohne Server: simulierte Klasse
  useEffect(() => {
    if (isSupabaseConfigured || !room) return;
    const t = setInterval(() => {
      if (statusRef.current === "lobby") {
        setPresent((p) => (p.size >= DEMO_NAMES.length ? p : new Set([...p, DEMO_NAMES[p.size]])));
      } else if (statusRef.current === "live") {
        const total = configRef.current?.words.length ?? 6;
        setRows((prev) => {
          const base = prev.length ? prev : DEMO_NAMES.map((n) => ({ studentKey: n, sessionId: "demo", stationNumber: null, currentIndex: 0, peeks: 0, attempts: 0, errors: 0, finished: false, durationMs: null, wordErrors: {} as Record<string, number> }));
          return base.map((r) => {
            if (r.finished || Math.random() < 0.5) return r;
            const wrong = Math.random() < 0.25;
            const idx = wrong ? r.currentIndex : r.currentIndex + 1;
            const word = ["Hund", "Pilze", "Korb", "Wald", "Suppe"][Math.floor(Math.random() * 5)];
            return { ...r, currentIndex: idx, attempts: r.attempts + 1, errors: r.errors + (wrong ? 1 : 0), peeks: r.peeks + (Math.random() < 0.2 ? 1 : 0), finished: idx >= total, wordErrors: wrong ? { ...r.wordErrors, [word]: (r.wordErrors[word] ?? 0) + 1 } : r.wordErrors };
          });
        });
      }
    }, 1500);
    return () => clearInterval(t);
  }, [room]);

  const open = useCallback(async (config: Partial<RoomConfig>) => {
    setError("");
    if (!isSupabaseConfigured) {
      const demo = { roomId: "demo", code: String(1000 + Math.floor(Math.random() * 9000)), accessToken: "demo" };
      setRoom(demo); setStatus("lobby"); return demo;
    }
    setStatus("opening");
    try {
      const r = await openRoom(config);
      writeSession("teacher", r);
      setRoom(r);
      setStatus("lobby");
      return r;
    } catch (err) {
      setError((err as Error).message);
      setStatus("idle");
      return null;
    }
  }, []);

  const start = useCallback(async (config: RoomConfig) => {
    if (!room) return false;
    configRef.current = config;
    sessionRef.current = crypto.randomUUID();
    setRows([]);
    if (!isSupabaseConfigured) { setStatus("live"); return true; }
    try {
      await updateSession(room.roomId, room.accessToken, sessionRef.current, config);
    } catch (err) {
      setError(`Die Sitzung konnte nicht gestartet werden: ${(err as Error).message}`);
      return false;
    }
    await channelRef.current?.send({ type: "broadcast", event: "session-start", payload: { appVersion: config.appVersion } });
    writeSession("teacher", { ...room, sessionId: sessionRef.current });
    setStatus("live");
    return true;
  }, [room]);

  const end = useCallback(async () => {
    if (room && isSupabaseConfigured) {
      try { await refreshStudents(room); await endRoom(room.roomId, room.accessToken); } catch (err) { setError((err as Error).message); return false; }
      await channelRef.current?.send({ type: "broadcast", event: "session-ended", payload: {} });
    }
    writeSession("teacher", null);
    setStatus("ended");
    return true;
  }, [room, refreshStudents]);

  const reset = useCallback(() => { setRoom(null); setStatus("idle"); setRows([]); setPresent(new Set()); setParticipants([]); sessionRef.current = ""; }, []);

  const kick = useCallback(async (key: string) => {
    if (!room || !isSupabaseConfigured) return;
    try { await removeParticipant(room.roomId, room.accessToken, key); await refreshParticipants(room); } catch (err) { setError((err as Error).message); }
  }, [room, refreshParticipants]);

  return { room, status, present, participants, rows, error, demo: !isSupabaseConfigured, open, start, end, reset, kick };
}
