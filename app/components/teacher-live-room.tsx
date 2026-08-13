"use client";

import { QRCodeCanvas } from "qrcode.react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  getLiveRoomClient,
  type LiveRoomConfig,
} from "../../src/integrations/laufdiktat/live-room-client";
import {
  endLiveRoom,
  getLiveRoomParticipants,
  openLiveRoom,
  updateLiveSession,
  type LiveRoomParticipant,
  type OpenedLiveRoom,
} from "../../src/integrations/laufdiktat/room-api";
import {
  buildTeacherRoomConfig,
  buildTeacherWords,
  type TeacherContentMode,
  type TeacherGameMode,
} from "../../src/integrations/laufdiktat/teacher-session";
import type { VocabularyDirection } from "../../src/domain/running-dictation";

type TeacherLiveRoomProps = {
  liveRoomConfig: LiveRoomConfig | null;
};

type RoomStage = "setup" | "lobby" | "live";

const CONTENT_LABELS: Record<TeacherContentMode, string> = {
  text: "Text",
  vocabulary: "Vokabeln",
  math: "Kopfrechnen",
};

const DEFAULT_SOURCES: Record<TeacherContentMode, string> = {
  text: "Der Morgen ist kühl. Die Klasse arbeitet konzentriert.",
  vocabulary: "school;Schule\nclassroom;Klassenzimmer\nlibrary;Bibliothek",
  math: "7 + 8\n16 - 9\n6 · 7\n36 : 4",
};

const subscribeToHydration = () => () => undefined;

function onlineParticipants(
  registered: LiveRoomParticipant[],
  presenceNames: string[],
) {
  const now = Date.now();
  return Array.from(
    new Set([
      ...presenceNames,
      ...registered
        .filter(
          ({ lastSeenAt }) => now - new Date(lastSeenAt).getTime() < 45_000,
        )
        .map(({ studentName }) => studentName),
    ]),
  ).sort((left, right) => left.localeCompare(right, "de"));
}

export function TeacherLiveRoom({ liveRoomConfig }: TeacherLiveRoomProps) {
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const [stage, setStage] = useState<RoomStage>("setup");
  const [contentMode, setContentMode] = useState<TeacherContentMode>("text");
  const [sources, setSources] = useState(DEFAULT_SOURCES);
  const [vocabularyDirection, setVocabularyDirection] =
    useState<VocabularyDirection>("left-to-right");
  const [gameMode, setGameMode] = useState<TeacherGameMode>("UEBUNG");
  const [shuffleWords, setShuffleWords] = useState(false);
  const [repeatWrongAnswers, setRepeatWrongAnswers] = useState(true);
  const [room, setRoom] = useState<OpenedLiveRoom | null>(null);
  const [registered, setRegistered] = useState<LiveRoomParticipant[]>([]);
  const [presenceNames, setPresenceNames] = useState<string[]>([]);
  const [joinUrl, setJoinUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const channelRef = useRef<RealtimeChannel | null>(null);

  const source = sources[contentMode];
  const words = useMemo(
    () => buildTeacherWords(contentMode, source, vocabularyDirection),
    [contentMode, source, vocabularyDirection],
  );
  const connected = useMemo(
    () => onlineParticipants(registered, presenceNames),
    [presenceNames, registered],
  );

  const roomConfig = useMemo(
    () =>
      buildTeacherRoomConfig({
        contentMode,
        source,
        vocabularyDirection,
        gameMode,
        shuffleWords,
        repeatWrongAnswers,
      }),
    [
      contentMode,
      gameMode,
      repeatWrongAnswers,
      shuffleWords,
      source,
      vocabularyDirection,
    ],
  );

  const refreshParticipants = useCallback(async () => {
    if (!liveRoomConfig || !room) return;
    try {
      setRegistered(await getLiveRoomParticipants(liveRoomConfig, room));
    } catch {
      // Presence bleibt als kurzfristige Anzeige verfügbar.
    }
  }, [liveRoomConfig, room]);

  useEffect(() => {
    if (!liveRoomConfig || !room) return;
    const client = getLiveRoomClient(liveRoomConfig);
    const channel = client.channel(`room-${room.code}`);
    channelRef.current = channel;
    const syncPresence = () => {
      setPresenceNames(Object.keys(channel.presenceState()));
    };
    channel
      .on("presence", { event: "sync" }, syncPresence)
      .on("presence", { event: "join" }, syncPresence)
      .on("presence", { event: "leave" }, syncPresence)
      .subscribe();
    const initialRefresh = window.setTimeout(() => {
      void refreshParticipants();
    }, 0);
    const interval = window.setInterval(() => {
      void refreshParticipants();
    }, 8_000);
    return () => {
      if (channelRef.current === channel) channelRef.current = null;
      window.clearTimeout(initialRefresh);
      window.clearInterval(interval);
      void client.removeChannel(channel);
    };
  }, [liveRoomConfig, refreshParticipants, room]);

  async function openLobby() {
    setError("");
    if (!liveRoomConfig) {
      setError(
        "Live-Räume sind lokal noch nicht konfiguriert. Benötigt werden die öffentliche Supabase-URL und der Publishable Key.",
      );
      return;
    }
    if (words.length === 0) {
      setError("Bitte gib mindestens eine gültige Aufgabe ein.");
      return;
    }
    setBusy(true);
    try {
      const opened = await openLiveRoom(liveRoomConfig, roomConfig);
      setRoom(opened);
      setJoinUrl(`${window.location.origin}/raum?code=${opened.code}`);
      setStage("lobby");
    } catch {
      setError(
        "Die Lobby konnte nicht geöffnet werden. Bitte prüfe die Verbindung.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function startSession() {
    if (!liveRoomConfig || !room) return;
    setBusy(true);
    setError("");
    try {
      const sessionId = crypto.randomUUID();
      await updateLiveSession(liveRoomConfig, room, sessionId, roomConfig);
      const result = await channelRef.current?.send({
        type: "broadcast",
        event: "session-start",
        payload: { appVersion: "lernraum-0.1.0" },
      });
      if (result !== "ok") throw new Error("broadcast failed");
      setStage("live");
    } catch {
      setError("Die Runde konnte nicht sicher gestartet werden.");
    } finally {
      setBusy(false);
    }
  }

  async function closeRoom() {
    if (!liveRoomConfig || !room) return;
    setBusy(true);
    setError("");
    try {
      await endLiveRoom(liveRoomConfig, room);
      await channelRef.current?.send({
        type: "broadcast",
        event: "session-ended",
        payload: {},
      });
      setStage("setup");
      setRoom(null);
      setRegistered([]);
      setPresenceNames([]);
    } catch {
      setError(
        "Der Raum konnte nicht beendet werden. Bitte versuche es erneut.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="teacher-live" aria-labelledby="teacher-live-title">
      <div className="teacher-live__heading">
        <div>
          <p className="eyebrow">Unterrichtsrunde</p>
          <h1 id="teacher-live-title">Gemeinsam starten</h1>
          <p>
            Bereite eine kurze Runde vor. Die Geräte treten per QR-Code oder
            Raumcode bei; Lerninhalte werden erst beim Start freigegeben.
          </p>
        </div>
        <span className="teacher-local-note">
          {stage === "setup"
            ? "Noch nicht geöffnet"
            : `${connected.length} verbunden`}
        </span>
      </div>

      {stage === "setup" ? (
        <div className="teacher-live__setup">
          <section
            className="teacher-live__builder"
            aria-labelledby="content-title"
          >
            <div className="teacher-panel__heading">
              <div>
                <p className="eyebrow">1 · Inhalt</p>
                <h2 id="content-title">Was wird geübt?</h2>
              </div>
              <span>{words.length} Aufgaben</span>
            </div>
            <fieldset className="teacher-live__choices">
              <legend>Aufgabenformat</legend>
              {(["text", "vocabulary", "math"] as const).map((mode) => (
                <button
                  type="button"
                  key={mode}
                  aria-pressed={contentMode === mode}
                  onClick={() => setContentMode(mode)}
                  disabled={!hydrated}
                >
                  {CONTENT_LABELS[mode]}
                </button>
              ))}
            </fieldset>
            <label className="teacher-live__source">
              <span>
                {contentMode === "text"
                  ? "Text – Sätze werden automatisch getrennt"
                  : contentMode === "vocabulary"
                    ? "Vokabeln – eine Zeile pro Paar, getrennt mit Semikolon"
                    : "Kopfrechnen – eine Aufgabe pro Zeile"}
              </span>
              <textarea
                value={source}
                disabled={!hydrated}
                onChange={(event) =>
                  setSources((current) => ({
                    ...current,
                    [contentMode]: event.target.value,
                  }))
                }
              />
            </label>
            {contentMode === "vocabulary" && (
              <label className="teacher-live__select">
                Abfragerichtung
                <select
                  value={vocabularyDirection}
                  disabled={!hydrated}
                  onChange={(event) =>
                    setVocabularyDirection(
                      event.target.value as VocabularyDirection,
                    )
                  }
                >
                  <option value="left-to-right">Links → rechts</option>
                  <option value="right-to-left">Rechts → links</option>
                  <option value="mixed">Gemischt</option>
                </select>
              </label>
            )}
          </section>

          <aside
            className="teacher-live__options"
            aria-labelledby="round-title"
          >
            <p className="eyebrow">2 · Ablauf</p>
            <h2 id="round-title">Runde einstellen</h2>
            <fieldset>
              <legend>Lernmodus</legend>
              <label htmlFor="teacher-game-practice">
                <input
                  id="teacher-game-practice"
                  type="radio"
                  name="teacher-game-mode"
                  disabled={!hydrated}
                  checked={gameMode === "UEBUNG"}
                  onChange={() => setGameMode("UEBUNG")}
                />
                Üben
                <small>Hilfen und mehrere Versuche</small>
              </label>
              <label htmlFor="teacher-game-check">
                <input
                  id="teacher-game-check"
                  type="radio"
                  name="teacher-game-mode"
                  disabled={!hydrated}
                  checked={gameMode === "TEST"}
                  onChange={() => setGameMode("TEST")}
                />
                Lernstandscheck
                <small>Ein Versuch je Aufgabe</small>
              </label>
            </fieldset>
            <label className="teacher-live__toggle">
              <input
                type="checkbox"
                disabled={!hydrated}
                checked={shuffleWords}
                onChange={(event) => setShuffleWords(event.target.checked)}
              />
              Reihenfolge mischen
            </label>
            <label className="teacher-live__toggle">
              <input
                type="checkbox"
                disabled={!hydrated}
                checked={repeatWrongAnswers}
                onChange={(event) =>
                  setRepeatWrongAnswers(event.target.checked)
                }
              />
              Fehler später wiederholen
            </label>
            <button
              type="button"
              className="button button--primary teacher-live__open"
              onClick={openLobby}
              disabled={!hydrated || busy}
            >
              {busy ? "Lobby wird geöffnet …" : "Lobby öffnen"}
            </button>
          </aside>
        </div>
      ) : (
        <div className="teacher-live__lobby">
          <section
            className="teacher-live__access"
            aria-labelledby="access-title"
          >
            <p className="eyebrow">
              {stage === "lobby" ? "Lobby geöffnet" : "Runde läuft"}
            </p>
            <h2 id="access-title">Mit dem Gerät beitreten</h2>
            {joinUrl && (
              <div className="teacher-live__qr">
                <QRCodeCanvas
                  value={joinUrl}
                  size={220}
                  level="H"
                  marginSize={2}
                />
              </div>
            )}
            <p className="teacher-live__code-label">oder Raumcode eingeben</p>
            <strong className="teacher-live__code">{room?.code}</strong>
          </section>

          <section
            className="teacher-live__participants"
            aria-labelledby="participants-title"
          >
            <div className="teacher-panel__heading">
              <div>
                <p className="eyebrow">Geräte</p>
                <h2 id="participants-title">{connected.length} verbunden</h2>
              </div>
              <span>{words.length} Aufgaben</span>
            </div>
            {connected.length === 0 ? (
              <div className="teacher-live__waiting" role="status">
                <span aria-hidden="true">•••</span>
                <strong>Warte auf Geräte</strong>
                <p>
                  Schülerinnen und Schüler scannen den QR-Code oder geben den
                  Code ein.
                </p>
              </div>
            ) : (
              <ul className="teacher-live__student-list">
                {connected.map((name) => (
                  <li key={name}>
                    <span aria-hidden="true">✓</span>
                    {name}
                  </li>
                ))}
              </ul>
            )}
            <div className="teacher-live__actions">
              {stage === "lobby" ? (
                <button
                  type="button"
                  className="button button--primary"
                  onClick={startSession}
                  disabled={busy || connected.length === 0}
                >
                  {busy ? "Runde startet …" : "Runde starten"}
                </button>
              ) : (
                <div className="teacher-live__running" role="status">
                  <span aria-hidden="true" />
                  Runde läuft auf den Geräten
                </div>
              )}
              <button
                type="button"
                className="button button--quiet"
                onClick={closeRoom}
                disabled={busy}
              >
                Raum beenden
              </button>
            </div>
          </section>
        </div>
      )}

      {error && (
        <p className="teacher-live__error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
