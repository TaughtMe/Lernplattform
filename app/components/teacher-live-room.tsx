"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import Link from "next/link";
import { QRCodeCanvas } from "qrcode.react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { VocabularyDirection } from "../../src/domain/running-dictation";
import {
  applyRunningDictationSectionEdits,
  buildRunningDictationSections,
  DEFAULT_TEXT_SPLIT_CONFIG,
  moveRunningDictationSection,
  type ManualRange,
  type TextSplitConfig,
} from "../../src/domain/running-dictation-sections";
import { MULTIPLICATION_TABLES } from "../../src/domain/mental-math";
import { LIVE_APP_VERSION } from "../../src/app-version";
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
import {
  parseLiveSession,
  type VocabularyTransferChoice,
} from "../../src/integrations/laufdiktat/live-session";
import { createLiveRoomDebounce } from "../../src/integrations/laufdiktat/debounce";
import { useHydrated } from "./use-hydrated";

type Props = { liveRoomConfig: LiveRoomConfig | null };
type Stage = "content" | "settings" | "lobby" | "live";

const LABELS: Record<TeacherContentMode, string> = {
  text: "Text",
  vocabulary: "Vokabeln",
  math: "Kopfrechnen",
};
const CONTENT_MODES: TeacherContentMode[] = ["text", "math", "vocabulary"];
const ALL_MODES: Array<{
  id: TeacherGameMode;
  title: string;
  text: string;
  short: string;
  steps: readonly [string, string, string];
}> = [
  {
    id: "LAUFDIKTAT",
    title: "Laufdiktat",
    text: "Abschnitt ansehen, verdecken, aus dem Gedächtnis schreiben und prüfen.",
    short: "2-Finger-Touch zum Einprägen, dann tippen.",
    steps: [
      "Abschnitt einprägen",
      "Zum Schreibfeld wechseln",
      "Eingabe prüfen & bewerten",
    ],
  },
  {
    id: "UEBUNG",
    title: "Freies Üben",
    text: "Einprägen, schreiben und mit optionalen Hilfen verbessern.",
    short: "Vorlesen und gestufte Buchstaben-Hilfe.",
    steps: ["Wort anhören", "Wort eintippen", "Buchstaben-Hilfe nutzen"],
  },
  {
    id: "BATTLE",
    title: "Battle",
    text: "Gleichzeitig üben und durch Lernfortschritt Angriffe aufladen.",
    short: "Gegeneinander, mit Störangriffen.",
    steps: [
      "Gemeinsam starten",
      "Aufgaben lösen & Angriffe laden",
      "Runde vollständig abschließen",
    ],
  },
  {
    id: "STATION",
    title: "Stationen",
    text: "Geteilte Stationsgeräte: Nummer wählen, merken und auf Papier schreiben.",
    short: "Ohne eigenes Gerät, an nummerierten Stationen.",
    steps: [
      "Station auswählen",
      "Abschnitt lesen & merken",
      "Auf Papier schreiben",
    ],
  },
];
const MODES = ALL_MODES;
const DEFAULT_SOURCES: Record<TeacherContentMode, string> = {
  text: "Der Morgen ist kühl. Die Klasse arbeitet konzentriert.",
  vocabulary: "school;Schule\nclassroom;Klassenzimmer\nlibrary;Bibliothek",
  math: "7 + 8\n16 - 9\n6 · 7\n36 : 4",
};
function isOnline(participant: LiveRoomParticipant) {
  return Boolean(
    participant.lastSeenAt &&
    Date.now() - new Date(participant.lastSeenAt).getTime() < 45_000,
  );
}

export function TeacherLiveRoom({ liveRoomConfig }: Props) {
  const hydrated = useHydrated();
  const [stage, setStage] = useState<Stage>("content");
  const [contentMode, setContentMode] = useState<TeacherContentMode>("text");
  const [sectionManagerOpen, setSectionManagerOpen] = useState(false);
  const [sources, setSources] = useState(DEFAULT_SOURCES);
  const [splitConfig, setSplitConfig] = useState<TextSplitConfig>(
    DEFAULT_TEXT_SPLIT_CONFIG,
  );
  const [manualRanges, setManualRanges] = useState<ManualRange[]>([]);
  const [excludedSectionIds, setExcludedSectionIds] = useState<string[]>([]);
  const [sectionOrder, setSectionOrder] = useState<string[]>([]);
  const [customDelimiter, setCustomDelimiter] = useState("");
  const [direction, setDirection] =
    useState<VocabularyDirection>("left-to-right");
  const [vocabularyTransfer, setVocabularyTransfer] =
    useState<VocabularyTransferChoice>("errors");
  const [gameMode, setGameMode] = useState<TeacherGameMode>("LAUFDIKTAT");
  const mainRef = useRef<HTMLElement>(null);
  const builderRef = useRef<HTMLElement>(null);
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
  const [mathAllowNegative, setMathAllowNegative] = useState(false);
  const [mathExcludeZeroOperand, setMathExcludeZeroOperand] = useState(false);
  const [mathExcludeZeroResult, setMathExcludeZeroResult] = useState(false);
  const [mathGap, setMathGap] = useState(false);
  const [mathTables, setMathTables] = useState<number[]>([]);
  const [room, setRoom] = useState<OpenedLiveRoom | null>(null);
  const [participants, setParticipants] = useState<LiveRoomParticipant[]>([]);
  const [presenceNames, setPresenceNames] = useState<string[]>([]);
  const [students, setStudents] = useState<LiveRoomStudent[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const channelRef = useRef<RealtimeChannel | null>(null);
  const sourceRef = useRef<HTMLTextAreaElement>(null);

  const source = sources[contentMode];
  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, [stage]);
  useEffect(() => {
    if (builderRef.current) builderRef.current.scrollTop = 0;
  }, [contentMode]);
  const textSections = useMemo(
    () =>
      buildRunningDictationSections(sources.text, splitConfig, manualRanges),
    [manualRanges, sources.text, splitConfig],
  );
  const orderedTextSections = useMemo(
    () =>
      applyRunningDictationSectionEdits(
        textSections,
        excludedSectionIds,
        sectionOrder,
      ),
    [excludedSectionIds, sectionOrder, textSections],
  );
  const displayedTextSections = useMemo(() => {
    const rank = new Map(sectionOrder.map((id, index) => [id, index]));
    return [...textSections].sort((left, right) => {
      const leftRank = rank.get(left.id);
      const rightRank = rank.get(right.id);
      if (leftRank === undefined && rightRank === undefined) return 0;
      if (leftRank === undefined) return 1;
      if (rightRank === undefined) return -1;
      return leftRank - rightRank;
    });
  }, [sectionOrder, textSections]);
  const words = useMemo(
    () =>
      contentMode === "text"
        ? orderedTextSections.map((section) => ({
            id: section.id,
            kind: "text" as const,
            targetWord: section.text,
          }))
        : buildTeacherWords(contentMode, source, direction),
    [contentMode, direction, orderedTextSections, source],
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
        vocabularyTransfer,
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
        wordsOverride: words,
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
      vocabularyTransfer,
      showStars,
      shuffleWords,
      source,
      stationCount,
      stationShuffle,
      strictTyping,
      tts,
      words,
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
        setGameMode(restored.stationMode ? "STATION" : restored.gameMode);
        setShuffleWords(restored.shuffleWords);
        setStationShuffle(restored.stationShuffle);
        setRepeatWrongAnswers(restored.repeatWrongAnswers);
        setVocabularyTransfer(restored.vocabularyTransfer);
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
    const refreshSoon = createLiveRoomDebounce(() => void refresh(), {
      delayMs: 200,
      maxWaitMs: 1_000,
    });
    channelRef.current = channel;
    const syncPresence = () =>
      setPresenceNames(Object.keys(channel.presenceState()));
    channel
      .on("presence", { event: "sync" }, syncPresence)
      .on("presence", { event: "join" }, syncPresence)
      .on("presence", { event: "leave" }, syncPresence)
      .on("broadcast", { event: "student-progress" }, refreshSoon.schedule)
      .on("broadcast", { event: "student-finished" }, refreshSoon.schedule)
      .on("broadcast", { event: "update-station-state" }, refreshSoon.schedule)
      .subscribe();
    const first = window.setTimeout(() => void refresh(), 0);
    const interval = window.setInterval(
      () => void refresh(),
      stage === "live" ? 3_000 : 8_000,
    );
    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
      refreshSoon.cancel();
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
          payload: { appVersion: LIVE_APP_VERSION },
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
    ["live", "Durchführung & Auswertung"],
  ];
  const activeStepIndex = steps.findIndex(([id]) => id === stage);
  const activeMode = MODES.find((mode) => mode.id === gameMode) ?? MODES[0]!;
  const footerLabel =
    stage === "content"
      ? "Weiter zur Konfiguration"
      : stage === "settings"
        ? "Lobby öffnen"
        : stage === "lobby"
          ? gameMode === "STATION"
            ? "Stationen starten"
            : "Diktat jetzt starten"
          : "Sitzung beenden";
  const footerDisabled =
    busy ||
    (stage === "content" && !words.length) ||
    (stage === "lobby" &&
      gameMode !== "STATION" &&
      connectedNames.length === 0);

  function goBack() {
    setError("");
    if (stage === "settings") setStage("content");
    if (stage === "lobby") setStage("settings");
    if (stage === "live") setStage("lobby");
  }

  function goForward() {
    setError("");
    if (stage === "content") setStage("settings");
    if (stage === "settings") void openLobby();
    if (stage === "lobby") void startSession();
    if (stage === "live") void endRoom();
  }

  return (
    <section
      className="teacher-live"
      aria-labelledby="teacher-live-title"
      data-hydrated={hydrated ? "true" : "false"}
    >
      <h1 className="sr-only" id="teacher-live-title">
        Laufdiktat Lehrerdashboard
      </h1>
      <header className="teacher-live__dashboard-header">
        <div className="teacher-live__brand-row">
          <Link
            href="/"
            className="teacher-live__brand"
            aria-label="Zur Startseite"
          >
            <span className="teacher-live__home" aria-hidden="true">
              ⌂
            </span>
            <span>
              <strong>Lernraum · Laufdiktat</strong>
              <small>Lehrkraft-Dashboard</small>
            </span>
          </Link>
          <span className="teacher-local-note">
            {room ? `Raum ${room.code}` : "Vorbereitung"}
          </span>
        </div>
        <div className="teacher-live__step-row">
          <p>
            <span>Schritt {activeStepIndex + 1} von 4</span>
            <b aria-hidden="true">·</b>
            <strong>{steps[activeStepIndex]?.[1]}</strong>
          </p>
          <nav className="teacher-live__steps" aria-label="Schritte">
            {steps.map(([id, label], index) => {
              const isCurrent = stage === id;
              const isDone = index < activeStepIndex;
              const isLocked =
                (index > 0 && !words.length) ||
                (id === "lobby" && !room && stage !== "settings") ||
                (id === "live" && stage !== "live");
              return (
                <span className="teacher-live__step" key={id}>
                  {index > 0 ? <i aria-hidden="true" /> : null}
                  <button
                    type="button"
                    className={
                      isCurrent ? "is-current" : isDone ? "is-done" : ""
                    }
                    aria-current={isCurrent ? "step" : undefined}
                    aria-label={`${index + 1}. ${label}`}
                    disabled={isLocked}
                    onClick={() =>
                      id === "lobby" && !room ? void openLobby() : setStage(id)
                    }
                  >
                    <span aria-hidden="true">{isDone ? "✓" : index + 1}</span>
                    {isCurrent ? <strong>{label}</strong> : null}
                  </button>
                </span>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="teacher-live__main" ref={mainRef}>
        {stage === "content" && (
          <div className="teacher-live__import-step">
            <div className="teacher-live__import-tabs-row">
              <div
                className="teacher-live__import-tabs"
                role="tablist"
                aria-label="Aufgabenformat"
              >
                {CONTENT_MODES.map((mode) => (
                  <button
                    type="button"
                    role="tab"
                    key={mode}
                    aria-selected={contentMode === mode}
                    disabled={!hydrated}
                    onClick={() => {
                      setContentMode(mode);
                      if (mode === "vocabulary") setShuffleWords(true);
                    }}
                  >
                    {LABELS[mode]}
                  </button>
                ))}
              </div>
              {contentMode === "text" ? (
                <label className="teacher-live__upload-pill">
                  <span aria-hidden="true">⇧</span> Dokument hochladen
                  <input
                    className="sr-only"
                    type="file"
                    accept=".txt,.csv,text/plain,text/csv"
                    onChange={(event) => importFile(event.target.files?.[0])}
                  />
                </label>
              ) : null}
            </div>
            <section
              className="teacher-live__builder"
              ref={builderRef}
              role="tabpanel"
              aria-label={`${LABELS[contentMode]} bearbeiten`}
            >
              <div className="teacher-live__content-summary">
                <span>{LABELS[contentMode]}</span>
                <div className="teacher-live__content-summary-end">
                  <strong>{words.length} Aufgaben</strong>
                  {contentMode === "text" ? (
                    <button
                      type="button"
                      className="teacher-live__section-toggle"
                      disabled={!displayedTextSections.length}
                      onClick={() => setSectionManagerOpen(true)}
                    >
                      Abschnitte verwalten
                    </button>
                  ) : null}
                </div>
              </div>
              {contentMode === "math" && (
                <div className="teacher-live__math-workbench">
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
                            allowNegativeResults: mathAllowNegative,
                            excludeZeroOperand: mathExcludeZeroOperand,
                            excludeZeroResult: mathExcludeZeroResult,
                            multiplicationTables: mathTables,
                            gapMode: mathGap,
                          }),
                        }))
                      }
                    >
                      Aufgaben erzeugen
                    </button>
                  </div>
                  <div className="teacher-live__math-rules">
                    <Option
                      label="Negative Ergebnisse"
                      checked={mathAllowNegative}
                      set={setMathAllowNegative}
                    />
                    <Option
                      label="0 als Rechenzahl vermeiden"
                      checked={mathExcludeZeroOperand}
                      set={setMathExcludeZeroOperand}
                    />
                    <Option
                      label="Ergebnis 0 vermeiden"
                      checked={mathExcludeZeroResult}
                      set={setMathExcludeZeroResult}
                    />
                    <Option
                      label="Lückenaufgaben"
                      checked={mathGap}
                      set={setMathGap}
                    />
                  </div>
                  {mathOps.some(
                    (operation) => operation === "*" || operation === "/",
                  ) ? (
                    <fieldset className="teacher-live__math-tables">
                      <legend>
                        Einmaleins-Reihen · nichts gewählt bedeutet alle
                      </legend>
                      {MULTIPLICATION_TABLES.map((table) => (
                        <button
                          type="button"
                          key={table}
                          aria-pressed={mathTables.includes(table)}
                          onClick={() =>
                            setMathTables((active) =>
                              active.includes(table)
                                ? active.filter((entry) => entry !== table)
                                : [...active, table].sort(
                                    (left, right) => left - right,
                                  ),
                            )
                          }
                        >
                          {table}
                        </button>
                      ))}
                    </fieldset>
                  ) : null}
                </div>
              )}
              {contentMode === "text" && (
                <section
                  className="teacher-live__split-workbench"
                  aria-labelledby="split-title"
                >
                  <div className="teacher-panel__heading">
                    <div>
                      <p className="eyebrow">Text aufteilen</p>
                      <h3 id="split-title">Trennregeln</h3>
                    </div>
                    <span>{orderedTextSections.length} Abschnitte aktiv</span>
                  </div>
                  <div className="teacher-live__split-toggles">
                    <Option
                      label="Nach Zeichen trennen"
                      checked={splitConfig.punctuationEnabled}
                      set={(value) =>
                        setSplitConfig((current) => ({
                          ...current,
                          punctuationEnabled: value,
                        }))
                      }
                    />
                    <Option
                      label="Nach Enter trennen"
                      checked={splitConfig.newlineEnabled}
                      set={(value) =>
                        setSplitConfig((current) => ({
                          ...current,
                          newlineEnabled: value,
                        }))
                      }
                    />
                  </div>
                  {splitConfig.punctuationEnabled ? (
                    <div
                      className="teacher-live__punctuation"
                      aria-label="Trennzeichen"
                    >
                      {[".", ",", "!", "?", ";", ":"].map((character) => (
                        <button
                          type="button"
                          key={character}
                          aria-pressed={splitConfig.punctuation.includes(
                            character,
                          )}
                          onClick={() =>
                            setSplitConfig((current) => ({
                              ...current,
                              punctuation: current.punctuation.includes(
                                character,
                              )
                                ? current.punctuation.filter(
                                    (item) => item !== character,
                                  )
                                : [...current.punctuation, character],
                            }))
                          }
                        >
                          {character}
                        </button>
                      ))}
                      <div className="teacher-live__custom-delimiter">
                        <label htmlFor="custom-delimiter">
                          Eigener Trenner
                        </label>
                        <input
                          id="custom-delimiter"
                          value={customDelimiter}
                          maxLength={20}
                          onChange={(event) =>
                            setCustomDelimiter(event.target.value)
                          }
                        />
                        <button
                          type="button"
                          disabled={!customDelimiter}
                          onClick={() => {
                            const value = customDelimiter;
                            setSplitConfig((current) => ({
                              ...current,
                              customDelimiters: [
                                ...current.customDelimiters,
                                { id: crypto.randomUUID(), value },
                              ],
                            }));
                            setCustomDelimiter("");
                          }}
                        >
                          Hinzufügen
                        </button>
                      </div>
                      {splitConfig.customDelimiters.length ? (
                        <div
                          className="teacher-live__delimiter-list"
                          aria-label="Eigene Trenner"
                        >
                          {splitConfig.customDelimiters.map((delimiter) => (
                            <button
                              key={delimiter.id}
                              type="button"
                              aria-label={`Trenner ${delimiter.value} entfernen`}
                              onClick={() =>
                                setSplitConfig((current) => ({
                                  ...current,
                                  customDelimiters:
                                    current.customDelimiters.filter(
                                      ({ id }) => id !== delimiter.id,
                                    ),
                                }))
                              }
                            >
                              {delimiter.value}{" "}
                              <span aria-hidden="true">×</span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {splitConfig.newlineEnabled ? (
                    <fieldset className="teacher-live__newline-mode">
                      <legend>Trennen bei</legend>
                      <label>
                        <input
                          type="radio"
                          checked={splitConfig.newlineMode === "line"}
                          onChange={() =>
                            setSplitConfig((current) => ({
                              ...current,
                              newlineMode: "line",
                            }))
                          }
                        />
                        jeder neuen Zeile
                      </label>
                      <label>
                        <input
                          type="radio"
                          checked={splitConfig.newlineMode === "paragraph"}
                          onChange={() =>
                            setSplitConfig((current) => ({
                              ...current,
                              newlineMode: "paragraph",
                            }))
                          }
                        />
                        nur Leerzeilen
                      </label>
                    </fieldset>
                  ) : null}
                </section>
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
                  ref={sourceRef}
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
              {contentMode === "text" && source ? (
                <>
                  <div className="teacher-live__marker-actions">
                    <button
                      type="button"
                      className="button button--quiet"
                      onClick={() => {
                        const control = sourceRef.current;
                        if (
                          !control ||
                          control.selectionEnd <= control.selectionStart
                        )
                          return;
                        setManualRanges((current) => [
                          ...current,
                          {
                            id: crypto.randomUUID(),
                            type: "section",
                            start: control.selectionStart,
                            end: control.selectionEnd,
                          },
                        ]);
                      }}
                    >
                      Markierung als Abschnitt
                    </button>
                    <button
                      type="button"
                      className="button button--quiet"
                      onClick={() => {
                        const position = sourceRef.current?.selectionStart ?? 0;
                        setManualRanges((current) => [
                          ...current,
                          {
                            id: crypto.randomUUID(),
                            type: "split",
                            start: position,
                            end: position,
                          },
                        ]);
                      }}
                    >
                      Hier trennen
                    </button>
                    <button
                      type="button"
                      className="text-button"
                      disabled={!manualRanges.length}
                      onClick={() => setManualRanges([])}
                    >
                      Manuelle Marken entfernen
                    </button>
                  </div>
                </>
              ) : null}
              {sectionManagerOpen && contentMode === "text" ? (
                <div className="teacher-live__section-dialog-backdrop">
                  <div
                    className="teacher-live__section-dialog"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Abschnitte verwalten"
                  >
                    <div className="teacher-live__section-dialog-heading">
                      <h3>Abschnitte verwalten</h3>
                      <button
                        type="button"
                        aria-label="Schließen"
                        onClick={() => setSectionManagerOpen(false)}
                      >
                        ×
                      </button>
                    </div>
                    <p>
                      Ausschließen oder umsortieren – der Text selbst bleibt
                      unverändert.
                    </p>
                    <ol
                      className="teacher-live__section-manager"
                      aria-label="Abschnittsliste"
                    >
                      {displayedTextSections.map((section, index) => (
                        <li key={section.id}>
                          <label>
                            <input
                              type="checkbox"
                              checked={!excludedSectionIds.includes(section.id)}
                              onChange={() =>
                                setExcludedSectionIds((current) =>
                                  current.includes(section.id)
                                    ? current.filter((id) => id !== section.id)
                                    : [...current, section.id],
                                )
                              }
                            />
                            <span>{section.text}</span>
                          </label>
                          <div>
                            <button
                              type="button"
                              aria-label={`Abschnitt ${index + 1} nach oben`}
                              disabled={index === 0}
                              onClick={() => {
                                const ids = displayedTextSections.map(
                                  ({ id }) => id,
                                );
                                setSectionOrder(
                                  moveRunningDictationSection(
                                    ids,
                                    index,
                                    index - 1,
                                  ),
                                );
                              }}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              aria-label={`Abschnitt ${index + 1} nach unten`}
                              disabled={
                                index === displayedTextSections.length - 1
                              }
                              onClick={() => {
                                const ids = displayedTextSections.map(
                                  ({ id }) => id,
                                );
                                setSectionOrder(
                                  moveRunningDictationSection(
                                    ids,
                                    index,
                                    index + 1,
                                  ),
                                );
                              }}
                            >
                              ↓
                            </button>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              ) : null}
              <div className="teacher-live__import-row">
                {contentMode !== "text" ? (
                  <label className="button button--quiet">
                    Datei importieren
                    <input
                      className="sr-only"
                      type="file"
                      accept=".txt,.csv,text/plain,text/csv"
                      onChange={(e) => importFile(e.target.files?.[0])}
                    />
                  </label>
                ) : null}
                {contentMode === "vocabulary" && (
                  <>
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
                    <label className="teacher-live__select">
                      Vokabeln nach der Runde übernehmen
                      <select
                        value={vocabularyTransfer}
                        onChange={(event) =>
                          setVocabularyTransfer(
                            event.target.value as VocabularyTransferChoice,
                          )
                        }
                      >
                        <option value="errors">Nur fehlerhafte Vokabeln</option>
                        <option value="all">Alle Vokabeln</option>
                        <option value="none">Keine Vokabeln</option>
                      </select>
                    </label>
                  </>
                )}
              </div>
            </section>
          </div>
        )}

        {stage === "settings" && (
          <div className="teacher-live__settings-grid">
            <div
              className="teacher-live__mode-list"
              aria-label="Spielmodus wählen"
              role="radiogroup"
            >
              <p>Spielmodus wählen</p>
              {MODES.map((mode) => (
                <button
                  type="button"
                  key={mode.id}
                  className={gameMode === mode.id ? "is-active" : ""}
                  role="radio"
                  aria-checked={gameMode === mode.id}
                  onClick={() => setGameMode(mode.id)}
                >
                  <ModeIcon mode={mode.id} />
                  <span>
                    <strong>{mode.title}</strong>
                    <small>{mode.short}</small>
                  </span>
                  <i aria-hidden="true">{gameMode === mode.id ? "✓" : ""}</i>
                </button>
              ))}
            </div>
            <aside className="teacher-live__options">
              <div className="teacher-live__mode-heading">
                <ModeIcon mode={activeMode.id} />
                <h2>{activeMode.title}</h2>
              </div>
              <p className="teacher-live__mode-description">
                {activeMode.text}
              </p>
              <div className="teacher-live__flow">
                <h3>Ablauf</h3>
                <ol>
                  {activeMode.steps.map((step, index) => (
                    <li key={step}>
                      <span>{index + 1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
              <hr />
              <h3>Optionen</h3>
              {gameMode === "UEBUNG" && (
                <>
                  <Option
                    label="Fehlerhilfe mit Lösung"
                    checked={assistance}
                    set={setAssistance}
                  />
                  {assistance && (
                    <>
                      <StepperRow
                        label="Fehlversuche bis Lösung"
                        value={attempts}
                        onChange={setAttempts}
                        min={1}
                        max={10}
                      />
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
                  <StepperRow
                    label="Anzahl Schülernummern"
                    value={stationCount}
                    onChange={setStationCount}
                    min={1}
                    max={100}
                  />
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
                set={
                  gameMode === "STATION" ? setStationShuffle : setShuffleWords
                }
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
      </main>

      <footer className="teacher-live__wizard-footer">
        <button
          type="button"
          className="teacher-live__back"
          onClick={goBack}
          disabled={stage === "content"}
          aria-hidden={stage === "content"}
          tabIndex={stage === "content" ? -1 : 0}
        >
          ← Zurück
        </button>
        {stage === "live" && room ? (
          <div className="teacher-live__footer-code">
            <small>Raum-Code</small>
            <strong>{room.code}</strong>
          </div>
        ) : (
          <div className="teacher-live__footer-meta">
            <a href="/impressum">Impressum</a>
            <a href="/datenschutz">Datenschutz</a>
            <small className="teacher-live__version">v{LIVE_APP_VERSION}</small>
          </div>
        )}
        <button
          type="button"
          className={`teacher-live__next teacher-live__next--${stage}`}
          onClick={goForward}
          disabled={footerDisabled}
        >
          {busy
            ? stage === "settings"
              ? "Öffnet …"
              : stage === "lobby"
                ? "Startet …"
                : stage === "live"
                  ? "Beendet …"
                  : footerLabel
            : footerLabel}{" "}
          {stage === "live" ? "" : "→"}
        </button>
      </footer>
    </section>
  );
}

function ModeIcon({ mode }: { mode: TeacherGameMode }) {
  return (
    <span
      className={`teacher-live__mode-icon is-${mode.toLowerCase()}`}
      aria-hidden="true"
    >
      {mode === "LAUFDIKTAT" ? (
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="4" r="2" />
          <path d="M12 7v6m0-4-5 2m5-2 5 2m-5 2-4 7m4-7 4 7" />
        </svg>
      ) : mode === "UEBUNG" ? (
        <svg viewBox="0 0 24 24">
          <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
          <path d="M4 14v4a2 2 0 0 0 2 2h2v-8H6a2 2 0 0 0-2 2Zm16 0v4a2 2 0 0 1-2 2h-2v-8h2a2 2 0 0 1 2 2Z" />
        </svg>
      ) : mode === "BATTLE" ? (
        <svg viewBox="0 0 24 24">
          <path d="m5 3 7 7-3 3-7-7 3-3Zm14 0-7 7 3 3 7-7-3-3ZM6 15l3 3-4 3-2-2 3-4Zm12 0-3 3 4 3 2-2-3-4Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24">
          <path d="M12 22s7-6.2 7-13A7 7 0 1 0 5 9c0 6.8 7 13 7 13Z" />
          <circle cx="12" cy="9" r="2.5" />
        </svg>
      )}
    </span>
  );
}

function Stepper({
  value,
  onChange,
  min,
  max,
}: {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div className="teacher-live__stepper">
      <button
        type="button"
        aria-label="Weniger"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next))
            onChange(Math.min(max, Math.max(min, next)));
        }}
      />
      <button
        type="button"
        aria-label="Mehr"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        +
      </button>
    </div>
  );
}

function StepperRow({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div className="teacher-live__stepper-row">
      <span>{label}</span>
      <Stepper value={value} onChange={onChange} min={min} max={max} />
    </div>
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
  onExport: () => void;
  onRemove: (name: string) => void;
}) {
  const [showLargeQr, setShowLargeQr] = useState(false);
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

  if (stage === "live") {
    return (
      <div className="teacher-live__live-step">
        <p className="teacher-live__live-label">
          <span aria-hidden="true" /> Live-Sitzung
        </p>
        <div className="teacher-live__stats teacher-live__stats--large">
          <div>
            <span>
              <i /> Aktiv
            </span>
            <strong>
              {Math.max(
                0,
                (stationMode ? trackedStudents.length : connected.length) -
                  finished,
              )}
            </strong>
          </div>
          <div>
            <span>
              <i /> Fertig
            </span>
            <strong>{finished}</strong>
          </div>
          <div>
            <span>
              <i /> Gesamtfortschritt
            </span>
            <strong>{progress}%</strong>
          </div>
        </div>
        <div className="teacher-live__live-grid">
          <section className="teacher-live__live-students">
            <div className="teacher-live__live-panel-heading">
              <strong>{stationMode ? "Stationen" : "Schüler"}</strong>
              <button
                type="button"
                onClick={onExport}
                disabled={!students.length}
              >
                ⇩ Ergebnisse exportieren (CSV)
              </button>
            </div>
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
                      {showStars && student?.finished ? (
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
                      ) : null}
                    </article>
                  );
                },
              )}
              {!trackedStudents.length ? (
                <p>Noch keine Fortschrittsdaten.</p>
              ) : null}
            </div>
          </section>
          <aside className="teacher-live__error-ranking">
            <strong>Häufigste Fehler</strong>
            {errors.length ? (
              errors.map(([word, count]) => (
                <div key={word}>
                  <span>{word}</span>
                  <b>{count}</b>
                </div>
              ))
            ) : (
              <p>Noch keine Ergebnisse.</p>
            )}
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="teacher-live__lobby">
      <section className="teacher-live__access">
        {joinUrl && (
          <button
            type="button"
            className="teacher-live__qr"
            onClick={() => setShowLargeQr(true)}
            aria-label="QR-Code groß anzeigen"
          >
            <QRCodeCanvas value={joinUrl} size={220} level="H" marginSize={2} />
            <strong>Mit Schülergerät scannen</strong>
            <small>Zum Vergrößern anklicken</small>
          </button>
        )}
        <div className="teacher-live__code-card">
          <p className="teacher-live__code-label">oder Raum-Code eingeben</p>
          <strong className="teacher-live__code">{room.code}</strong>
        </div>
      </section>
      <section className="teacher-live__participants">
        <div className="teacher-live__lobby-heading">
          <span aria-hidden="true" />
          <strong>{connected.length} verbunden</strong>
        </div>
        {participants.length ? (
          <ul className="teacher-live__student-list">
            {participants.map((participant) => (
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
                {!connected.includes(participant.studentName) ? (
                  <button
                    type="button"
                    aria-label={`${participant.studentName} entfernen`}
                    onClick={() => onRemove(participant.studentName)}
                  >
                    ×
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <div className="teacher-live__waiting">
            <span aria-hidden="true">⌁</span>
            <strong>Warte auf Verbindung …</strong>
            <p>
              Sobald mindestens ein Gerät verbunden ist, kannst du das Diktat
              starten.
            </p>
          </div>
        )}
      </section>
      {showLargeQr ? (
        <div
          className="teacher-live__qr-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="QR-Code"
        >
          <button
            type="button"
            onClick={() => setShowLargeQr(false)}
            aria-label="QR-Code schließen"
          >
            ×
          </button>
          <QRCodeCanvas value={joinUrl} size={420} level="H" marginSize={2} />
          <strong>Raum {room.code}</strong>
        </div>
      ) : null}
    </div>
  );
}
