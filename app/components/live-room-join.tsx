"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import Link from "next/link";
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
import { AnimalAvatar } from "./animal-avatar";
import { LiveRunningDictationGame } from "./live-running-dictation-game";
import { QrCodeScanner } from "./qr-code-scanner";
import { SegmentedRoomCode } from "./segmented-room-code";
import { useHydrated } from "./use-hydrated";

type View = "join" | "connecting" | "lobby" | "starting" | "game" | "ended";
type AttackType = "ink" | "flicker";

// Wie im eigenständigen Laufdiktat: Schüler bekommen einen zufälligen
// Adjektiv+Tier-Namen zugewiesen (per Würfel neu generierbar) statt einen
// eigenen Namen einzutippen – dadurch bleibt der Beitritt anonym und der
// Avatar (siehe animal-avatar.tsx) ist immer eindeutig aus dem Namen ableitbar.
const ADJECTIVES = [
  "Schnell",
  "Flink",
  "Schlau",
  "Mutig",
  "Wild",
  "Kühn",
  "Listig",
  "Stark",
  "Frech",
];
const ANIMALS: Array<{ name: string; g: "m" | "f" | "n" }> = [
  { name: "Koala", g: "m" },
  { name: "Fledermaus", g: "f" },
  { name: "Kamel", g: "n" },
  { name: "Igel", g: "m" },
  { name: "Capybara", g: "n" },
  { name: "Eichhörnchen", g: "n" },
  { name: "Elefant", g: "m" },
  { name: "Qualle", g: "f" },
  { name: "Tiefseefisch", g: "m" },
  { name: "Clownfisch", g: "m" },
  { name: "Schwein", g: "n" },
  { name: "Ente", g: "f" },
  { name: "Phönix", g: "m" },
  { name: "Kiwi", g: "m" },
  { name: "Roter Panda", g: "m" },
  { name: "Giraffe", g: "f" },
  { name: "Löwin", g: "f" },
  { name: "Einhorn", g: "n" },
  { name: "Orca", g: "m" },
  { name: "Schildkröte", g: "f" },
  { name: "Pfau", g: "m" },
  { name: "Hund", g: "m" },
  { name: "Affe", g: "m" },
  { name: "Gorilla", g: "m" },
  { name: "Fuchs", g: "m" },
  { name: "Katze", g: "f" },
  { name: "Sphynx-Katze", g: "f" },
  { name: "Lama", g: "n" },
  { name: "Yak", g: "n" },
  { name: "Kobra", g: "f" },
  { name: "Krokodil", g: "n" },
  { name: "Zebra", g: "n" },
  { name: "Flamingo", g: "m" },
  { name: "Oktopus", g: "m" },
  { name: "Chamäleon", g: "n" },
  { name: "Hirsch", g: "m" },
  { name: "Pelikan", g: "m" },
  { name: "Erdmännchen", g: "n" },
  { name: "Käfer", g: "m" },
  { name: "Heuschrecke", g: "f" },
  { name: "Schnabeltier", g: "n" },
  { name: "Mistkäfer", g: "m" },
  { name: "Krabbe", g: "f" },
  { name: "Mammut", g: "n" },
  { name: "Kaninchen", g: "n" },
  { name: "Truthahn", g: "m" },
  { name: "Gottesanbeterin", g: "f" },
  { name: "Esel", g: "m" },
  { name: "Robbe", g: "f" },
  { name: "Strauß", g: "m" },
  { name: "Taube", g: "f" },
  { name: "Gepard", g: "m" },
  { name: "Schmetterling", g: "m" },
  { name: "Libelle", g: "f" },
  { name: "Pudel", g: "m" },
  { name: "Bobtail", g: "m" },
  { name: "Mops", g: "m" },
  { name: "Schäferhund", g: "m" },
  { name: "Collie", g: "m" },
  { name: "Dackel", g: "m" },
  { name: "Perserkatze", g: "f" },
];

function getRandomName() {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]!;
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)]!;
  const ending = animal.g === "m" ? "er" : animal.g === "f" ? "e" : "es";
  return `${adjective}${ending} ${animal.name}`;
}

type LiveRoomJoinProps = {
  initialCode?: string;
  liveRoomConfig: LiveRoomConfig | null;
};

export function LiveRoomJoin({
  initialCode = "",
  liveRoomConfig,
}: LiveRoomJoinProps) {
  const hydrated = useHydrated();
  const [code, setCode] = useState(() =>
    normalizeJoinCode(initialCode).replace(/\D/g, "").slice(0, 4),
  );
  // Leer beim ersten Render: Math.random() im Server- und Client-Render
  // ergäbe unterschiedliche Namen und damit einen Hydration-Mismatch. Der
  // eigentliche Zufallsname entsteht deshalb erst nach dem Mount (Client-
  // seitiger Folge-Render, siehe useEffect unten) – wie bei useHydrated().
  const [name, setName] = useState("");
  useEffect(() => {
    const frame = requestAnimationFrame(() => setName(getRandomName()));
    return () => cancelAnimationFrame(frame);
  }, []);
  const [view, setView] = useState<View>("join");
  const [error, setError] = useState("");
  const [connectionWarning, setConnectionWarning] = useState("");
  const [room, setRoom] = useState<JoinedLiveRoom | null>(null);
  const [session, setSession] = useState<LiveSession | null>(null);
  const [initialProgress, setInitialProgress] = useState<LiveProgress | null>(
    null,
  );
  const [roster, setRoster] = useState<Record<string, number>>({});
  const [incomingAttack, setIncomingAttack] = useState<{
    id: number;
    type: AttackType;
    from: string;
  } | null>(null);
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
        const state = await getLiveRoomState(activeConfig, activeRoom.roomId, {
          participantToken: activeRoom.participantToken,
        });
        if (!state || state.status === "ended") {
          setSession(null);
          setView("ended");
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
      .on("broadcast", { event: "student-progress" }, ({ payload }) => {
        const update = payload as { name?: unknown; index?: unknown };
        if (typeof update.name !== "string" || typeof update.index !== "number")
          return;
        const name = update.name;
        const index = update.index;
        setRoster((current) => ({ ...current, [name]: index }));
      })
      .on("broadcast", { event: "student-finished" }, ({ payload }) => {
        const update = payload as { name?: unknown; currentIndex?: unknown };
        if (
          typeof update.name !== "string" ||
          typeof update.currentIndex !== "number"
        )
          return;
        const name = update.name;
        const index = update.currentIndex;
        setRoster((current) => ({
          ...current,
          [name]: index,
        }));
      })
      .on("broadcast", { event: "attack" }, ({ payload }) => {
        const attack = payload as {
          to?: unknown;
          from?: unknown;
          type?: unknown;
        };
        if (
          attack.to !== activeRoom.studentName ||
          typeof attack.from !== "string" ||
          (attack.type !== "ink" && attack.type !== "flicker")
        )
          return;
        setIncomingAttack({
          id: Date.now(),
          from: attack.from,
          type: attack.type,
        });
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
          studentName: progress.stationNumber
            ? `station-${progress.stationNumber}`
            : room.studentName,
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
        payload: {
          name: progress.stationNumber
            ? `Station ${progress.stationNumber}`
            : room.studentName,
          index: progress.currentIndex,
          ...progress,
        },
      });
    },
    [liveRoomConfig, room, session],
  );

  const loadProgress = useCallback(
    async (studentKey: string) => {
      if (!liveRoomConfig || !room || !session) return null;
      return getLiveProgress(liveRoomConfig, {
        roomId: room.roomId,
        sessionId: session.sessionId,
        participantToken: room.participantToken,
        studentName: studentKey,
      });
    },
    [liveRoomConfig, room, session],
  );

  const sendAttack = useCallback(
    (to: string, type: AttackType) => {
      if (!room || !channelRef.current) return false;
      void channelRef.current.send({
        type: "broadcast",
        event: "attack",
        payload: { from: room.studentName, to, type },
      });
      return true;
    },
    [room],
  );

  function handleScan(value: string) {
    const scanned = extractJoinCode(value).replace(/\D/g, "").slice(0, 4);
    setCode(scanned);
    setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedCode = code.replace(/\D/g, "").slice(0, 4);
    const normalizedName = (name.trim() || getRandomName())
      .replace(/\s+/g, " ")
      .slice(0, 32);
    if (!/^\d{4}$/.test(normalizedCode)) {
      setError("Bitte gib den vierstelligen Raumcode ein.");
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
        onLoadProgress={loadProgress}
        roster={roster}
        incomingAttack={incomingAttack}
        onSendAttack={sendAttack}
      />
    );
  }

  if (view === "lobby" || view === "starting") {
    return (
      <div className="live-room-page">
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
      </div>
    );
  }

  if (view === "ended") {
    return (
      <div className="live-room-page">
        <section className="live-room-state" aria-live="polite">
          <span className="live-room-state__mark" aria-hidden="true">
            ×
          </span>
          <p className="eyebrow">Raum {code}</p>
          <h1>Diese Runde ist beendet.</h1>
          <p>Dein erreichbarer Fortschritt wurde an die Lehrkraft gesendet.</p>
          <Link className="button button--primary" href="/">
            Zur Startseite
          </Link>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="live-room-page">
        <section
          className="live-room-join live-room-join--error"
          role="alert"
          aria-live="assertive"
        >
          <span className="live-room-join__error-mark" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element -- static decorative illustration, not a next/image candidate */}
            <img src="/face-expectation.svg" alt="" />
          </span>
          <h1>Ups, hier lief wohl etwas schief</h1>
          <p className="live-room-join__intro">{error}</p>
          <button
            type="button"
            className="button button--primary"
            onClick={() => setError("")}
          >
            ← Zur Code-Eingabe
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="live-room-page">
      <section
        className="live-room-join"
        aria-labelledby="live-room-title"
        data-hydrated={hydrated ? "true" : "false"}
      >
        <h1 id="live-room-title">Laufdiktat</h1>
        <p className="live-room-join__intro">
          Gib den Raumcode deiner Lehrkraft ein, um zu starten.
        </p>
        <form onSubmit={submit} noValidate>
          <span id="live-room-code-label" className="room-code__label">
            Raumcode
          </span>
          <div className="live-room-code-grid">
            <SegmentedRoomCode
              idPrefix="live-room"
              labelId="live-room-code-label"
              value={code}
              invalid={Boolean(error)}
              describedBy={undefined}
              onChange={(value) => {
                setCode(value);
                setError("");
              }}
            />
            <QrCodeScanner onResult={handleScan} />
          </div>

          <div className="live-room-join__avatar" aria-hidden="true">
            <AnimalAvatar
              studentName={name}
              className="live-room-join__avatar-img"
            />
          </div>

          <div className="live-room-join__name" aria-live="polite">
            {name}
          </div>
          <button
            type="button"
            className="live-room-join__dice"
            onClick={() => setName(getRandomName())}
          >
            <span aria-hidden="true">🎲</span> Zufälligen Namen generieren
          </button>

          <button
            className="button button--primary live-room-join__submit"
            type="submit"
            disabled={!hydrated || view === "connecting"}
          >
            {view === "connecting"
              ? "Verbindung wird aufgebaut …"
              : "Beitreten"}
          </button>
        </form>
      </section>

      <div className="live-room-join__footer">
        <Link className="live-room-join__teacher-link" href="/lehrer">
          Lehrer-Login
        </Link>
        <Link className="live-room-join__legal-link" href="/impressum">
          Impressum &amp; Datenschutz
        </Link>
      </div>
    </div>
  );
}
