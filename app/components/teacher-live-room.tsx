"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { QRCodeCanvas } from "qrcode.react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { VocabularyDirection } from "../../src/domain/running-dictation";
import {
  getLiveRoomClient,
  type LiveRoomConfig,
} from "../../src/integrations/laufdiktat/live-room-client";
import {
  clearTeacherLiveRoom,
  endLiveRoom,
  getLiveRoomParticipants,
  getLiveRoomState,
  getLiveRoomStudents,
  openLiveRoom,
  readTeacherLiveRoom,
  removeLiveRoomParticipant,
  saveTeacherLiveRoom,
  updateLiveSession,
  type LiveRoomParticipant,
  type LiveRoomStudent,
  type OpenedLiveRoom,
} from "../../src/integrations/laufdiktat/room-api";
import {
  buildTeacherRoomConfig,
  buildTeacherWords,
  generateMentalMathSource,
  type MathOperation,
  type TeacherContentMode,
  type TeacherGameMode,
} from "../../src/integrations/laufdiktat/teacher-session";
import {
  aggregateWordErrors,
  buildTeacherResultCsv,
} from "../../src/integrations/laufdiktat/teacher-results";
import { parseLiveSession } from "../../src/integrations/laufdiktat/live-session";

type Props = { liveRoomConfig: LiveRoomConfig | null };
type Stage = "content" | "settings" | "lobby" | "live";

const LABELS: Record<TeacherContentMode, string> = {
  text: "Text",
  vocabulary: "Vokabeln",
  math: "Kopfrechnen",
};
const MODES: Array<{ id: TeacherGameMode; title: string; text: string }> = [
  {
    id: "UEBUNG",
    title: "Freies Üben",
    text: "Einprägen, schreiben und mit optionalen Hilfen verbessern.",
  },
  {
    id: "TEST",
    title: "Lernstandscheck",
    text: "Jede Aufgabe einmal lösen; Ergebnisse erst in der Auswertung.",
  },
  {
    id: "BATTLE",
    title: "Battle",
    text: "Gleichzeitig üben und durch Lernfortschritt Angriffe aufladen.",
  },
  {
    id: "STATION",
    title: "Laufdiktat",
    text: "Geteilte Stationsgeräte: Nummer wählen, merken und auf Papier schreiben.",
  },
];
const DEFAULT_SOURCES: Record<TeacherContentMode, string> = {
  text: "Der Morgen ist kühl. Die Klasse arbeitet konzentriert.",
  vocabulary: "school;Schule\nclassroom;Klassenzimmer\nlibrary;Bibliothek",
  math: "7 + 8\n16 - 9\n6 · 7\n36 : 4",
};
const subscribeHydration = () => () => undefined;

function isOnline(participant: LiveRoomParticipant) {
  return Boolean(
    participant.lastSeenAt &&
    Date.now() - new Date(participant.lastSeenAt).getTime() < 45_000,
  );
}

export function TeacherLiveRoom({ liveRoomConfig }: Props) {
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );
  const [stage, setStage] = useState<Stage>("content");
  const [contentMode, setContentMode] = useState<TeacherContentMode>("text");
  const [sources, setSources] = useState(DEFAULT_SOURCES);
  const [direction, setDirection] =
    useState<VocabularyDirection>("left-to-right");
  const [gameMode, setGameMode] = useState<TeacherGameMode>("UEBUNG");
  const [shuffleWords, setShuffleWords] = useState(false);
  const [stationShuffle, setStationShuffle] = useState(true);
  const [repeatWrongAnswers, setRepeatWrongAnswers] = useState(true);
  const [assistance, setAssistance] = useState(true);
  const [attempts, setAttempts] = useState(3);
  const [tts, setTts] = useState(false);
  const [showStars, setShowStars] = useState(true);
  const [strictTyping, setStrictTyping] = useState(false);
  const [stationCount, setStationCount] = useState(20);
  const [battleInk, setBattleInk] = useState(true);
  const [battleFlicker, setBattleFlicker] = useState(true);
  const [mathCount, setMathCount] = useState(10);
  const [mathMin, setMathMin] = useState(0);
  const [mathMax, setMathMax] = useState(20);
  const [mathOps, setMathOps] = useState<MathOperation[]>(["+", "-"]);
  const [room, setRoom] = useState<OpenedLiveRoom | null>(null);
  const [participants, setParticipants] = useState<LiveRoomParticipant[]>([]);
  const [presenceNames, setPresenceNames] = useState<string[]>([]);
  const [students, setStudents] = useState<LiveRoomStudent[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const channelRef = useRef<RealtimeChannel | null>(null);

  const source = sources[contentMode];
  const words = useMemo(
    () => buildTeacherWords(contentMode, source, direction),
    [contentMode, direction, source],
  );
  const registeredNames = participants.map(({ studentName }) => studentName);
  const connectedNames = Array.from(
    new Set([
      ...presenceNames,
      ...participants.filter(isOnline).map(({ studentName }) => studentName),
    ]),
  ).sort((a, b) => a.localeCompare(b, "de"));
  const allNames = Array.from(new Set([...registeredNames, ...connectedNames]));
  const roomConfig = useMemo(
    () =>
      buildTeacherRoomConfig({
        contentMode,
        source,
        vocabularyDirection: direction,
        gameMode,
        shuffleWords,
        repeatWrongAnswers,
        isTtsEnabled: tts,
        uebungMaxAttempts: attempts,
        uebungAssistanceEnabled: assistance,
        showStars,
        strictTypingMode: strictTyping,
        stationCount,
        stationShuffle,
        battleOptions: { ink: battleInk, flicker: battleFlicker },
      }),
    [
      assistance,
      attempts,
      battleFlicker,
      battleInk,
      contentMode,
      direction,
      gameMode,
      repeatWrongAnswers,
      showStars,
      shuffleWords,
      source,
      stationCount,
      stationShuffle,
      strictTyping,
      tts,
    ],
  );

  const refresh = useCallback(async () => {
    if (!liveRoomConfig || !room) return;
    const [nextParticipants, nextStudents] = await Promise.all([
      getLiveRoomParticipants(liveRoomConfig, room),
      stage === "live"
        ? getLiveRoomStudents(liveRoomConfig, room)
        : Promise.resolve([]),
    ]);
    setParticipants(nextParticipants);
    if (stage === "live") setStudents(nextStudents);
  }, [liveRoomConfig, room, stage]);

  useEffect(() => {
    if (!hydrated || !liveRoomConfig || room) return;
    const stored = readTeacherLiveRoom();
    if (!stored) return;
    getLiveRoomState(liveRoomConfig, stored.roomId, {
      accessToken: stored.accessToken,
    })
      .then((state) => {
        if (!state || state.status === "ended") {
          clearTeacherLiveRoom();
          return;
        }
        const restored = parseLiveSession(
          state.config,
          state.sessionId ?? "lobby",
          "teacher-restore",
        );
        const restoredContent = restored.words[0]?.kind ?? "text";
        const nextContentMode: TeacherContentMode =
          restoredContent === "vocabulary"
            ? "vocabulary"
            : restoredContent === "math"
              ? "math"
              : "text";
        const restoredSource = restored.words
          .map((word) =>
            nextContentMode === "vocabulary"
              ? `${word.prompt ?? ""};${word.targetWord}`
              : nextContentMode === "math"
                ? (word.prompt ?? word.targetWord)
                : word.targetWord,
          )
          .join("\n");
        setContentMode(nextContentMode);
        setSources((current) => ({
          ...current,
          [nextContentMode]: restoredSource,
        }));
        setGameMode(
          restored.stationMode
            ? "STATION"
            : restored.gameMode === "BATTLE"
              ? "BATTLE"
              : restored.gameMode === "TEST"
                ? "TEST"
                : "UEBUNG",
        );
        setShuffleWords(restored.shuffleWords);
        setStationShuffle(restored.stationShuffle);
        setRepeatWrongAnswers(restored.repeatWrongAnswers);
        setAssistance(restored.uebungAssistanceEnabled);
        setAttempts(restored.uebungMaxAttempts);
        setTts(restored.isTtsEnabled);
        setShowStars(restored.showStars);
        setStrictTyping(restored.strictTypingMode);
        setStationCount(restored.stationCount);
        setBattleInk(restored.battleOptions.ink);
        setBattleFlicker(restored.battleOptions.flicker);
        setRoom(stored);
        setStage(state.status === "live" ? "live" : "lobby");
      })
      .catch(() => clearTeacherLiveRoom());
  }, [hydrated, liveRoomConfig, room]);

  useEffect(() => {
    if (!liveRoomConfig || !room) return;
    const client = getLiveRoomClient(liveRoomConfig);
    const channel = client.channel(`room-${room.code}`);
    channelRef.current = channel;
    const syncPresence = () =>
      setPresenceNames(Object.keys(channel.presenceState()));
    channel
      .on("presence", { event: "sync" }, syncPresence)
      .on("presence", { event: "join" }, syncPresence)
      .on("presence", { event: "leave" }, syncPresence)
      .on("broadcast", { event: "student-progress" }, () => void refresh())
      .on("broadcast", { event: "student-finished" }, () => void refresh())
      .on("broadcast", { event: "update-station-state" }, () => void refresh())
      .subscribe();
    const first = window.setTimeout(() => void refresh(), 0);
    const interval = window.setInterval(
      () => void refresh(),
      stage === "live" ? 3_000 : 8_000,
    );
    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
      if (channelRef.current === channel) channelRef.current = null;
      void client.removeChannel(channel);
    };
  }, [liveRoomConfig, refresh, room, stage]);

  function importFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () =>
      setSources((current) => ({
        ...current,
        [contentMode]: String(reader.result ?? ""),
      }));
    reader.readAsText(file);
  }

  async function openLobby() {
    setError("");
    if (!liveRoomConfig) {
      setError(
        "Live-Räume sind lokal noch nicht konfiguriert. Das Dashboard ist vollständig vorbereitet; URL und Publishable Key verbinden wir anschließend.",
      );
      return;
    }
    if (!words.length)
      return setError("Bitte gib mindestens eine gültige Aufgabe ein.");
    setBusy(true);
    try {
      const opened = await openLiveRoom(liveRoomConfig, roomConfig);
      saveTeacherLiveRoom(opened);
      setRoom(opened);
      setStage("lobby");
    } catch {
      setError(
        "Der Raum konnte nicht geöffnet werden. Bitte prüfe die Verbindung.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function startSession() {
    if (!liveRoomConfig || !room) return;
    setBusy(true);
    try {
      await updateLiveSession(
        liveRoomConfig,
        room,
        crypto.randomUUID(),
        roomConfig,
      );
      if (
        (await channelRef.current?.send({
          type: "broadcast",
          event: "session-start",
          payload: { appVersion: "lernraum-0.1.0" },
        })) !== "ok"
      )
        throw new Error();
      setStudents([]);
      setStage("live");
    } catch {
      setError("Die Sitzung konnte nicht sicher gestartet werden.");
    } finally {
      setBusy(false);
    }
  }

  async function endRoom() {
    if (!liveRoomConfig || !room) return;
    setBusy(true);
    try {
      await endLiveRoom(liveRoomConfig, room);
      await channelRef.current?.send({
        type: "broadcast",
        event: "session-ended",
        payload: {},
      });
      clearTeacherLiveRoom();
      setRoom(null);
      setParticipants([]);
      setStudents([]);
      setPresenceNames([]);
      setStage("content");
    } catch {
      setError("Der Raum konnte nicht beendet werden.");
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    const resultNames =
      gameMode === "STATION"
        ? students
            .filter((student) => student.stationNumber !== null)
            .sort(
              (left, right) =>
                (left.stationNumber ?? 0) - (right.stationNumber ?? 0),
            )
            .map((student) => student.studentName)
        : allNames;
    const blob = new Blob(
      [buildTeacherResultCsv(resultNames, students, words.length)],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `laufdiktat-ergebnisse-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const steps: Array<[Stage, string]> = [
    ["content", "Inhalte"],
    ["settings", "Einstellungen"],
    ["lobby", "Lobby"],
    ["live", "Live"],
  ];
  return (
    <section className="teacher-live" aria-labelledby="teacher-live-title">
      <div className="teacher-live__heading">
        <div>
          <p className="eyebrow">Laufdiktat · Lehrerdashboard</p>
          <h1 id="teacher-live-title">Unterrichtsrunde</h1>
          <p>
            Inhalte vorbereiten, Spiel konfigurieren, Geräte verbinden und den
            Lernfortschritt live begleiten.
          </p>
        </div>
        <span className="teacher-local-note">
          {room ? `Raum ${room.code}` : "Noch nicht geöffnet"}
        </span>
      </div>
      <nav className="teacher-live__steps" aria-label="Schritte">
        {steps.map(([id, label], index) => (
          <button
            type="button"
            key={id}
            className={stage === id ? "is-active" : ""}
            disabled={(index > 0 && !words.length) || (index > 1 && !room)}
            onClick={() =>
              id === "lobby" && !room ? void openLobby() : setStage(id)
            }
          >
            <span>{index + 1}</span>
            {label}
          </button>
        ))}
      </nav>

      {stage === "content" && (
        <div className="teacher-live__setup teacher-live__setup--single">
          <section className="teacher-live__builder">
            <div className="teacher-panel__heading">
              <div>
                <p className="eyebrow">1 · Inhalte</p>
                <h2>Aufgaben zusammenstellen</h2>
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
                  disabled={!hydrated}
                  onClick={() => {
                    setContentMode(mode);
                    if (mode === "vocabulary") setShuffleWords(true);
                  }}
                >
                  {LABELS[mode]}
                </button>
              ))}
            </fieldset>
            {contentMode === "math" && (
              <div className="teacher-live__math-generator">
                <label>
                  Anzahl
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={mathCount}
                    onChange={(e) => setMathCount(Number(e.target.value))}
                  />
                </label>
                <label>
                  Von
                  <input
                    type="number"
                    value={mathMin}
                    onChange={(e) => setMathMin(Number(e.target.value))}
                  />
                </label>
                <label>
                  Bis
                  <input
                    type="number"
                    value={mathMax}
                    onChange={(e) => setMathMax(Number(e.target.value))}
                  />
                </label>
                <fieldset>
                  <legend>Rechenarten</legend>
                  {(["+", "-", "*", "/"] as const).map((op) => (
                    <label key={op}>
                      <input
                        type="checkbox"
                        checked={mathOps.includes(op)}
                        onChange={() =>
                          setMathOps((current) =>
                            current.includes(op)
                              ? current.filter((item) => item !== op)
                              : [...current, op],
                          )
                        }
                      />
                      {op === "*" ? "·" : op === "/" ? ":" : op}
                    </label>
                  ))}
                </fieldset>
                <button
                  type="button"
                  className="button button--quiet"
                  onClick={() =>
                    setSources((current) => ({
                      ...current,
                      math: generateMentalMathSource({
                        count: mathCount,
                        min: mathMin,
                        max: mathMax,
                        operations: mathOps,
                      }),
                    }))
                  }
                >
                  Aufgaben erzeugen
                </button>
              </div>
            )}
            <label className="teacher-live__source">
              <span>
                {contentMode === "text"
                  ? "Text – Sätze werden automatisch getrennt"
                  : contentMode === "vocabulary"
                    ? "Vokabelpaare – Semikolon oder Tab, Alternativen mit |"
                    : "Eine Rechnung pro Zeile"}
              </span>
              <textarea
                value={source}
                disabled={!hydrated}
                onChange={(e) =>
                  setSources((current) => ({
                    ...current,
                    [contentMode]: e.target.value,
                  }))
                }
              />
            </label>
            <div className="teacher-live__import-row">
              <label className="button button--quiet">
                Datei importieren
                <input
                  className="sr-only"
                  type="file"
                  accept=".txt,.csv,text/plain,text/csv"
                  onChange={(e) => importFile(e.target.files?.[0])}
                />
              </label>
              {contentMode === "vocabulary" && (
                <label className="teacher-live__select">
                  Abfragerichtung
                  <select
                    value={direction}
                    onChange={(e) =>
                      setDirection(e.target.value as VocabularyDirection)
                    }
                  >
                    <option value="left-to-right">Links → rechts</option>
                    <option value="right-to-left">Rechts → links</option>
                    <option value="mixed">Gemischt</option>
                  </select>
                </label>
              )}
            </div>
            <div className="teacher-live__actions">
              <button
                type="button"
                className="button button--primary"
                disabled={!words.length}
                onClick={() => setStage("settings")}
              >
                Weiter zu den Einstellungen
              </button>
            </div>
          </section>
        </div>
      )}

      {stage === "settings" && (
        <div className="teacher-live__settings-grid">
          <section
            className="teacher-live__mode-list"
            aria-label="Spielmodus wählen"
          >
            {MODES.map((mode) => (
              <button
                type="button"
                key={mode.id}
                className={gameMode === mode.id ? "is-active" : ""}
                aria-pressed={gameMode === mode.id}
                onClick={() => setGameMode(mode.id)}
              >
                <strong>{mode.title}</strong>
                <span>{mode.text}</span>
              </button>
            ))}
          </section>
          <aside className="teacher-live__options">
            <p className="eyebrow">2 · Einstellungen</p>
            <h2>{MODES.find((mode) => mode.id === gameMode)?.title}</h2>
            {gameMode === "UEBUNG" && (
              <>
                <Option
                  label="Fehlerhilfe mit Lösung"
                  checked={assistance}
                  set={setAssistance}
                />
                {assistance && (
                  <>
                    <label className="teacher-live__number">
                      Fehlversuche bis Lösung
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={attempts}
                        onChange={(e) => setAttempts(Number(e.target.value))}
                      />
                    </label>
                    <Option
                      label="Falsche Aufgaben am Ende wiederholen"
                      checked={repeatWrongAnswers}
                      set={setRepeatWrongAnswers}
                    />
                  </>
                )}
              </>
            )}
            {gameMode === "BATTLE" && (
              <>
                <Option
                  label="Tintenfleck-Angriff"
                  checked={battleInk}
                  set={setBattleInk}
                />
                <Option
                  label="Flimmer-Angriff"
                  checked={battleFlicker}
                  set={setBattleFlicker}
                />
              </>
            )}
            {gameMode === "STATION" && (
              <>
                <label className="teacher-live__number">
                  Anzahl Schülernummern
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={stationCount}
                    onChange={(e) => setStationCount(Number(e.target.value))}
                  />
                </label>
                <Option
                  label="Reihenfolge je Schülernummer mischen"
                  checked={stationShuffle}
                  set={setStationShuffle}
                />
              </>
            )}
            <Option label="Vorlesen erlauben" checked={tts} set={setTts} />
            <Option
              label={
                gameMode === "STATION"
                  ? "Stationsreihenfolge mischen"
                  : "Reihenfolge pro Schüler mischen"
              }
              checked={gameMode === "STATION" ? stationShuffle : shuffleWords}
              set={gameMode === "STATION" ? setStationShuffle : setShuffleWords}
            />
            {gameMode !== "STATION" && (
              <>
                <Option
                  label="Nur getippte Eingaben erlauben"
                  checked={strictTyping}
                  set={setStrictTyping}
                />
                <Option
                  label="Sterne anzeigen"
                  checked={showStars}
                  set={setShowStars}
                />
              </>
            )}
            <div className="teacher-live__actions">
              <button
                type="button"
                className="button button--quiet"
                onClick={() => setStage("content")}
              >
                Zurück
              </button>
              <button
                type="button"
                className="button button--primary"
                onClick={openLobby}
                disabled={busy}
              >
                {busy ? "Öffnet …" : "Lobby öffnen"}
              </button>
            </div>
          </aside>
        </div>
      )}

      {(stage === "lobby" || stage === "live") && room && (
        <RoomDashboard
          stage={stage}
          room={room}
          wordsCount={words.length}
          connected={connectedNames}
          participants={participants}
          students={students}
          stationCount={stationCount}
          stationMode={gameMode === "STATION"}
          showStars={showStars}
          busy={busy}
          onStart={startSession}
          onEnd={endRoom}
          onExport={exportCsv}
          onRemove={async (name) => {
            if (!liveRoomConfig) return;
            await removeLiveRoomParticipant(liveRoomConfig, room, name);
            await refresh();
          }}
        />
      )}
      {error && (
        <p className="teacher-live__error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

function Option({
  label,
  checked,
  set,
}: {
  label: string;
  checked: boolean;
  set: (value: boolean) => void;
}) {
  return (
    <label className="teacher-live__toggle">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => set(e.target.checked)}
      />
      {label}
    </label>
  );
}

function RoomDashboard({
  stage,
  room,
  wordsCount,
  connected,
  participants,
  students,
  stationCount,
  stationMode,
  showStars,
  busy,
  onStart,
  onEnd,
  onExport,
  onRemove,
}: {
  stage: "lobby" | "live";
  room: OpenedLiveRoom;
  wordsCount: number;
  connected: string[];
  participants: LiveRoomParticipant[];
  students: LiveRoomStudent[];
  stationCount: number;
  stationMode: boolean;
  showStars: boolean;
  busy: boolean;
  onStart: () => void;
  onEnd: () => void;
  onExport: () => void;
  onRemove: (name: string) => void;
}) {
  const joinUrl =
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}/raum?code=${room.code}`;
  const finished = students.filter((student) => student.finished).length;
  const trackedStudents = stationMode
    ? students.filter((student) => student.stationNumber !== null)
    : connected.map((name) =>
        students.find((student) => student.studentName === name),
      );
  const progress = trackedStudents.length
    ? Math.round(
        trackedStudents.reduce((sum, student) => {
          return (
            sum +
            (student?.finished
              ? 100
              : Math.round(
                  ((student?.currentIndex ?? 0) / Math.max(1, wordsCount)) *
                    100,
                ))
          );
        }, 0) / trackedStudents.length,
      )
    : 0;
  const errors = aggregateWordErrors(students).slice(0, 10);
  return (
    <div className="teacher-live__lobby">
      <section className="teacher-live__access">
        <p className="eyebrow">
          {stage === "lobby" ? "Lobby geöffnet" : "Live-Sitzung"}
        </p>
        <h2>Mit Gerät beitreten</h2>
        {joinUrl && (
          <div className="teacher-live__qr">
            <QRCodeCanvas value={joinUrl} size={220} level="H" marginSize={2} />
          </div>
        )}
        <p className="teacher-live__code-label">oder Raumcode eingeben</p>
        <strong className="teacher-live__code">{room.code}</strong>
      </section>
      <section className="teacher-live__participants">
        <div className="teacher-panel__heading">
          <div>
            <p className="eyebrow">
              {stage === "lobby" ? "Geräte" : "Fortschritt"}
            </p>
            <h2>
              {stage === "lobby"
                ? `${connected.length} verbunden`
                : `${finished} fertig`}
            </h2>
          </div>
          <span>{wordsCount} Aufgaben</span>
        </div>
        {stage === "live" && (
          <div className="teacher-live__stats">
            <div>
              <span>Aktiv</span>
              <strong>
                {Math.max(
                  0,
                  (stationMode ? trackedStudents.length : connected.length) -
                    finished,
                )}
              </strong>
            </div>
            <div>
              <span>Fertig</span>
              <strong>{finished}</strong>
            </div>
            <div>
              <span>Gesamt</span>
              <strong>{progress}%</strong>
            </div>
          </div>
        )}
        {stage === "lobby" ? (
          <ul className="teacher-live__student-list">
            {participants.length ? (
              participants.map((participant) => (
                <li
                  className={
                    connected.includes(participant.studentName)
                      ? ""
                      : "is-offline"
                  }
                  key={participant.studentName}
                >
                  <span aria-hidden="true">
                    {connected.includes(participant.studentName) ? "✓" : "–"}
                  </span>
                  {participant.studentName}
                  {!connected.includes(participant.studentName) && (
                    <button
                      type="button"
                      aria-label={`${participant.studentName} entfernen`}
                      onClick={() => onRemove(participant.studentName)}
                    >
                      ×
                    </button>
                  )}
                </li>
              ))
            ) : (
              <li className="is-empty">Warte auf Geräte …</li>
            )}
          </ul>
        ) : (
          <>
            <div className="teacher-live__progress-list">
              {Array.from(
                {
                  length: stationMode
                    ? stationCount
                    : Math.max(connected.length, students.length),
                },
                (_, index) => {
                  const name = stationMode ? undefined : connected[index];
                  const student = stationMode
                    ? students.find((item) => item.stationNumber === index + 1)
                    : students.find((item) => item.studentName === name);
                  if (!name && !student) return null;
                  const label = stationMode
                    ? `Schüler Nr. ${index + 1}`
                    : (name ?? student?.studentName ?? "Unbekannt");
                  const value = student?.finished
                    ? 100
                    : Math.min(
                        100,
                        Math.round(
                          ((student?.currentIndex ?? 0) /
                            Math.max(1, wordsCount)) *
                            100,
                        ),
                      );
                  return (
                    <article key={label}>
                      <div>
                        <strong>{label}</strong>
                        <span>
                          {student?.finished ? "Fertig" : `${value}%`}
                        </span>
                      </div>
                      <progress max="100" value={value}>
                        {value}%
                      </progress>
                      {showStars && student?.finished && (
                        <small>
                          {"★".repeat(
                            Math.max(
                              1,
                              5 -
                                Math.ceil(
                                  student.errors / Math.max(1, wordsCount),
                                ),
                            ),
                          )}
                        </small>
                      )}
                    </article>
                  );
                },
              )}
            </div>
            <div className="teacher-live__error-ranking">
              <strong>Häufigste Fehler</strong>
              {errors.length ? (
                errors.map(([word, count]) => (
                  <div key={word}>
                    <span>{word}</span>
                    <b>{count}</b>
                  </div>
                ))
              ) : (
                <p>Noch keine Fehlerdaten.</p>
              )}
            </div>
          </>
        )}
        <div className="teacher-live__actions">
          {stage === "lobby" ? (
            <button
              type="button"
              className="button button--primary"
              onClick={onStart}
              disabled={busy || connected.length === 0}
            >
              {busy ? "Startet …" : "Sitzung starten"}
            </button>
          ) : (
            <button
              type="button"
              className="button button--quiet"
              onClick={onExport}
              disabled={!students.length}
            >
              Ergebnisse als CSV
            </button>
          )}
          <button
            type="button"
            className="button button--quiet"
            onClick={onEnd}
            disabled={busy}
          >
            Raum beenden
          </button>
        </div>
      </section>
    </div>
  );
}
