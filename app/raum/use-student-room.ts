"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { sectionsToWords, splitSections } from "@/src/domain/dictation";
import { APP_VERSION, getRoomState, joinRoom, readSession, touchParticipant, writeSession, type RoomConfig } from "../lib/room-api";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

export type AttackType = "ink" | "flicker";
export type RoomPhase = "joining" | "notfound" | "error" | "lobby" | "live" | "ended";

export const DEMO_TEXT = "Der Hund bellt laut im Hof. Die Katze schläft auf dem Sofa. Am Abend gehen wir in den Wald. Dort finden wir einen Korb voller Pilze. Mein Vater trägt ihn nach Hause. Wir kochen daraus eine Suppe.";

export function demoConfig(mode: RoomConfig["gameMode"] = "LAUFDIKTAT", station = false): RoomConfig {
  return {
    words: sectionsToWords(splitSections(DEMO_TEXT, "satz")), gameMode: mode, battleOptions: { ink: true, flicker: true },
    stationMode: station, stationCount: 20, isTtsEnabled: true, uebungMaxAttempts: 3, showStars: true, shuffleWords: false,
    strictTypingMode: true, appVersion: APP_VERSION, transfer: "fehler", title: "Demo-Diktat", className: "Demo",
  };
}

interface Stored { roomId: string; participantToken: string; name: string }

const DEMO_CONFIG = demoConfig();

/**
 * Schülerseite eines Live-Raums. Die Datenbank (get_room_state_secure) ist die
 * Wahrheit; Realtime-Broadcasts sind nur Weckrufe. Ohne Supabase-Konfiguration
 * startet ein lokaler Demo-Raum.
 */
export function useStudentRoom(code: string | null, animalName: string, onAttack: (type: AttackType) => void) {
  const [phase, setPhase] = useState<RoomPhase>("joining");
  const [error, setError] = useState("");
  const [config, setConfig] = useState<RoomConfig | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [me, setMe] = useState<Stored | null>(null);
  const [roster, setRoster] = useState<Record<string, number>>({});
  const [connectionWarning, setConnectionWarning] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const indexRef = useRef(0);
  const attackRef = useRef(onAttack);
  useEffect(() => { attackRef.current = onAttack; }, [onAttack]);

  // Beitritt
  useEffect(() => {
    if (!code || !isSupabaseConfigured) return;
    let cancelled = false;
    const stored = readSession<Stored>(`join:${code}`);
    joinRoom(code, stored?.name ?? animalName, stored?.participantToken)
      .then((joined) => {
        if (cancelled) return;
        if (!joined) { setPhase("notfound"); return; }
        const value = { roomId: joined.roomId, participantToken: joined.participantToken, name: joined.studentName };
        writeSession(`join:${code}`, value);
        setMe(value);
        setPhase(joined.status === "ended" ? "ended" : joined.status === "live" ? "live" : "lobby");
      })
      .catch((err: Error) => { if (!cancelled) { setError(err.message); setPhase("error"); } });
    return () => { cancelled = true; };
  }, [code, animalName]);

  const syncState = useCallback(async () => {
    if (!me || me.roomId === "demo") return;
    try {
      const room = await getRoomState(me.roomId, { participantToken: me.participantToken });
      if (!room) return;
      if (room.status === "live" && room.sessionId) {
        setConfig(room.config as RoomConfig);
        setSessionId(room.sessionId);
        setPhase("live");
      } else if (room.status === "ended") {
        setPhase("ended");
      } else {
        setPhase("lobby");
      }
    } catch {
      setConnectionWarning(true);
    }
  }, [me]);

  // Realtime-Kanal, Presence und Heartbeat
  useEffect(() => {
    if (!code || !me || me.roomId === "demo") return;
    const channel = supabase().channel(`room-${code}`, { config: { presence: { key: me.name } } });
    channelRef.current = channel;
    channel
      .on("presence", { event: "sync" }, () => {
        const present = new Set(Object.keys(channel.presenceState()));
        setRoster((prev) => Object.fromEntries(Object.entries(prev).filter(([n]) => present.has(n))));
      })
      .on("broadcast", { event: "session-start" }, (msg) => {
        const target = (msg.payload as { targetStudent?: string } | undefined)?.targetStudent;
        if (!target || target === me.name) void syncState();
      })
      .on("broadcast", { event: "session-ended" }, () => void syncState())
      .on("broadcast", { event: "student-progress" }, (msg) => {
        const { name, index } = (msg.payload ?? {}) as { name?: unknown; index?: unknown };
        if (typeof name === "string" && typeof index === "number" && index >= 0 && index <= 10000 && name !== me.name) setRoster((p) => ({ ...p, [name]: index }));
      })
      .on("broadcast", { event: "request-progress" }, () => {
        void channel.send({ type: "broadcast", event: "student-progress", payload: { name: me.name, index: indexRef.current } });
      })
      .on("broadcast", { event: "attack" }, (msg) => {
        const { to, type } = (msg.payload ?? {}) as { to?: string; type?: AttackType };
        if (to === me.name && (type === "ink" || type === "flicker")) attackRef.current(type);
      })
      .subscribe(async (status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setConnectionWarning(true);
        if (status === "SUBSCRIBED") {
          setConnectionWarning(false);
          for (let attempt = 1; attempt <= 5; attempt++) {
            if (channelRef.current !== channel) return;
            if ((await channel.track({ name: me.name, appVersion: APP_VERSION })) === "ok") break;
            await new Promise((r) => setTimeout(r, 500 * attempt));
          }
          await channel.send({ type: "broadcast", event: "student-progress", payload: { name: me.name, index: indexRef.current } });
          await channel.send({ type: "broadcast", event: "request-progress", payload: {} });
          await syncState();
        }
      });

    const heartbeat = setInterval(() => { void touchParticipant(me.roomId, me.participantToken).catch(() => undefined); }, 20_000);
    void touchParticipant(me.roomId, me.participantToken).catch(() => undefined);
    // Fallback, falls ein Broadcast verpasst wird (z. B. Bildschirmsperre).
    const poll = setInterval(() => { void syncState(); }, 15_000);
    const onVisible = () => { if (document.visibilityState === "visible") { void syncState(); if (channel.state !== "joined") supabase().realtime.connect(); } };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(heartbeat);
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      channelRef.current = null;
      void supabase().removeChannel(channel);
    };
  }, [code, me, syncState]);

  const sendProgress = useCallback((index: number) => {
    indexRef.current = index;
    if (me) void channelRef.current?.send({ type: "broadcast", event: "student-progress", payload: { name: me.name, index } });
  }, [me]);

  const sendFinished = useCallback((payload: Record<string, unknown>) => {
    void channelRef.current?.send({ type: "broadcast", event: "student-finished", payload });
  }, []);

  const sendAttack = useCallback((to: string, type: AttackType) => {
    if (!me) return false;
    void channelRef.current?.send({ type: "broadcast", event: "attack", payload: { from: me.name, to, type } });
    return !!channelRef.current;
  }, [me]);

  const leave = useCallback(() => { if (code) writeSession(`join:${code}`, null); }, [code]);

  if (!isSupabaseConfigured) {
    // Demo ohne Server: lokaler Raum mit Beispieltext.
    return { phase: "live" as RoomPhase, error, config: DEMO_CONFIG, sessionId: "demo", me: { roomId: "demo", participantToken: "demo", name: animalName }, roster, connectionWarning, demo: true, sendProgress, sendFinished, sendAttack, leave };
  }
  return { phase, error, config, sessionId, me, roster, connectionWarning, demo: false, sendProgress, sendFinished, sendAttack, leave };
}
