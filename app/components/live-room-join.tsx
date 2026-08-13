"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { extractJoinCode, normalizeJoinCode } from "../../src/domain/join-code";
import {
  getLiveRoomClient,
  type LiveRoomConfig,
} from "../../src/integrations/laufdiktat/live-room-client";
import {
  getLiveProgress,
  getLiveRoomState,
  joinLiveRoom,
  readLiveRoomIdentity,
  saveLiveProgress,
  saveLiveRoomIdentity,
  touchLiveParticipant,
  type LiveProgress,
  type JoinedLiveRoom,
} from "../../src/integrations/laufdiktat/room-api";
import {
  parseLiveSession,
  type LiveSession,
} from "../../src/integrations/laufdiktat/live-session";
import { LiveRunningDictationGame } from "./live-running-dictation-game";
import { QrCodeScanner } from "./qr-code-scanner";
import { SegmentedRoomCode } from "./segmented-room-code";

type View = "join" | "connecting" | "lobby" | "starting" | "game";

type LiveRoomJoinProps = {
  initialCode?: string;
  liveRoomConfig: LiveRoomConfig | null;
};

export function LiveRoomJoin({
  initialCode = "",
  liveRoomConfig,
}: LiveRoomJoinProps) {
  const [code, setCode] = useState(() =>
    normalizeJoinCode(initialCode).replace(/\D/g, "").slice(0, 4),
  );
  const [name, setName] = useState("");
  const [view, setView] = useState<View>("join");
  const [error, setError] = useState("");
  const [connectionWarning, setConnectionWarning] = useState("");
  const [room, setRoom] = useState<JoinedLiveRoom | null>(null);
  const [session, setSession] = useState<LiveSession | null>(null);
  const [initialProgress, setInitialProgress] = useState<LiveProgress | null>(
    null,
  );
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!room || !liveRoomConfig) return;
    const activeRoom = room;
    const activeConfig = liveRoomConfig;

    const client = getLiveRoomClient(activeConfig);
    const channel = client.channel(`room-${code}`, {
      config: { presence: { key: activeRoom.studentName } },
    });
    channelRef.current = channel;

    async function syncAuthorizedRoomState() {
      try {
        const state = await getLiveRoomState(
          activeConfig,
          activeRoom.roomId,
          activeRoom.participantToken,
        );
        if (!state || state.status === "ended") {
          setSession(null);
          setRoom(null);
          setView("join");
          setError("Der Raum wurde beendet.");
          return;
        }
        if (state.status === "live" && state.sessionId) {
          const nextSession = parseLiveSession(
            state.config,
            state.sessionId,
            `${code}:${activeRoom.studentName}:${state.sessionId}`,
          );
          const progress = await getLiveProgress(activeConfig, {
            roomId: activeRoom.roomId,
            sessionId: state.sessionId,
            participantToken: activeRoom.participantToken,
            studentName: activeRoom.studentName,
          });
          setInitialProgress(progress);
          setSession(nextSession);
          setView("game");
        }
      } catch {
        setConnectionWarning(
          "Die Sitzungsdaten konnten gerade nicht sicher geladen werden.",
        );
      }
    }

    channel
      .on("broadcast", { event: "session-start" }, () => {
        setView("starting");
        void syncAuthorizedRoomState();
      })
      .on("broadcast", { event: "session-ended" }, () => {
        void syncAuthorizedRoomState();
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          const presence = await channel.track({
            name: activeRoom.studentName,
          });
          setConnectionWarning(
            presence === "ok"
              ? ""
              : "Du bist verbunden, aber noch nicht in der Teilnehmerliste sichtbar.",
          );
          await syncAuthorizedRoomState();
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setConnectionWarning(
            "Die Verbindung zur Unterrichtsrunde wurde unterbrochen.",
          );
        }
      });

    return () => {
      channelRef.current = null;
      void client.removeChannel(channel);
    };
  }, [code, liveRoomConfig, room]);

  useEffect(() => {
    if (!room || !liveRoomConfig) return;
    const activeRoom = room;
    const activeConfig = liveRoomConfig;
    let cancelled = false;
    const beat = () => {
      if (cancelled || document.visibilityState !== "visible") return;
      void touchLiveParticipant(
        activeConfig,
        activeRoom.roomId,
        activeRoom.participantToken,
      ).catch(() => undefined);
    };
    beat();
    const interval = window.setInterval(beat, 15_000);
    document.addEventListener("visibilitychange", beat);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", beat);
    };
  }, [liveRoomConfig, room]);

  const reportProgress = useCallback(
    (progress: LiveProgress) => {
      if (!liveRoomConfig || !room || !session) return;
      void saveLiveProgress(
        liveRoomConfig,
        {
          roomId: room.roomId,
          sessionId: session.sessionId,
          participantToken: room.participantToken,
          studentName: room.studentName,
        },
        progress,
      ).catch(() => {
        setConnectionWarning(
          "Dein Fortschritt konnte gerade nicht an die Lehrkraft zurückgegeben werden.",
        );
      });
      void channelRef.current?.send({
        type: "broadcast",
        event: progress.finished ? "student-finished" : "student-progress",
        payload: progress.finished
          ? { name: room.studentName, ...progress }
          : { name: room.studentName, index: progress.currentIndex },
      });
    },
    [liveRoomConfig, room, session],
  );

  function useScan(value: string) {
    const scanned = extractJoinCode(value).replace(/\D/g, "").slice(0, 4);
    setCode(scanned);
    setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedCode = code.replace(/\D/g, "").slice(0, 4);
    const normalizedName = name.trim().replace(/\s+/g, " ").slice(0, 32);
    if (!/^\d{4}$/.test(normalizedCode)) {
      setError("Bitte gib den vierstelligen Raumcode ein.");
      return;
    }
    if (normalizedName.length < 2) {
      setError("Bitte gib deinen Namen ein.");
      return;
    }
    if (!liveRoomConfig) {
      setError(
        "Live-Räume sind in dieser lokalen Vorschau noch nicht mit dem Laufdiktat-Raumdienst verbunden.",
      );
      return;
    }

    setView("connecting");
    setError("");
    try {
      const identity = readLiveRoomIdentity(normalizedCode);
      const joined = await joinLiveRoom(
        liveRoomConfig,
        normalizedCode,
        normalizedName,
        identity?.participantToken,
      );
      if (!joined || joined.status === "ended") {
        setView("join");
        setError("Dieser Raum ist nicht verfügbar oder wurde bereits beendet.");
        return;
      }
      saveLiveRoomIdentity({
        code: normalizedCode,
        name: joined.studentName,
        participantToken: joined.participantToken,
      });
      setCode(normalizedCode);
      setName(joined.studentName);
      setRoom(joined);
      setView(joined.status === "live" ? "starting" : "lobby");
    } catch {
      setView("join");
      setError("Der Raum konnte nicht erreicht werden. Bitte prüfe den Code.");
    }
  }

  if (view === "game" && room && session) {
    return (
      <LiveRunningDictationGame
        key={session.sessionId}
        code={code}
        studentName={room.studentName}
        session={session}
        connectionWarning={connectionWarning}
        initialProgress={initialProgress}
        onProgress={reportProgress}
      />
    );
  }

  if (view === "lobby" || view === "starting") {
    return (
      <main className="live-room-page">
        <section className="live-room-state" aria-live="polite">
          <span className="live-room-state__mark" aria-hidden="true">
            {view === "lobby" ? "✓" : "→"}
          </span>
          <p className="eyebrow">Raum {code}</p>
          <h1>
            {view === "lobby"
              ? `Du bist dabei, ${room?.studentName}.`
              : "Das Laufdiktat startet."}
          </h1>
          <p>
            {view === "lobby"
              ? "Warte kurz, bis die Lehrkraft die Runde startet."
              : "Die Übung wird im Lernraum vorbereitet."}
          </p>
          {connectionWarning ? (
            <p className="live-game-warning" role="status">
              {connectionWarning}
            </p>
          ) : null}
        </section>
      </main>
    );
  }

  return (
    <main className="live-room-page">
      <section className="live-room-join" aria-labelledby="live-room-title">
        <p className="eyebrow">Laufdiktat</p>
        <h1 id="live-room-title">Raum beitreten</h1>
        <p className="live-room-join__intro">
          Gib den Code von der Tafel ein oder scanne den QR-Code.
        </p>
        <form onSubmit={submit} noValidate>
          <span id="live-room-code-label" className="room-code__label">
            Raumcode
          </span>
          <div className="live-room-code-row">
            <SegmentedRoomCode
              idPrefix="live-room"
              labelId="live-room-code-label"
              value={code}
              invalid={Boolean(error)}
              describedBy={error ? "live-room-error" : undefined}
              onChange={(value) => {
                setCode(value);
                setError("");
              }}
            />
            <QrCodeScanner onResult={useScan} />
          </div>
          <label htmlFor="live-room-name">Dein Name</label>
          <input
            id="live-room-name"
            className="live-room-name-input"
            autoComplete="name"
            maxLength={32}
            placeholder="Vorname oder Klassenname"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError("");
            }}
          />
          {error ? (
            <p id="live-room-error" className="live-room-error" role="alert">
              {error}
            </p>
          ) : null}
          <button className="button button--primary" type="submit">
            {view === "connecting"
              ? "Verbindung wird aufgebaut …"
              : "Beitreten"}
          </button>
        </form>
      </section>
    </main>
  );
}
