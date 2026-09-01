"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import Link from "next/link";
import { QRCodeCanvas } from "qrcode.react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  parseVocabularyTable,
  type VocabularyDirection,
  type VocabularyPair,
} from "../../src/domain/running-dictation";
import {
  applyRunningDictationSectionEdits,
  buildRunningDictationSections,
  DEFAULT_TEXT_SPLIT_CONFIG,
  moveRunningDictationSection,
  type ManualRange,
  type TextSplitConfig,
} from "../../src/domain/running-dictation-sections";
import {
  buildMentalMathTask,
  displayMathNumber,
  MULTIPLICATION_TABLES,
  parseMentalMathExpression,
  type MathGapSlot,
  type MathOperator,
} from "../../src/domain/mental-math";
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
import { AnimalAvatar } from "./animal-avatar";
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
  text: "",
  vocabulary: "",
  math: "7 + 8\n16 - 9\n6 · 7\n36 : 4",
};
function isOnline(participant: LiveRoomParticipant) {
  return Boolean(
    participant.lastSeenAt &&
    Date.now() - new Date(participant.lastSeenAt).getTime() < 45_000,
  );
}

const emptyVocabularySide = () => ({ primary: "", alternatives: [] });
const emptyVocabularyPair = (): VocabularyPair => ({
  id: crypto.randomUUID(),
  left: emptyVocabularySide(),
  right: emptyVocabularySide(),
});

export function TeacherLiveRoom({ liveRoomConfig }: Props) {
  const hydrated = useHydrated();
  const [stage, setStage] = useState<Stage>("content");
  const [contentMode, setContentMode] = useState<TeacherContentMode>("text");
  const [sectionManagerOpen, setSectionManagerOpen] = useState(false);
  const [markerMode, setMarkerMode] = useState(false);
  const [markerAnchor, setMarkerAnchor] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const [mathSettingsOpen, setMathSettingsOpen] = useState(false);
  const [mathEditIndex, setMathEditIndex] = useState<number | null>(null);
  const [mathDraft, setMathDraft] = useState("");
  const mathEditInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (mathEditIndex !== null) mathEditInputRef.current?.focus();
  }, [mathEditIndex]);
  const [vocabularyPairs, setVocabularyPairs] = useState<VocabularyPair[]>([
    emptyVocabularyPair(),
  ]);
  const [vocabularyCaseSensitive, setVocabularyCaseSensitive] = useState(false);
  const [vocabularyTableInput, setVocabularyTableInput] = useState("");
  const serializeVocabularyPairs = (pairs: VocabularyPair[]) =>
    pairs
      .map((pair) => {
        const side = (value: VocabularyPair["left"]) =>
          [value.primary, ...value.alternatives].filter(Boolean).join("|");
        return `${side(pair.left)};${side(pair.right)}`;
      })
      .join("\n");
  const applyVocabularyPairs = (pairs: VocabularyPair[]) => {
    setVocabularyPairs(pairs);
    setSources((current) => ({
      ...current,
      vocabulary: serializeVocabularyPairs(pairs),
    }));
  };
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
  const markerPieces = useMemo(() => {
    const pieces: Array<
      | { kind: "gap"; text: string }
      | {
          kind: "auto" | "manual";
          text: string;
          start: number;
          end: number;
        }
    > = [];
    let cursor = 0;
    for (const section of textSections) {
      if (section.start > cursor) {
        pieces.push({ kind: "gap", text: source.slice(cursor, section.start) });
      }
      pieces.push({
        kind: section.source,
        text: section.text,
        start: section.start,
        end: section.end,
      });
      cursor = section.end;
    }
    if (cursor < source.length) {
      pieces.push({ kind: "gap", text: source.slice(cursor) });
    }
    return pieces;
  }, [source, textSections]);

  function handleMarkerSectionClick(section: {
    start: number;
    end: number;
    source: "auto" | "manual";
  }) {
    if (section.source === "manual") {
      setManualRanges((current) =>
        current.filter(
          (range) =>
            !(
              range.type === "section" &&
              range.start === section.start &&
              range.end === section.end
            ),
        ),
      );
      setMarkerAnchor(null);
      return;
    }
    if (!markerAnchor) {
      setMarkerAnchor({ start: section.start, end: section.end });
      return;
    }
    const start = Math.min(markerAnchor.start, section.start);
    const end = Math.max(markerAnchor.end, section.end);
    setManualRanges((current) => [
      ...current,
      { id: crypto.randomUUID(), type: "section", start, end },
    ]);
    setMarkerAnchor(null);
  }

  const words = useMemo(
    () =>
      contentMode === "text"
        ? orderedTextSections.map((section) => ({
            id: section.id,
            kind: "text" as const,
            targetWord: section.text,
          }))
        : buildTeacherWords(
            contentMode,
            source,
            direction,
            vocabularyCaseSensitive,
          ),
    [
      contentMode,
      direction,
      orderedTextSections,
      source,
      vocabularyCaseSensitive,
    ],
  );
  const mathLines = useMemo(
    () =>
      sources.math
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0),
    [sources.math],
  );

  function generateSingleMathLine() {
    return generateMentalMathSource({
      count: 1,
      min: mathMin,
      max: mathMax,
      operations: mathOps.length ? mathOps : ["+"],
      allowNegativeResults: mathAllowNegative,
      excludeZeroOperand: mathExcludeZeroOperand,
      excludeZeroResult: mathExcludeZeroResult,
      multiplicationTables: mathTables,
      gapMode: mathGap,
    }).trim();
  }

  function commitMathLines(lines: string[]) {
    setSources((current) => ({ ...current, math: lines.join("\n") }));
  }

  function startEditMathRow(index: number) {
    setMathEditIndex(index);
    setMathDraft(mathLines[index] ?? "");
  }

  function displayMathLine(line: string) {
    const arrowIndex = line.indexOf("=>");
    return arrowIndex === -1 ? line : line.slice(0, arrowIndex).trim();
  }

  function symbolToMathOperator(symbol: string): MathOperator {
    if (symbol === "-" || symbol === "−") return "-";
    if (symbol === "*" || symbol === "×" || symbol === "·") return "*";
    if (symbol === "/" || symbol === ":" || symbol === "÷") return "/";
    return "+";
  }

  type MathGapPickerLine = {
    a: number;
    op: MathOperator;
    b: number;
    result: number;
    gap: MathGapSlot | null;
  };

  function parseMathLineForGapPicker(line: string): MathGapPickerLine | null {
    const arrowIndex = line.indexOf("=>");
    if (arrowIndex === -1) {
      const expr = parseMentalMathExpression(line);
      return expr
        ? {
            a: expr.left,
            op: expr.operator,
            b: expr.right,
            result: expr.result,
            gap: null,
          }
        : null;
    }
    const promptPart = line.slice(0, arrowIndex).trim();
    const hidden = Number.parseFloat(
      line
        .slice(arrowIndex + 2)
        .trim()
        .replace(",", "."),
    );
    const match = promptPart.match(
      /^(_|\(?-?\d+(?:[.,]\d+)?\)?)\s*([+\-−*×·/:÷])\s*(_|\(?-?\d+(?:[.,]\d+)?\)?)\s*=\s*(_|\(?-?\d+(?:[.,]\d+)?\)?)$/,
    );
    if (!match || !Number.isFinite(hidden)) return null;
    const [, rawA, rawOp, rawB, rawResult] = match;
    const toValue = (raw: string) =>
      raw === "_"
        ? hidden
        : Number.parseFloat(raw.replace(/[()]/g, "").replace(",", "."));
    const gap: MathGapSlot =
      rawA === "_" ? "left" : rawB === "_" ? "right" : "result";
    return {
      a: toValue(rawA!),
      op: symbolToMathOperator(rawOp!),
      b: toValue(rawB!),
      result: toValue(rawResult!),
      gap,
    };
  }

  function setMathLineGap(index: number, slot: MathGapSlot) {
    const parsed = parseMathLineForGapPicker(mathLines[index] ?? "");
    if (!parsed) return;
    const task = buildMentalMathTask(
      {
        left: parsed.a,
        operator: parsed.op,
        right: parsed.b,
        result: parsed.result,
      },
      index,
      slot,
    );
    const lines = [...mathLines];
    lines[index] = `${task.prompt} => ${task.answer}`;
    commitMathLines(lines);
  }

  const MATH_TOOLBAR_ITEMS = [
    { label: "+", insert: " + " },
    { label: "−", insert: " − " },
    { label: "·", insert: " · " },
    { label: ":", insert: " : " },
    { label: "( )", insert: "()" },
  ];

  function insertAtMathCursor(token: string) {
    const el = mathEditInputRef.current;
    const start = el?.selectionStart ?? mathDraft.length;
    const end = el?.selectionEnd ?? start;
    const next = mathDraft.slice(0, start) + token + mathDraft.slice(end);
    setMathDraft(next);
    const pos = start + (token === "()" ? 1 : token.length);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(pos, pos);
    });
  }

  function commitMathEdit(continueEditing: boolean) {
    if (mathEditIndex === null) return;
    const wasAppending = mathEditIndex >= mathLines.length;
    const lines = [...mathLines];
    const value = mathDraft.trim();
    if (wasAppending) {
      if (value) lines.push(value);
    } else if (value) {
      lines[mathEditIndex] = value;
    } else {
      lines.splice(mathEditIndex, 1);
    }
    commitMathLines(lines);
    setMathDraft("");
    setMathEditIndex(
      continueEditing && wasAppending && value ? lines.length : null,
    );
  }

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
        if (nextContentMode === "vocabulary") {
          const parsed = parseVocabularyTable(restoredSource);
          setVocabularyPairs(
            parsed.length > 0 ? parsed : [emptyVocabularyPair()],
          );
        }
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
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setSources((current) => ({ ...current, [contentMode]: text }));
      if (contentMode === "vocabulary") {
        const parsed = parseVocabularyTable(text);
        setVocabularyPairs(
          parsed.length > 0 ? parsed : [emptyVocabularyPair()],
        );
      }
    };
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
                      if (mode === "vocabulary") {
                        setShuffleWords(true);
                        const parsed = parseVocabularyTable(sources.vocabulary);
                        setVocabularyPairs(
                          parsed.length > 0 ? parsed : [emptyVocabularyPair()],
                        );
                      }
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
              {contentMode === "text" ? (
                <div className="teacher-live__content-summary">
                  <span>{LABELS[contentMode]}</span>
                  <div className="teacher-live__content-summary-end">
                    <strong>{words.length} Abschnitte</strong>
                    <button
                      type="button"
                      className="teacher-live__section-toggle"
                      disabled={!displayedTextSections.length}
                      onClick={() => setSectionManagerOpen(true)}
                    >
                      Abschnitte verwalten
                    </button>
                  </div>
                </div>
              ) : null}
              {contentMode === "math" && (
                <div className="teacher-live__math-workbench">
                  <div className="teacher-live__math-quickbar">
                    <div className="teacher-live__math-oppills">
                      {(["+", "-", "*", "/"] as const).map((op) => (
                        <button
                          type="button"
                          key={op}
                          title={
                            op === "+"
                              ? "Plus-Aufgaben"
                              : op === "-"
                                ? "Minus-Aufgaben"
                                : op === "*"
                                  ? "Mal-Aufgaben"
                                  : "Geteilt-Aufgaben"
                          }
                          aria-pressed={mathOps.includes(op)}
                          onClick={() =>
                            setMathOps((current) =>
                              current.includes(op)
                                ? current.filter((item) => item !== op)
                                : [...current, op],
                            )
                          }
                        >
                          {op === "*" ? "·" : op === "/" ? ":" : op}
                        </button>
                      ))}
                    </div>
                    <div
                      className="teacher-live__stepper-row"
                      title="Höchster Wert in jeder Aufgabe"
                    >
                      <span>Bis:</span>
                      <Stepper
                        value={mathMax}
                        onChange={setMathMax}
                        min={-999}
                        max={1000}
                      />
                    </div>
                    <div className="teacher-live__stepper-row">
                      <span>Anzahl:</span>
                      <Stepper
                        value={mathCount}
                        onChange={setMathCount}
                        min={1}
                        max={50}
                      />
                    </div>
                    <button
                      type="button"
                      className="teacher-live__math-generate"
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
                      ✨ Aufgaben erzeugen
                    </button>
                    <button
                      type="button"
                      className="teacher-live__math-settings-toggle"
                      aria-label="Weitere Regeln"
                      title="Weitere Regeln"
                      onClick={() => setMathSettingsOpen(true)}
                    >
                      ⚙
                    </button>
                  </div>
                  <div className="teacher-live__math-columns">
                    <div className="teacher-live__math-tasklist">
                      <span>{mathLines.length} Aufgaben</span>
                      <div className="teacher-live__math-rows">
                        {mathLines.length === 0 && mathEditIndex === null ? (
                          <p className="teacher-live__math-empty">
                            Noch keine Aufgaben.
                            <br />
                            Oben erzeugen oder unten selbst hinzufügen.
                          </p>
                        ) : (
                          mathLines.map((line, index) =>
                            mathEditIndex === index ? (
                              <div
                                key={`edit-${index}`}
                                className="teacher-live__math-edit-group"
                              >
                                <input
                                  ref={mathEditInputRef}
                                  className="teacher-live__math-edit"
                                  value={mathDraft}
                                  onChange={(event) =>
                                    setMathDraft(event.target.value)
                                  }
                                  onBlur={() => commitMathEdit(false)}
                                  onKeyDown={(event) => {
                                    if (
                                      event.key === "Enter" ||
                                      event.key === "Tab"
                                    ) {
                                      event.preventDefault();
                                      commitMathEdit(true);
                                    }
                                    if (event.key === "Escape") {
                                      setMathDraft("");
                                      setMathEditIndex(null);
                                    }
                                  }}
                                  placeholder="z. B. 4 + 4"
                                />
                                <div className="teacher-live__math-edit-toolbar">
                                  {MATH_TOOLBAR_ITEMS.map((item) => (
                                    <button
                                      key={item.label}
                                      type="button"
                                      onMouseDown={(event) =>
                                        event.preventDefault()
                                      }
                                      onClick={() =>
                                        insertAtMathCursor(item.insert)
                                      }
                                    >
                                      {item.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div
                                key={`${line}-${index}`}
                                className="teacher-live__math-row"
                              >
                                <button
                                  type="button"
                                  className="teacher-live__math-row-text"
                                  title="Zum Bearbeiten klicken"
                                  onClick={() => startEditMathRow(index)}
                                >
                                  {displayMathLine(line)}
                                </button>
                                <button
                                  type="button"
                                  aria-label="Neu würfeln"
                                  title="Neu würfeln"
                                  onClick={() => {
                                    const lines = [...mathLines];
                                    lines[index] = generateSingleMathLine();
                                    commitMathLines(lines);
                                  }}
                                >
                                  ↻
                                </button>
                                <button
                                  type="button"
                                  aria-label="Löschen"
                                  title="Löschen"
                                  onClick={() => {
                                    const lines = [...mathLines];
                                    lines.splice(index, 1);
                                    commitMathLines(lines);
                                    if (mathEditIndex !== null)
                                      setMathEditIndex(null);
                                  }}
                                >
                                  ×
                                </button>
                              </div>
                            ),
                          )
                        )}
                        {mathEditIndex === mathLines.length ? (
                          <div className="teacher-live__math-edit-group">
                            <input
                              ref={mathEditInputRef}
                              className="teacher-live__math-edit"
                              value={mathDraft}
                              onChange={(event) =>
                                setMathDraft(event.target.value)
                              }
                              onBlur={() => commitMathEdit(false)}
                              onKeyDown={(event) => {
                                if (
                                  event.key === "Enter" ||
                                  event.key === "Tab"
                                ) {
                                  event.preventDefault();
                                  commitMathEdit(true);
                                }
                                if (event.key === "Escape") {
                                  setMathDraft("");
                                  setMathEditIndex(null);
                                }
                              }}
                              placeholder="z. B. 4 + 4"
                            />
                            <div className="teacher-live__math-edit-toolbar">
                              {MATH_TOOLBAR_ITEMS.map((item) => (
                                <button
                                  key={item.label}
                                  type="button"
                                  onMouseDown={(event) =>
                                    event.preventDefault()
                                  }
                                  onClick={() =>
                                    insertAtMathCursor(item.insert)
                                  }
                                >
                                  {item.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                      {mathEditIndex !== mathLines.length ? (
                        <button
                          type="button"
                          className="teacher-live__math-add"
                          onClick={() => {
                            setMathEditIndex(mathLines.length);
                            setMathDraft("");
                          }}
                        >
                          + Aufgabe hinzufügen
                        </button>
                      ) : null}
                    </div>
                    <div className="teacher-live__math-preview">
                      <span>{mathGap ? "Vorschau (Lücken)" : "Vorschau"}</span>
                      {mathLines.length === 0 ? (
                        <p className="teacher-live__math-empty">
                          Noch keine Aufgaben.
                          <br />
                          Die Vorschau erscheint, sobald Aufgaben da sind.
                        </p>
                      ) : mathGap ? (
                        <>
                          <p className="teacher-live__math-preview-hint">
                            Tippe die Zahl an, die zur Lücke (_) werden soll.
                          </p>
                          <div className="teacher-live__math-preview-rows">
                            {mathLines.map((line, index) => {
                              const parsed = parseMathLineForGapPicker(line);
                              if (!parsed) {
                                return (
                                  <div
                                    key={`${line}-${index}`}
                                    className="teacher-live__math-preview-row"
                                  >
                                    <span>{index + 1}.</span>
                                    <span>{displayMathLine(line)}</span>
                                  </div>
                                );
                              }
                              const slotButton = (
                                slot: MathGapSlot,
                                value: number,
                              ) => (
                                <button
                                  type="button"
                                  aria-pressed={parsed.gap === slot}
                                  onClick={() => setMathLineGap(index, slot)}
                                >
                                  {parsed.gap === slot
                                    ? "_"
                                    : displayMathNumber(value)}
                                </button>
                              );
                              return (
                                <div
                                  key={`${line}-${index}`}
                                  className="teacher-live__math-preview-row"
                                >
                                  <span>{index + 1}.</span>
                                  {slotButton("left", parsed.a)}
                                  <span aria-hidden="true">
                                    {parsed.op === "*"
                                      ? "·"
                                      : parsed.op === "/"
                                        ? ":"
                                        : parsed.op === "-"
                                          ? "−"
                                          : "+"}
                                  </span>
                                  {slotButton("right", parsed.b)}
                                  <span aria-hidden="true">=</span>
                                  {slotButton("result", parsed.result)}
                                </div>
                              );
                            })}
                          </div>
                        </>
                      ) : (
                        <div className="teacher-live__math-preview-rows">
                          {mathLines.map((line, index) => (
                            <div
                              key={`${line}-${index}`}
                              className="teacher-live__math-preview-row"
                            >
                              <span>{index + 1}.</span>
                              <span>{displayMathLine(line)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {mathSettingsOpen ? (
                <div className="teacher-live__section-dialog-backdrop">
                  <div
                    className="teacher-live__section-dialog"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Weitere Regeln"
                  >
                    <div className="teacher-live__section-dialog-heading">
                      <h3>Weitere Regeln</h3>
                      <button
                        type="button"
                        aria-label="Schließen"
                        onClick={() => setMathSettingsOpen(false)}
                      >
                        ×
                      </button>
                    </div>
                    <div className="teacher-live__math-range">
                      <StepperRow
                        label="Von"
                        value={mathMin}
                        onChange={setMathMin}
                        min={-999}
                        max={mathMax}
                      />
                      <StepperRow
                        label="Bis"
                        value={mathMax}
                        onChange={setMathMax}
                        min={mathMin}
                        max={1000}
                      />
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
                </div>
              ) : null}
              {contentMode === "text" && (
                <section
                  className="teacher-live__split-workbench"
                  aria-label="Trennregeln"
                >
                  <div className="teacher-live__split-toggles">
                    <button
                      type="button"
                      className="teacher-live__rule-toggle"
                      aria-pressed={splitConfig.punctuationEnabled}
                      onClick={() =>
                        setSplitConfig((current) => ({
                          ...current,
                          punctuationEnabled: !current.punctuationEnabled,
                        }))
                      }
                    >
                      {splitConfig.punctuationEnabled ? (
                        <span aria-hidden="true">✓</span>
                      ) : null}
                      Zeichen
                    </button>
                    <button
                      type="button"
                      className="teacher-live__rule-toggle"
                      aria-pressed={splitConfig.newlineEnabled}
                      onClick={() =>
                        setSplitConfig((current) => ({
                          ...current,
                          newlineEnabled: !current.newlineEnabled,
                        }))
                      }
                    >
                      {splitConfig.newlineEnabled ? (
                        <span aria-hidden="true">✓</span>
                      ) : null}
                      Enter
                    </button>
                    <button
                      type="button"
                      className="teacher-live__rule-toggle teacher-live__marker-toggle"
                      aria-pressed={markerMode}
                      disabled={!source.trim()}
                      onClick={() => {
                        setMarkerAnchor(null);
                        setMarkerMode((current) => !current);
                      }}
                    >
                      ✎ Marker
                    </button>
                  </div>
                  <div className="teacher-live__split-panels">
                    <fieldset
                      disabled={!splitConfig.punctuationEnabled}
                      className="teacher-live__character-panel"
                    >
                      <legend>Trennen nach Zeichen</legend>
                      <div
                        className="teacher-live__punctuation"
                        aria-label="Trennzeichen"
                      >
                        {[
                          ".",
                          ",",
                          "!",
                          "?",
                          ...splitConfig.punctuation.filter(
                            (character) =>
                              ![".", ",", "!", "?"].includes(character),
                          ),
                        ].map((character) => (
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
                      </div>
                      <div className="teacher-live__custom-delimiter">
                        <input
                          id="custom-delimiter"
                          aria-label="Eigener Trenner"
                          placeholder="Eigener Trenner …"
                          value={customDelimiter}
                          maxLength={20}
                          onChange={(event) =>
                            setCustomDelimiter(event.target.value)
                          }
                          onKeyDown={(event) => {
                            if (event.key !== "Enter" || !customDelimiter)
                              return;
                            event.preventDefault();
                            setSplitConfig((current) => ({
                              ...current,
                              customDelimiters: [
                                ...current.customDelimiters,
                                {
                                  id: crypto.randomUUID(),
                                  value: customDelimiter,
                                },
                              ],
                            }));
                            setCustomDelimiter("");
                          }}
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
                    </fieldset>
                    <fieldset
                      disabled={!splitConfig.newlineEnabled}
                      className="teacher-live__newline-mode"
                    >
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
                  </div>
                </section>
              )}
              {contentMode === "text" && markerMode ? (
                <div className="teacher-live__marker-editor">
                  <p className="teacher-live__marker-hint">
                    Zwei Abschnitte antippen, um sie zusammenzufassen. Einen
                    markierten Abschnitt antippen, um ihn wieder zu lösen.
                  </p>
                  <div className="teacher-live__marker-text">
                    {markerPieces.map((piece, index) =>
                      piece.kind === "gap" ? (
                        <span key={index}>{piece.text}</span>
                      ) : (
                        <span
                          key={index}
                          role="button"
                          tabIndex={0}
                          className={`teacher-live__marker-piece is-${piece.kind}${
                            markerAnchor?.start === piece.start &&
                            markerAnchor.end === piece.end
                              ? " is-anchored"
                              : ""
                          }`}
                          onClick={() =>
                            handleMarkerSectionClick({
                              start: piece.start,
                              end: piece.end,
                              source: piece.kind,
                            })
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              handleMarkerSectionClick({
                                start: piece.start,
                                end: piece.end,
                                source: piece.kind,
                              });
                            }
                          }}
                        >
                          {piece.text}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              ) : contentMode === "text" ? (
                <label className="teacher-live__source">
                  <span>Text – Sätze werden automatisch getrennt</span>
                  <textarea
                    ref={sourceRef}
                    value={source}
                    disabled={!hydrated}
                    placeholder="Text eingeben oder Dokument hochladen …"
                    onChange={(e) =>
                      setSources((current) => ({
                        ...current,
                        [contentMode]: e.target.value,
                      }))
                    }
                  />
                </label>
              ) : contentMode === "vocabulary" ? (
                <div className="teacher-live__vocabulary-workbench">
                  <section className="teacher-live__vocabulary-list">
                    <div className="teacher-live__vocabulary-list-heading">
                      <div>
                        <h3>Vokabelheft</h3>
                        <p>Weitere richtige Antworten mit | trennen.</p>
                      </div>
                      <div className="teacher-live__vocabulary-list-actions">
                        <span>{vocabularyPairs.length} Vokabeln</span>
                        <label className="teacher-live__vocabulary-import">
                          Datei importieren
                          <input
                            className="sr-only"
                            type="file"
                            accept=".txt,.csv,text/plain,text/csv"
                            onChange={(e) => importFile(e.target.files?.[0])}
                          />
                        </label>
                      </div>
                    </div>
                    <div className="teacher-live__vocabulary-rows">
                      {vocabularyPairs.map((pair, index) => (
                        <div
                          key={pair.id}
                          className="teacher-live__vocabulary-row"
                        >
                          {(["left", "right"] as const).map((side) => (
                            <div key={side}>
                              <input
                                value={pair[side].primary}
                                placeholder={
                                  side === "left"
                                    ? `Vokabel ${index + 1}`
                                    : "Übersetzung"
                                }
                                onChange={(event) =>
                                  applyVocabularyPairs(
                                    vocabularyPairs.map((entry) =>
                                      entry.id === pair.id
                                        ? {
                                            ...entry,
                                            [side]: {
                                              ...entry[side],
                                              primary: event.target.value,
                                            },
                                          }
                                        : entry,
                                    ),
                                  )
                                }
                              />
                              <input
                                defaultValue={pair[side].alternatives.join(
                                  " | ",
                                )}
                                placeholder="Weitere Antworten: … | …"
                                onBlur={(event) =>
                                  applyVocabularyPairs(
                                    vocabularyPairs.map((entry) =>
                                      entry.id === pair.id
                                        ? {
                                            ...entry,
                                            [side]: {
                                              ...entry[side],
                                              alternatives: event.target.value
                                                .split("|")
                                                .map((part) => part.trim())
                                                .filter(Boolean),
                                            },
                                          }
                                        : entry,
                                    ),
                                  )
                                }
                              />
                            </div>
                          ))}
                          <button
                            type="button"
                            aria-label={`Vokabel ${index + 1} löschen`}
                            onClick={() => {
                              const next = vocabularyPairs.filter(
                                (entry) => entry.id !== pair.id,
                              );
                              applyVocabularyPairs(
                                next.length > 0
                                  ? next
                                  : [emptyVocabularyPair()],
                              );
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="teacher-live__vocabulary-add"
                      onClick={() =>
                        applyVocabularyPairs([
                          ...vocabularyPairs,
                          {
                            id: crypto.randomUUID(),
                            left: emptyVocabularySide(),
                            right: emptyVocabularySide(),
                          },
                        ])
                      }
                    >
                      + Vokabel hinzufügen
                    </button>
                  </section>
                  <aside className="teacher-live__vocabulary-sidebar">
                    <div>
                      <h4>⇄ Abfragerichtung</h4>
                      {(
                        [
                          ["left-to-right", "Links → rechts"],
                          ["right-to-left", "Rechts → links"],
                          ["mixed", "Beide Richtungen gemischt"],
                        ] as const
                      ).map(([value, label]) => (
                        <label key={value}>
                          <input
                            type="radio"
                            name="vocabulary-direction"
                            checked={direction === value}
                            onChange={() => setDirection(value)}
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                    <label className="teacher-live__vocabulary-case">
                      <input
                        type="checkbox"
                        checked={vocabularyCaseSensitive}
                        onChange={(event) =>
                          setVocabularyCaseSensitive(event.target.checked)
                        }
                      />
                      Groß-/Kleinschreibung prüfen
                    </label>
                    <label className="teacher-live__vocabulary-transfer">
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
                    <div className="teacher-live__vocabulary-paste">
                      <h4>Tabelle einfügen</h4>
                      <p>
                        Zwei Spalten aus Excel/Sheets kopieren oder Semikolon
                        verwenden. Alternativen mit | trennen.
                      </p>
                      <textarea
                        value={vocabularyTableInput}
                        onChange={(event) =>
                          setVocabularyTableInput(event.target.value)
                        }
                        placeholder={"Haus\thome | house\nBaum\ttree"}
                      />
                      <button
                        type="button"
                        className="button button--primary"
                        disabled={!vocabularyTableInput.trim()}
                        onClick={() => {
                          const imported = parseVocabularyTable(
                            vocabularyTableInput,
                          ).map((pair) => ({
                            ...pair,
                            id: crypto.randomUUID(),
                          }));
                          if (!imported.length) return;
                          applyVocabularyPairs(imported);
                          setVocabularyTableInput("");
                        }}
                      >
                        Liste übernehmen
                      </button>
                    </div>
                  </aside>
                </div>
              ) : null}
              {contentMode === "text" && source && !markerMode ? (
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
              {contentMode !== "vocabulary" ? (
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
                </div>
              ) : null}
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
        <span className="teacher-live__mode-icon-emoji">⚔</span>
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
                        <span className="teacher-live__progress-identity">
                          {!stationMode ? (
                            <AnimalAvatar
                              studentName={label}
                              className="teacher-live__progress-avatar"
                            />
                          ) : null}
                          <strong>{label}</strong>
                        </span>
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
        <button
          type="button"
          className="teacher-live__code-card"
          onClick={() => setShowLargeQr(true)}
          aria-label="QR-Code groß anzeigen"
        >
          <p className="teacher-live__code-label">oder Raum-Code eingeben</p>
          <strong className="teacher-live__code">{room.code}</strong>
        </button>
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
                <span className="teacher-live__student-avatar-wrap">
                  <AnimalAvatar
                    studentName={participant.studentName}
                    className="teacher-live__student-avatar"
                  />
                  <span
                    className="teacher-live__student-status"
                    aria-hidden="true"
                  >
                    {connected.includes(participant.studentName) ? "✓" : "–"}
                  </span>
                </span>
                <span className="teacher-live__student-name">
                  {participant.studentName}
                </span>
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
          className="teacher-live__qr-backdrop"
          role="button"
          tabIndex={0}
          aria-label="QR-Code schließen"
          onClick={(event) => {
            if (event.target === event.currentTarget) setShowLargeQr(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape" || event.key === "Enter")
              setShowLargeQr(false);
          }}
        >
          <div
            className="teacher-live__qr-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="QR-Code"
          >
            <button
              type="button"
              className="teacher-live__qr-close"
              onClick={() => setShowLargeQr(false)}
              aria-label="QR-Code schließen"
            >
              ×
            </button>
            <QRCodeCanvas value={joinUrl} size={420} level="H" marginSize={2} />
            <strong>Raum {room.code}</strong>
          </div>
        </div>
      ) : null}
    </div>
  );
}
