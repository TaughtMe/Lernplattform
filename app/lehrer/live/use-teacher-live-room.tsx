"use client";

/**
 * Zustand und Abläufe des Lehrkraft-Laufdiktats (Inhalt → Modus → Lobby →
 * Live). Die Fachregeln stammen unverändert aus dem Laufdiktat-Quellcode;
 * die Darstellung liegt in den Schritt-Komponenten dieses Ordners.
 */
import { useAreaVisible } from "../../release/release-context";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { animalTokenFromDisplayName } from "../../../src/domain/learner-profile";
import type { ParticipantStatus } from "../../views/laufdiktat/teacher-dictation-screen";
import {
  DEFAULT_VOCABULARY_LOCALES,
  parseVocabularyTable,
  type VocabularyDirection,
  type VocabularyLocales,
  type VocabularyPair,
} from "../../../src/domain/running-dictation";
import {
  applyRunningDictationSectionEdits,
  buildRunningDictationSections,
  DEFAULT_TEXT_SPLIT_CONFIG,
  moveRunningDictationSection,
  type ManualRange,
  type TextSplitConfig,
} from "../../../src/domain/running-dictation-sections";
import {
  countMathChainNumbers,
  displayMathNumber,
  evaluateMentalMathExpression,
  formatMathChainTokens,
  isLatexMathSyntax,
  normalizeMathChainInput,
  tokenizeMathChain,
} from "../../../src/domain/mental-math";
import { LIVE_APP_VERSION } from "../../../src/app-version";
import {
  getLiveRoomClient,
  type LiveRoomConfig,
} from "../../../src/integrations/laufdiktat/live-room-client";
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
} from "../../../src/integrations/laufdiktat/room-api";
import {
  buildTeacherRoomConfig,
  buildTeacherWords,
  generateMentalMathSource,
  type MathOperation,
  type TeacherContentMode,
  type TeacherGameMode,
} from "../../../src/integrations/laufdiktat/teacher-session";
import { buildTeacherResultCsv } from "../../../src/integrations/laufdiktat/teacher-results";
import {
  parseLiveSession,
  type LiveWord,
  type VocabularyTransferChoice,
  type WordStoreTransferChoice,
} from "../../../src/integrations/laufdiktat/live-session";
import { createLiveRoomDebounce } from "../../../src/integrations/laufdiktat/debounce";
import {
  roomTimeline,
  roomTimeState,
} from "../../../src/integrations/laufdiktat/room-limits";
import { useHydrated } from "../../components/use-hydrated";
import { classSealFingerprint } from "../../../src/domain/class-seal";
import { classModuleSchema } from "../../../src/domain/class-workspace";
import { notifyTeacherClassesChanged } from "../../ui/shell/teacher-classes";
import {
  createTeacherClassRepository,
  createTeacherContentLibraryRepository,
  createTeacherProfileRepository,
} from "../../../src/storage/teacher-class-settings";
import { liveContentToPackage, packageToLiveContent } from "../content-adapter";
import { takeLiveIntent } from "../live-intent";
import { splitModeOf } from "./dictation-adapter";
import type { TeacherContentPackage } from "../../../src/domain/teacher-content-library";

/** Schuljahr zum Datum, z. B. „2026/27“ (ab August das neue Jahr). */
function defaultSchoolYear(date: Date) {
  const start =
    date.getMonth() >= 7 ? date.getFullYear() : date.getFullYear() - 1;
  return `${start}/${String((start + 1) % 100).padStart(2, "0")}`;
}

export type Stage = "content" | "settings" | "lobby" | "live";

export const LABELS: Record<TeacherContentMode, string> = {
  text: "Text",
  vocabulary: "Vokabeln",
  math: "Kopfrechnen",
};
export const CONTENT_MODES: TeacherContentMode[] = [
  "text",
  "math",
  "vocabulary",
];
export const ALL_MODES: Array<{
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
export const MODES = ALL_MODES;
const DEFAULT_SOURCES: Record<TeacherContentMode, string> = {
  text: "",
  vocabulary: "",
  math: "",
};
function nowIso(clock: () => number) {
  return new Date(clock()).toISOString();
}
function isOnline(participant: LiveRoomParticipant) {
  return Boolean(
    participant.lastSeenAt &&
    Date.now() - new Date(participant.lastSeenAt).getTime() < 45_000,
  );
}

export const emptyVocabularySide = () => ({ primary: "", alternatives: [] });
export const emptyVocabularyPair = (): VocabularyPair => ({
  id: crypto.randomUUID(),
  left: emptyVocabularySide(),
  right: emptyVocabularySide(),
});

/** Wie oft die Uhr für die Raumfristen nachgesehen wird. */
const ROOM_CLOCK_INTERVAL_MS = 15_000;

export function useTeacherLiveRoom(
  liveRoomConfig: LiveRoomConfig | null,
  /** Uhr in Millisekunden; die Tests setzen eine eigene, ohne zu warten. */
  clock: () => number = Date.now,
) {
  const hydrated = useHydrated();
  const router = useRouter();
  const params = useSearchParams();
  const [stage, setStage] = useState<Stage>("content");
  const [contentMode, setContentMode] = useState<TeacherContentMode>("text");
  const [markerMode, setMarkerMode] = useState(false);
  const [markerAnchor, setMarkerAnchor] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const [mathSettingsOpen, setMathSettingsOpen] = useState(false);
  const [mathEditIndex, setMathEditIndex] = useState<number | null>(null);
  const [mathDraft, setMathDraft] = useState("");
  // Gap numeral index per math line (0..N-1 = that numeral in the
  // expression, N = the result), kept separate from the line's text
  // (mirrors Laufdiktat's useMathImport hook) so editing/rerolling a task's
  // numbers never has to parse a gap marker back out of the stored string.
  const [mathGaps, setMathGaps] = useState<number[]>([]);
  const mathEditInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (mathEditIndex !== null) mathEditInputRef.current?.focus();
  }, [mathEditIndex]);
  const [vocabularyPairs, setVocabularyPairs] = useState<VocabularyPair[]>([
    emptyVocabularyPair(),
  ]);
  const [vocabularyCaseSensitive, setVocabularyCaseSensitive] = useState(false);
  const [vocabularyLocales, setVocabularyLocales] = useState<VocabularyLocales>(
    DEFAULT_VOCABULARY_LOCALES,
  );
  const [vocabularyTableInput, setVocabularyTableInput] = useState("");
  const serializeVocabularyPairs = (pairs: VocabularyPair[]) =>
    pairs
      .map((pair) => {
        const side = (value: VocabularyPair["left"]) =>
          [value.primary, ...value.alternatives].filter(Boolean).join("|");
        const tag = pair.tag?.trim();
        return `${side(pair.left)};${side(pair.right)}${tag ? `;${tag}` : ""}`;
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
    useState<VocabularyTransferChoice>("none");
  // Text-Laufdiktat: Wörter in den Wortspeicher der Kinder (Standard: falsch
  // geschriebene). Ohne sichtbaren Bereich bekommt die Sitzung „none“.
  const wordStoreVisible = useAreaVisible("wortspeicher");
  const [wordStoreChoice, setWordStoreTransfer] =
    useState<WordStoreTransferChoice>("errors");
  const wordStoreTransfer: WordStoreTransferChoice = wordStoreVisible
    ? wordStoreChoice
    : "none";
  // Standard-Tag aus den Lehrer-Einstellungen für übernommene Vokabeln.
  const [lernboxTag, setLernboxTag] = useState("");
  // Tag dieser Runde; leer gilt der Standard-Tag aus den Einstellungen.
  const [roundTag, setRoundTag] = useState("");
  const vocabularyTag = roundTag.trim() || lernboxTag;
  useEffect(() => {
    let active = true;
    void createTeacherProfileRepository()
      .get()
      .then((profile) => {
        if (active && profile?.lernboxTag) setLernboxTag(profile.lernboxTag);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  // Optionale Klasse: Der Raum trägt dann nur den Abdruck ihres Stempels, damit
  // Freigaben der Schreiberleichterung genau in diesem Raum wirken.
  const [liveClasses, setLiveClasses] = useState<
    { id: string; name: string; fingerprint?: string }[]
  >([]);
  const [classChoice, setClassChoiceState] = useState("");
  useEffect(() => {
    let active = true;
    void (async () => {
      const repository = createTeacherClassRepository();
      const classes = await repository.list();
      const withPrint = await Promise.all(
        classes.map(async ({ id, name, seal }) => ({
          id,
          name,
          ...(seal
            ? { fingerprint: await classSealFingerprint(seal.publicKey) }
            : {}),
        })),
      );
      if (!active) return;
      setLiveClasses(withPrint);
      const last = (await createTeacherProfileRepository().get())
        ?.lastLiveClassId;
      if (active && last && withPrint.some(({ id }) => id === last)) {
        setClassChoiceState((current) => current || last);
      }
    })()
      .catch(() => undefined)
      .finally(() => {
        if (active) setClassesLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);
  // Nach dem Wiederöffnen eines Raums die Klasse aus dem Abdruck zurückfinden,
  // sonst ginge die Wahl beim Start der Runde verloren.
  const [restoredClassSeal, setRestoredClassSeal] = useState<string>();
  const activeClass =
    classChoice ||
    (restoredClassSeal
      ? liveClasses.find(({ fingerprint }) => fingerprint === restoredClassSeal)
          ?.id
      : undefined) ||
    "";
  const classSeal = liveClasses.find(
    ({ id }) => id === activeClass,
  )?.fingerprint;
  const [gameMode, setGameMode] = useState<TeacherGameMode>("LAUFDIKTAT");
  const mainRef = useRef<HTMLElement>(null);
  const builderRef = useRef<HTMLDivElement>(null);
  const [shuffleWords, setShuffleWords] = useState(false);
  const [stationShuffle, setStationShuffle] = useState(true);
  const [repeatWrongAnswers, setRepeatWrongAnswers] = useState(true);
  const [assistance, setAssistance] = useState(true);
  const [attempts, setAttempts] = useState(3);
  const [tts, setTts] = useState(false);
  const [showStars, setShowStars] = useState(true);
  const [strictTyping, setStrictTyping] = useState(false);
  const [taskHelp, setTaskHelp] = useState(true);
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
  // Abgelegter Inhalt, der gerade bearbeitet wird (null = noch nicht abgelegt).
  const [contentId, setContentId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [libraryNotice, setLibraryNotice] = useState("");
  // Die Wiederaufnahme eines offenen Raums hat Vorrang vor Adressen und Absicht.
  const [restoreChecked, setRestoreChecked] = useState(false);
  const [classesLoaded, setClassesLoaded] = useState(false);
  const [startRequested, setStartRequested] = useState(false);
  const [room, setRoom] = useState<OpenedLiveRoom | null>(null);
  // Raum ist zu Ende (Frist oder Server), die letzten Ergebnisse bleiben sichtbar.
  const [roomClosed, setRoomClosed] = useState(false);
  const [nowMs, setNowMs] = useState(0);
  const roomRef = useRef<OpenedLiveRoom | null>(null);
  const closingRef = useRef(false);
  const [participants, setParticipants] = useState<LiveRoomParticipant[]>([]);
  const [presenceNames, setPresenceNames] = useState<string[]>([]);
  // Wer die Raumseite verlassen hat und allein weiterübt (Anwesenheit „practice“).
  const [practicingNames, setPracticingNames] = useState<string[]>([]);
  const [students, setStudents] = useState<LiveRoomStudent[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [connectionWarning, setConnectionWarning] = useState("");
  const channelRef = useRef<RealtimeChannel | null>(null);
  const sourceRef = useRef<HTMLTextAreaElement>(null);
  const markerContainerRef = useRef<HTMLDivElement>(null);

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
  // A contiguous run of the raw text for the marker view: the sections
  // themselves plus everything between them (whitespace, consumed
  // separators). Gapless on purpose — the marker view must render exactly
  // the same characters as the plain textarea, or character offsets from a
  // click/selection would no longer line up with the raw text.
  type MarkerPiece = {
    text: string;
    start: number;
    kind: "gap" | "auto" | "manual";
    // Counts only the automatic sections, so adjacent auto sections can be
    // colored in alternating shades (the boundary between them stays
    // visible even when nothing manual has been marked yet).
    autoIndex: number;
  };
  const markerPieces = useMemo(() => {
    const pieces: MarkerPiece[] = [];
    let cursor = 0;
    let autoIndex = 0;
    for (const section of textSections) {
      if (section.start > cursor) {
        pieces.push({
          text: source.slice(cursor, section.start),
          start: cursor,
          kind: "gap",
          autoIndex,
        });
      }
      pieces.push({
        text: section.text,
        start: section.start,
        kind: section.source,
        autoIndex,
      });
      if (section.source === "auto") autoIndex += 1;
      cursor = section.end;
    }
    if (cursor < source.length) {
      pieces.push({
        text: source.slice(cursor),
        start: cursor,
        kind: "gap",
        autoIndex,
      });
    }
    return pieces;
  }, [source, textSections]);

  type MarkerToken = {
    text: string;
    start: number;
    end: number;
    isWord: boolean;
  };
  function tokenizeMarkerText(text: string, base: number): MarkerToken[] {
    const tokens: MarkerToken[] = [];
    const regex = /(\p{L}+|\p{N}+)/gu;
    let last = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text))) {
      if (match.index > last) {
        tokens.push({
          text: text.slice(last, match.index),
          start: base + last,
          end: base + match.index,
          isWord: false,
        });
      }
      tokens.push({
        text: match[0],
        start: base + match.index,
        end: base + regex.lastIndex,
        isWord: true,
      });
      last = regex.lastIndex;
    }
    if (last < text.length) {
      tokens.push({
        text: text.slice(last),
        start: base + last,
        end: base + text.length,
        isWord: false,
      });
    }
    return tokens;
  }

  // A new manual range replaces any manual range it overlaps, rather than
  // stacking on top of it.
  function addManualSection(start: number, end: number) {
    setManualRanges((current) => [
      ...current.filter(
        (range) => Math.max(start, range.start) >= Math.min(end, range.end),
      ),
      { id: crypto.randomUUID(), type: "section", start, end },
    ]);
  }

  function removeManualSection(section: { start: number; end: number }) {
    setManualRanges((current) =>
      current.filter(
        (range) =>
          Math.max(section.start, range.start) >=
          Math.min(section.end, range.end),
      ),
    );
  }

  // First tapped word = anchor; second word (start or end, either order)
  // closes the range into a new manual section. Trailing punctuation right
  // after the second word is pulled in too, so it doesn't end up as its own
  // tiny leftover section.
  function handleMarkerWordTap(token: MarkerToken) {
    if (!window.getSelection()?.isCollapsed) return;
    if (!markerAnchor) {
      setMarkerAnchor({ start: token.start, end: token.end });
      return;
    }
    const start = Math.min(markerAnchor.start, token.start);
    let end = Math.max(markerAnchor.end, token.end);
    while (end < source.length && /[^\s\p{L}\p{N}]/u.test(source[end] ?? "")) {
      end += 1;
    }
    setMarkerAnchor(null);
    addManualSection(start, end);
  }

  // Desktop alternative to word-tapping: drag-select a range with the mouse.
  function handleMarkerMouseUp() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return;
    }
    const range = selection.getRangeAt(0);
    const container = markerContainerRef.current;
    if (!container || !container.contains(range.commonAncestorContainer)) {
      return;
    }
    const preSelection = range.cloneRange();
    preSelection.selectNodeContents(container);
    preSelection.setEnd(range.startContainer, range.startOffset);
    let start = preSelection.toString().length;
    let end = start + range.toString().length;

    const selected = source.slice(start, end);
    start += selected.length - selected.trimStart().length;
    end -= selected.length - selected.trimEnd().length;

    selection.removeAllRanges();
    setMarkerAnchor(null);
    if (start < end) addManualSection(start, end);
  }

  const mathLines = useMemo(
    () =>
      sources.math
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0),
    [sources.math],
  );

  // A math line's gap is a single numeral index: 0..N-1 blanks that
  // occurrence in the expression itself (counting only its number tokens,
  // left to right), and N (one past the last) blanks the computed result
  // instead. This applies uniformly to a plain two-operand task and to a
  // multi-operator chain alike — Laufdiktat's own left/a/b/result slots are
  // just the two-operand case of this (0 = left, 1 = right, 2 = result).
  function defaultMathGapIndex(numberCount: number) {
    return Math.max(0, numberCount - 1);
  }

  // Mirrors Laufdiktat's useMathImport: gaps are derived fresh from the
  // current text + the separate mathGaps array on every render, never baked
  // into the stored line — so editing numbers or adding a task can't lose or
  // corrupt the gap.
  const mathWords = useMemo(() => {
    if (contentMode !== "math") return [];
    const result: LiveWord[] = [];
    mathLines.forEach((line, index) => {
      const value = evaluateMentalMathExpression(line);
      if (value === null) return;
      const tokens = tokenizeMathChain(line);
      const numberCount = tokens ? countMathChainNumbers(tokens) : 0;
      const gapIndex =
        mathGap && tokens
          ? (mathGaps[index] ?? defaultMathGapIndex(numberCount))
          : undefined;
      if (tokens && gapIndex !== undefined) {
        const isResultGap = gapIndex >= numberCount;
        const shownExpression = formatMathChainTokens(
          tokens,
          isResultGap ? undefined : gapIndex,
        );
        const answer = isResultGap
          ? value
          : (tokens.filter((token) => token.kind === "number")[gapIndex]
              ?.value ?? value);
        result.push({
          id: `math-${index}-gap-${gapIndex}`,
          kind: "math",
          prompt: `${shownExpression} = ${isResultGap ? "_" : displayMathNumber(value)}`,
          targetWord: String(answer),
        });
        return;
      }
      result.push({
        id: `math-${index}-expression`,
        kind: "math",
        prompt: tokens ? formatMathChainTokens(tokens) : line,
        targetWord: String(value),
        ...(isLatexMathSyntax(line) ? { isLatex: true } : {}),
      });
    });
    return result;
  }, [contentMode, mathLines, mathGap, mathGaps]);

  const words = useMemo(
    () =>
      contentMode === "text"
        ? orderedTextSections.map((section) => ({
            id: section.id,
            kind: "text" as const,
            targetWord: section.text,
          }))
        : contentMode === "math"
          ? mathWords
          : buildTeacherWords(
              contentMode,
              source,
              direction,
              vocabularyCaseSensitive,
              vocabularyLocales,
            ),
    [
      contentMode,
      direction,
      mathWords,
      orderedTextSections,
      source,
      vocabularyCaseSensitive,
      vocabularyLocales,
    ],
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
    }).trim();
  }

  function commitMathLines(lines: string[]) {
    setSources((current) => ({ ...current, math: lines.join("\n") }));
  }

  function startEditMathRow(index: number) {
    setMathEditIndex(index);
    setMathDraft(mathLines[index] ?? "");
  }

  function setMathLineGap(index: number, gapIndex: number) {
    setMathGaps((current) => {
      const next = [...current];
      next[index] = gapIndex;
      return next;
    });
  }

  function insertAtMathCursor(token: string, cursorOffset: number) {
    const el = mathEditInputRef.current;
    const start = el?.selectionStart ?? mathDraft.length;
    const end = el?.selectionEnd ?? start;
    const next = mathDraft.slice(0, start) + token + mathDraft.slice(end);
    setMathDraft(next);
    const pos = start + cursorOffset;
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(pos, pos);
    });
  }

  // Live "= result" (or "ungültig") feedback shown next to the math edit
  // field while typing, before the value is committed.
  const mathDraftResult = mathDraft.trim()
    ? evaluateMentalMathExpression(mathDraft)
    : null;

  function commitMathEdit(continueEditing: boolean) {
    if (mathEditIndex === null) return;
    const editIndex = mathEditIndex;
    const wasAppending = editIndex >= mathLines.length;
    const lines = [...mathLines];
    // Re-space "6+4-2" into "6 + 4 - 2" so the teacher never has to type
    // (or read back) the spaces themselves; falls back to the raw input
    // for anything that isn't a plain chain (e.g. \frac/\sqrt).
    const value = normalizeMathChainInput(mathDraft) ?? mathDraft.trim();
    if (wasAppending) {
      if (value) lines.push(value);
    } else if (value) {
      lines[editIndex] = value;
    } else {
      lines.splice(editIndex, 1);
      setMathGaps((current) => {
        const next = [...current];
        next.splice(editIndex, 1);
        return next;
      });
    }
    commitMathLines(lines);
    setMathDraft("");
    setMathEditIndex(
      continueEditing && wasAppending && value ? lines.length : null,
    );
  }

  async function setClassChoice(id: string) {
    setRestoredClassSeal(undefined);
    setClassChoiceState(id);
    if (!id) {
      await rememberClass(undefined);
      return;
    }
    // Ältere Klassen erhalten ihren Stempel beim ersten Bedarf.
    try {
      const seal = await createTeacherClassRepository().ensureSeal(id);
      if (!seal) return;
      const fingerprint = await classSealFingerprint(seal.publicKey);
      setLiveClasses((current) =>
        current.map((entry) =>
          entry.id === id ? { ...entry, fingerprint } : entry,
        ),
      );
      await rememberClass(id);
    } catch {
      setClassChoiceState("");
      setError("Für diese Klasse konnte kein Klassenstempel erstellt werden.");
    }
  }
  async function rememberClass(id: string | undefined) {
    try {
      const repository = createTeacherProfileRepository();
      const profile = await repository.get();
      if (!profile || profile.lastLiveClassId === id) return;
      await repository.put({
        ...profile,
        ...(id ? { lastLiveClassId: id } : { lastLiveClassId: undefined }),
      });
    } catch {
      // Die Auswahl gilt trotzdem; nur das Merken für das nächste Mal entfällt.
    }
  }
  const registeredNames = participants.map(({ studentName }) => studentName);
  const connectedNames = Array.from(
    new Set([
      ...presenceNames,
      ...participants.filter(isOnline).map(({ studentName }) => studentName),
    ]),
  ).sort((a, b) => a.localeCompare(b, "de"));
  const allNames = Array.from(new Set([...registeredNames, ...connectedNames]));

  /** Im Raum, übt allein weiter (Raumseite verlassen) oder nicht verbunden. */
  function statusFor(name: string): ParticipantStatus {
    if (practicingNames.includes(name)) return "practice";
    if (connectedNames.includes(name)) return "online";
    return "offline";
  }
  const roomConfig = useMemo(
    () =>
      buildTeacherRoomConfig({
        contentMode,
        source,
        vocabularyDirection: direction,
        vocabularyTransfer,
        wordStoreTransfer,
        vocabularyTag,
        ...(classSeal ? { classSeal } : {}),
        gameMode,
        shuffleWords,
        repeatWrongAnswers,
        isTtsEnabled: tts,
        uebungMaxAttempts: attempts,
        uebungAssistanceEnabled: assistance,
        showStars,
        strictTypingMode: strictTyping,
        showTaskAfterErrors: taskHelp,
        stationCount,
        stationShuffle,
        battleOptions: { ink: battleInk, flicker: battleFlicker },
        wordsOverride: words,
        ...(contentMode === "math"
          ? {
              mathPracticeOptions: {
                operations: (mathOps.length ? mathOps : ["+"]).map((op) =>
                  op === "+"
                    ? ("add" as const)
                    : op === "-"
                      ? ("subtract" as const)
                      : op === "*"
                        ? ("multiply" as const)
                        : ("divide" as const),
                ),
                minValue: mathMin,
                maxValue: mathMax,
                count: 10,
                allowNegativeResults: mathAllowNegative,
                excludeZeroOperand: mathExcludeZeroOperand,
                excludeZeroResult: mathExcludeZeroResult,
                multiplicationTables: mathTables,
                gapMode: mathGap,
              },
            }
          : {}),
      }),
    [
      mathOps,
      mathMin,
      mathMax,
      mathAllowNegative,
      mathExcludeZeroOperand,
      mathExcludeZeroResult,
      mathTables,
      mathGap,
      assistance,
      attempts,
      battleFlicker,
      battleInk,
      contentMode,
      direction,
      gameMode,
      repeatWrongAnswers,
      vocabularyTransfer,
      wordStoreTransfer,
      vocabularyTag,
      classSeal,
      showStars,
      shuffleWords,
      source,
      stationCount,
      stationShuffle,
      strictTyping,
      taskHelp,
      tts,
      words,
    ],
  );

  // Wird bei jedem Rendern aktualisiert, damit `refresh` stabil bleibt.
  const serverEndedRef = useRef<() => void>(() => undefined);

  const refresh = useCallback(async () => {
    if (!liveRoomConfig || !room) return;
    const [nextParticipants, nextStudents, state] = await Promise.all([
      getLiveRoomParticipants(liveRoomConfig, room),
      stage === "live"
        ? getLiveRoomStudents(liveRoomConfig, room)
        : Promise.resolve([]),
      // Der Server schließt Räume nach 120 Minuten; ein Fehler hier stört nicht.
      getLiveRoomState(liveRoomConfig, room.roomId, {
        accessToken: room.accessToken,
      }).catch(() => null),
    ]);
    if (roomRef.current?.roomId !== room.roomId) return;
    setParticipants(nextParticipants);
    if (stage === "live") setStudents(nextStudents);
    if (state?.status === "ended") serverEndedRef.current();
  }, [liveRoomConfig, room, stage]);

  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  const openedAt = room?.openedAt;
  const timeline = useMemo(
    () => (openedAt ? roomTimeline(new Date(openedAt)) : null),
    [openedAt],
  );
  const timeState = useMemo(
    () =>
      openedAt
        ? roomClosed
          ? "closed"
          : roomTimeState(new Date(openedAt), new Date(nowMs))
        : null,
    [nowMs, openedAt, roomClosed],
  );

  // Uhr für „Code gilt bis“ und die Schließfrist. Ein Wechsel zurück in den
  // Vordergrund (Gerät im Standby) prüft sofort.
  useEffect(() => {
    if (!room || roomClosed) return;
    const tick = () => setNowMs(clock());
    tick();
    const interval = window.setInterval(tick, ROOM_CLOCK_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [clock, room, roomClosed]);

  // Zurücksetzen ohne Aufruf an den Server (Raum ist schon zu Ende).
  function resetRoomState() {
    clearTeacherLiveRoom();
    closingRef.current = false;
    setRoom(null);
    setRoomClosed(false);
    setParticipants([]);
    setStudents([]);
    setPresenceNames([]);
    setPracticingNames([]);
    setStage("content");
  }

  // Der Raum ist zu Ende. Im Live-Schritt bleiben die letzten Ergebnisse
  // samt CSV-Export sichtbar; aus der Lobby geht es zurück zum Inhalt.
  async function finishClosedRoom() {
    if (!room) return;
    if (stage !== "live") {
      resetRoomState();
      setError("Der Raum wurde geschlossen. Du kannst einen neuen öffnen.");
      return;
    }
    if (liveRoomConfig) {
      try {
        const [nextParticipants, nextStudents] = await Promise.all([
          getLiveRoomParticipants(liveRoomConfig, room),
          getLiveRoomStudents(liveRoomConfig, room),
        ]);
        setParticipants(nextParticipants);
        setStudents(nextStudents);
      } catch {
        // Die zuletzt gezeigten Ergebnisse bleiben stehen.
      }
    }
    clearTeacherLiveRoom();
    setRoomClosed(true);
  }
  useEffect(() => {
    serverEndedRef.current = () => {
      if (closingRef.current) return;
      closingRef.current = true;
      void finishClosedRoom();
    };
  });

  // Nach 120 Minuten beendet dieses Gerät den Raum selbst, genau einmal.
  // Der Server-Job ist nur die Absicherung, falls das Gerät nicht offen ist.
  const closesAtMs = timeline?.closesAt.getTime() ?? null;
  useEffect(() => {
    if (!liveRoomConfig || !room || roomClosed || closesAtMs === null) return;
    if (nowMs < closesAtMs || closingRef.current) return;
    closingRef.current = true;
    void (async () => {
      try {
        await endLiveRoom(liveRoomConfig, room);
        await channelRef.current?.send({
          type: "broadcast",
          event: "session-ended",
          payload: {},
        });
      } catch {
        // Der Server schließt den Raum spätestens beim nächsten Aufräumen.
      }
      await finishClosedRoom();
    })();
    // finishClosedRoom liest nur den Stand dieses Renderns.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closesAtMs, liveRoomConfig, nowMs, room, roomClosed]);

  useEffect(() => {
    if (!hydrated || !liveRoomConfig || room) return;
    const stored = readTeacherLiveRoom();
    if (!stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- einmaliges Ergebnis einer Prüfung beim Start, kein Abgleich von Zuständen
      setRestoreChecked(true);
      return;
    }
    getLiveRoomState(liveRoomConfig, stored.roomId, {
      accessToken: stored.accessToken,
    })
      .then((state) => {
        if (!state || state.status === "ended") {
          clearTeacherLiveRoom();
          setRestoreChecked(true);
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
        setWordStoreTransfer(restored.wordStoreTransfer);
        setRoundTag(restored.vocabularyTag ?? "");
        setRestoredClassSeal(restored.classSeal);
        setAssistance(restored.uebungAssistanceEnabled);
        setAttempts(restored.uebungMaxAttempts);
        setTts(restored.isTtsEnabled);
        setShowStars(restored.showStars);
        setStrictTyping(restored.strictTypingMode);
        setTaskHelp(restored.showTaskAfterErrors);
        setStationCount(restored.stationCount);
        setBattleInk(restored.battleOptions.ink);
        setBattleFlicker(restored.battleOptions.flicker);
        // Ohne gemerkte Öffnungszeit (ältere Sitzung) zählt der Moment der Wiederaufnahme.
        setRoom({ ...stored, openedAt: stored.openedAt ?? nowIso(clock) });
        setStage(state.status === "live" ? "live" : "lobby");
        setRestoreChecked(true);
      })
      .catch(() => {
        clearTeacherLiveRoom();
        setRestoreChecked(true);
      });
  }, [clock, hydrated, liveRoomConfig, room]);

  useEffect(() => {
    if (!liveRoomConfig || !room || roomClosed) return;
    const client = getLiveRoomClient(liveRoomConfig);
    const channel = client.channel(`room-${room.code}`);
    const refreshSoon = createLiveRoomDebounce(() => void refresh(), {
      delayMs: 200,
      maxWaitMs: 1_000,
    });
    channelRef.current = channel;
    const syncPresence = () => {
      const state = channel.presenceState<{ activity?: string }>();
      setPresenceNames(Object.keys(state));
      setPracticingNames(
        Object.entries(state)
          .filter(
            ([, metas]) =>
              metas.length > 0 &&
              metas.every((meta) => meta.activity === "practice"),
          )
          .map(([name]) => name),
      );
    };
    channel
      .on("presence", { event: "sync" }, syncPresence)
      .on("presence", { event: "join" }, syncPresence)
      .on("presence", { event: "leave" }, syncPresence)
      .on("broadcast", { event: "student-progress" }, refreshSoon.schedule)
      .on("broadcast", { event: "student-finished" }, refreshSoon.schedule)
      .on("broadcast", { event: "update-station-state" }, refreshSoon.schedule)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setConnectionWarning("");
        }
        if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          setConnectionWarning(
            "Die Verbindung zum Klassenraum wurde unterbrochen.",
          );
        }
      });
    const first = window.setTimeout(() => void refresh(), 0);
    const interval = window.setInterval(
      () => void refresh(),
      stage === "live" ? 3_000 : 8_000,
    );
    // Teacher device wakes from standby / tab returns to the foreground
    // (e.g. an iPad at the projector): kick the connection immediately
    // instead of waiting for the automatic reconnect backoff, and pull the
    // authoritative state (results + roster) right away — broadcasts missed
    // during standby never arrive after the fact.
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      if (channel.state !== "joined") client.realtime.connect();
      refreshSoon.schedule();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.clearTimeout(first);
      window.clearInterval(interval);
      refreshSoon.cancel();
      if (channelRef.current === channel) channelRef.current = null;
      void client.removeChannel(channel);
    };
  }, [liveRoomConfig, refresh, room, roomClosed, stage]);

  // Ohne Raumdienst gibt es nichts wiederherzustellen.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- einmaliges Ergebnis einer Prüfung beim Start, kein Abgleich von Zuständen
    if (hydrated && !liveRoomConfig) setRestoreChecked(true);
  }, [hydrated, liveRoomConfig]);

  function applyLoadedContent(entry: TeacherContentPackage) {
    const loaded = packageToLiveContent(entry);
    setContentMode(loaded.contentMode);
    setSources((current) => ({
      ...current,
      [loaded.contentMode]: loaded.source,
    }));
    setTitle(loaded.title);
    setContentId(entry.id);
    if (loaded.contentMode === "text") {
      setSplitConfig(loaded.textSplitConfig);
      setManualRanges([]);
      setExcludedSectionIds([]);
      setSectionOrder([]);
    }
    if (loaded.contentMode === "vocabulary") {
      const parsed = parseVocabularyTable(loaded.source);
      setVocabularyPairs(parsed.length > 0 ? parsed : [emptyVocabularyPair()]);
      setVocabularyLocales(loaded.vocabularyLocales);
      setShuffleWords(true);
    }
  }

  // Adresse (`inhalt`, `neu`, `schritt`, `modus`) und Start-Absicht werten wir
  // genau einmal aus. Beides löst nur Laden und Anzeigen aus; einen Raum
  // erstellt allein „Jetzt starten“, und die Absicht ist dann schon gelöscht.
  const paramsHandled = useRef(false);
  useEffect(() => {
    if (paramsHandled.current) return;
    if (!hydrated || !restoreChecked || !classesLoaded) return;
    paramsHandled.current = true;
    const contentParam = params.get("inhalt");
    const newParam = params.get("neu");
    const stepParam = params.get("schritt");
    const modeParam = params.get("modus");
    const classParam = params.get("klasse");
    const intent = takeLiveIntent();
    const hasParams = Boolean(contentParam || newParam || stepParam);
    if (!hasParams && !intent) return;
    if (hasParams) router.replace("/lehrer/live");
    if (room) {
      // Ein offener Raum hat Vorrang; nichts wird überschrieben.
      if (contentParam || newParam || intent)
        // eslint-disable-next-line react-hooks/set-state-in-effect -- einmaliges Ergebnis einer Prüfung beim Start, kein Abgleich von Zuständen
        setError(
          "Es ist schon ein Raum offen. Beende ihn zuerst, um einen anderen Inhalt zu laden.",
        );
      return;
    }
    void (async () => {
      const id = intent?.contentId ?? contentParam;
      if (id) {
        const entry = await createTeacherContentLibraryRepository().get(id);
        if (!entry) {
          setError("Dieser Inhalt ist nicht mehr in der Ablage.");
          return;
        }
        applyLoadedContent(entry);
      } else if (
        newParam === "text" ||
        newParam === "math" ||
        newParam === "vocabulary"
      ) {
        chooseContentMode(newParam);
        setContentId(null);
        setTitle("");
      }
      const mode =
        intent?.mode ?? ALL_MODES.find(({ id }) => id === modeParam)?.id;
      if (mode) setGameMode(mode);
      // Die Klasse der Ablage gilt auch für neue Inhalte und den nächsten Raum.
      if (
        !intent &&
        classParam &&
        (classParam === "ohne" ||
          liveClasses.some(({ id }) => id === classParam))
      ) {
        await setClassChoice(classParam === "ohne" ? "" : classParam);
      }
      if (stepParam === "inhalt") setStage("content");
      if (stepParam === "einstellungen") setStage("settings");
      if (intent) {
        const known = liveClasses.some(({ id }) => id === intent.classId);
        await setClassChoice(known ? intent.classId : "");
        setStage("settings");
        setStartRequested(true);
      }
    })().catch(() =>
      setError("Der Inhalt konnte nicht aus der Ablage geladen werden."),
    );
    // Läuft einmal; die Funktionen lesen nur den Stand dieses Renderns.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classesLoaded, hydrated, params, restoreChecked, room, router]);

  // „Jetzt starten“: Sobald Inhalt, Modus und Klasse übernommen sind, öffnet
  // sich die Lobby mit den Standardoptionen des Modus.
  useEffect(() => {
    if (!startRequested || busy || room) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- einmaliges Ergebnis einer Prüfung beim Start, kein Abgleich von Zuständen
    setStartRequested(false);
    void openLobby();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startRequested]);

  /** Legt den Inhalt ab: neu oder als neuer Stand des geladenen Pakets. */
  async function storeContent(markUsed: boolean, moveToClass = false) {
    const repository = createTeacherContentLibraryRepository();
    const existing = contentId ? await repository.get(contentId) : undefined;
    const entry = liveContentToPackage({
      draft: {
        contentMode,
        source,
        title,
        textSplit: splitModeOf(splitConfig),
        vocabularyLocales,
      },
      existing,
      newId: `teacher-package-${crypto.randomUUID()}`,
      now: new Date(clock()).toISOString(),
      classId: activeClass || undefined,
      markUsed,
      moveToClass,
    });
    await repository.put(entry);
    setContentId(entry.id);
    setTitle(entry.title);
    window.dispatchEvent(new Event("teacher-data-changed"));
    return entry;
  }

  async function saveContent() {
    setError("");
    if (!source.trim()) {
      setLibraryNotice("Gib zuerst etwas ein, das gespeichert werden kann.");
      return;
    }
    try {
      const entry = await storeContent(false, true);
      setLibraryNotice(`„${entry.title}“ ist gespeichert.`);
    } catch {
      setLibraryNotice(
        "Der Inhalt konnte nicht gespeichert werden. Bitte versuche es noch einmal.",
      );
    }
  }

  /** Legt eine neue Klasse an und wählt sie aus; gespeichert wird erst mit „Speichern“. */
  async function createClassNamed(rawName: string) {
    const name = rawName.trim();
    if (!name) return;
    try {
      const repository = createTeacherClassRepository();
      const profile = await createTeacherProfileRepository().get();
      const now = new Date().toISOString();
      const course = {
        id: crypto.randomUUID(),
        name,
        teacherName: profile?.displayName || "Lehrkraft",
        schoolYear: defaultSchoolYear(new Date(clock())),
        enabledModules: [...classModuleSchema.options],
        createdAt: now,
        updatedAt: now,
      };
      await repository.put(course);
      setLiveClasses((current) => [...current, { id: course.id, name }]);
      window.dispatchEvent(new Event("teacher-data-changed"));
      notifyTeacherClassesChanged();
      await setClassChoice(course.id);
      setLibraryNotice(`Klasse „${name}“ ist angelegt.`);
    } catch {
      setLibraryNotice("Die Klasse konnte nicht angelegt werden.");
    }
  }

  async function deleteContent() {
    if (!contentId) return;
    try {
      const repository = createTeacherContentLibraryRepository();
      const entry = await repository.get(contentId);
      await repository.remove(contentId);
      setContentId(null);
      setLibraryNotice(
        entry
          ? `„${entry.title}“ wurde aus der Ablage gelöscht.`
          : "Der Inhalt wurde aus der Ablage gelöscht.",
      );
      window.dispatchEvent(new Event("teacher-data-changed"));
    } catch {
      setLibraryNotice("Der Inhalt konnte nicht gelöscht werden.");
    }
  }

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
      const opened = {
        ...(await openLiveRoom(liveRoomConfig, roomConfig)),
        openedAt: nowIso(clock),
      };
      saveTeacherLiveRoom(opened);
      closingRef.current = false;
      setRoom(opened);
      setNowMs(clock());
      setStage("lobby");
      // Beim Öffnen der Lobby wird der Inhalt abgelegt, ohne die Lobby
      // aufzuhalten; ein Fehler hier stoppt den Raum nicht.
      void storeContent(true).catch(() =>
        setError(
          "Der Raum ist offen, aber der Inhalt konnte nicht gespeichert werden.",
        ),
      );
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
      if (students.length > 0) exportCsv();
      await endLiveRoom(liveRoomConfig, room);
      await channelRef.current?.send({
        type: "broadcast",
        event: "session-ended",
        payload: {},
      });
      resetRoomState();
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
      [
        buildTeacherResultCsv(resultNames, students, words.length, (name) => {
          const participant = participants.find(
            (item) => item.studentName === name,
          );
          if (participant?.animalToken)
            return participant.animalNumber > 1
              ? `${participant.animalToken} ${participant.animalNumber}`
              : participant.animalToken;
          return name.startsWith("participant-") ? "Ohne Tier" : name;
        }),
      ],
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
  const footerDisabled =
    busy ||
    (stage === "content" && !words.length) ||
    (stage === "lobby" &&
      gameMode !== "STATION" &&
      connectedNames.length === 0);

  function goBack() {
    setError("");
    if (roomClosed) return;
    if (stage === "settings") setStage("content");
    if (stage === "lobby") setStage("settings");
    if (stage === "live") setStage("lobby");
  }

  function goForward() {
    setError("");
    if (stage === "content") setStage("settings");
    if (stage === "settings") void openLobby();
    if (stage === "lobby") void startSession();
    if (stage === "live") {
      // Ein geschlossener Raum braucht keinen Aufruf mehr: weiter zum neuen Raum.
      if (roomClosed) resetRoomState();
      else void endRoom();
    }
  }

  function chooseContentMode(mode: TeacherContentMode) {
    // Ein anderer Typ ist ein anderer Inhalt: nicht über das Paket schreiben.
    if (mode !== contentMode) setContentId(null);
    setContentMode(mode);
    if (mode === "vocabulary") {
      setShuffleWords(true);
      const parsed = parseVocabularyTable(sources.vocabulary);
      setVocabularyPairs(parsed.length > 0 ? parsed : [emptyVocabularyPair()]);
    }
  }

  const MATH_RULE_ERROR =
    "Keine passenden Aufgaben. Bitte ändere den Zahlenraum oder die Regeln.";

  function generateMathTasks() {
    try {
      const math = generateMentalMathSource({
        count: mathCount,
        min: mathMin,
        max: mathMax,
        operations: mathOps,
        allowNegativeResults: mathAllowNegative,
        excludeZeroOperand: mathExcludeZeroOperand,
        excludeZeroResult: mathExcludeZeroResult,
        multiplicationTables: mathTables,
      });
      setSources((current) => ({ ...current, math }));
      setMathGaps([]);
      setError("");
    } catch {
      setError(MATH_RULE_ERROR);
    }
  }

  function toggleMathOperation(op: MathOperation) {
    setMathOps((current) =>
      current.includes(op)
        ? current.filter((item) => item !== op)
        : [...current, op],
    );
  }

  function toggleMathTable(table: number) {
    setMathTables((active) =>
      active.includes(table)
        ? active.filter((entry) => entry !== table)
        : [...active, table].sort((left, right) => left - right),
    );
  }

  function rerollMathLine(index: number) {
    const lines = [...mathLines];
    try {
      lines[index] = generateSingleMathLine();
    } catch {
      setError(MATH_RULE_ERROR);
      return;
    }
    commitMathLines(lines);
  }

  function deleteMathLine(index: number) {
    const lines = [...mathLines];
    lines.splice(index, 1);
    commitMathLines(lines);
    setMathGaps((current) => {
      const next = [...current];
      next.splice(index, 1);
      return next;
    });
    if (mathEditIndex !== null) setMathEditIndex(null);
  }

  function startAppendMathLine() {
    setMathEditIndex(mathLines.length);
    setMathDraft("");
  }

  function cancelMathEdit() {
    setMathDraft("");
    setMathEditIndex(null);
  }

  function togglePunctuation(character: string) {
    setSplitConfig((current) => ({
      ...current,
      punctuation: current.punctuation.includes(character)
        ? current.punctuation.filter((item) => item !== character)
        : [...current.punctuation, character],
    }));
  }

  function addCustomDelimiter() {
    if (!customDelimiter) return;
    const value = customDelimiter;
    setSplitConfig((current) => ({
      ...current,
      customDelimiters: [
        ...current.customDelimiters,
        { id: crypto.randomUUID(), value },
      ],
    }));
    setCustomDelimiter("");
  }

  function removeCustomDelimiter(id: string) {
    setSplitConfig((current) => ({
      ...current,
      customDelimiters: current.customDelimiters.filter(
        (delimiter) => delimiter.id !== id,
      ),
    }));
  }

  /** Markierung im Textfeld als eigenen Abschnitt übernehmen. */
  function markSelectionAsSection() {
    const control = sourceRef.current;
    if (!control || control.selectionEnd <= control.selectionStart) return;
    setManualRanges((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        type: "section",
        start: control.selectionStart,
        end: control.selectionEnd,
      },
    ]);
  }

  /** An der Cursorposition einen Abschnitt beginnen. */
  function splitAtCursor() {
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
  }

  function toggleMarkerMode() {
    setMarkerAnchor(null);
    setMarkerMode((current) => !current);
  }

  function toggleSectionExcluded(id: string) {
    setExcludedSectionIds((current) =>
      current.includes(id)
        ? current.filter((entry) => entry !== id)
        : [...current, id],
    );
  }

  function moveSection(from: number, to: number) {
    setSectionOrder(
      moveRunningDictationSection(
        displayedTextSections.map(({ id }) => id),
        from,
        to,
      ),
    );
  }

  function updateVocabularyPair(
    id: string,
    side: "left" | "right",
    patch: Partial<VocabularyPair["left"]>,
  ) {
    applyVocabularyPairs(
      vocabularyPairs.map((entry) =>
        entry.id === id
          ? { ...entry, [side]: { ...entry[side], ...patch } }
          : entry,
      ),
    );
  }

  /** Eigener LernBox-Tag einer Vokabel; leer nimmt den Standard-Tag. */
  function updateVocabularyTag(id: string, tag: string) {
    applyVocabularyPairs(
      vocabularyPairs.map((entry) => {
        if (entry.id !== id) return entry;
        const next: VocabularyPair = { ...entry };
        if (tag.trim()) next.tag = tag;
        else delete next.tag;
        return next;
      }),
    );
  }

  function removeVocabularyPair(id: string) {
    const next = vocabularyPairs.filter((entry) => entry.id !== id);
    applyVocabularyPairs(next.length > 0 ? next : [emptyVocabularyPair()]);
  }

  function addVocabularyPair() {
    applyVocabularyPairs([...vocabularyPairs, emptyVocabularyPair()]);
  }

  function importVocabularyTable() {
    const imported = parseVocabularyTable(vocabularyTableInput).map((pair) => ({
      ...pair,
      id: crypto.randomUUID(),
    }));
    if (!imported.length) return;
    applyVocabularyPairs(imported);
    setVocabularyTableInput("");
  }

  async function removeParticipant(name: string) {
    if (!liveRoomConfig || !room) return;
    await removeLiveRoomParticipant(liveRoomConfig, room, name);
    await refresh();
  }

  /** Anzeigename eines anonymen Raumschlüssels: Tier und Nummer. */
  function labelFor(key: string | null | undefined) {
    const participant = participants.find((item) => item.studentName === key);
    if (participant?.animalToken)
      return participant.animalNumber > 1
        ? `${participant.animalToken} ${participant.animalNumber}`
        : participant.animalToken;
    if (!key) return "Unbekannt";
    return key.startsWith("participant-") ? "Ohne Tier" : key;
  }

  function clearManualRanges() {
    setManualRanges([]);
  }

  /**
   * Tier eines Raumschlüssels für die Bildanzeige. Ältere Raumdienste liefern
   * kein eigenes Tierfeld, sondern den Tiernamen als Schlüssel („Fuchs 2“).
   */
  function animalFor(key: string | null | undefined) {
    const participant = participants.find((item) => item.studentName === key);
    if (participant?.animalToken) return participant.animalToken;
    return key ? animalTokenFromDisplayName(key) : null;
  }

  function jumpToStage(id: Stage) {
    if (id === "lobby" && !room) void openLobby();
    else setStage(id);
  }

  const refs = {
    mainRef,
    builderRef,
    sourceRef,
    markerContainerRef,
    mathEditInputRef,
  };

  const model = {
    hydrated,
    stage,
    contentMode,
    markerMode,
    markerAnchor,
    mathSettingsOpen,
    setMathSettingsOpen,
    mathEditIndex,
    setMathEditIndex,
    mathDraft,
    setMathDraft,
    mathGaps,
    vocabularyPairs,
    vocabularyCaseSensitive,
    setVocabularyCaseSensitive,
    vocabularyLocales,
    setVocabularyLocales,
    vocabularyTableInput,
    setVocabularyTableInput,
    applyVocabularyPairs,
    sources,
    splitConfig,
    manualRanges,
    excludedSectionIds,
    sectionOrder,
    customDelimiter,
    setCustomDelimiter,
    direction,
    setDirection,
    vocabularyTransfer,
    setVocabularyTransfer,
    wordStoreVisible,
    wordStoreTransfer: wordStoreChoice,
    setWordStoreTransfer,
    lernboxTag,
    liveClasses,
    classChoice: activeClass,
    setClassChoice,
    roundTag,
    setRoundTag,
    updateVocabularyTag,
    gameMode,
    setGameMode,
    shuffleWords,
    setShuffleWords,
    stationShuffle,
    setStationShuffle,
    repeatWrongAnswers,
    setRepeatWrongAnswers,
    assistance,
    setAssistance,
    attempts,
    setAttempts,
    tts,
    setTts,
    showStars,
    setShowStars,
    strictTyping,
    setStrictTyping,
    taskHelp,
    setTaskHelp,
    stationCount,
    setStationCount,
    battleInk,
    setBattleInk,
    battleFlicker,
    setBattleFlicker,
    mathCount,
    setMathCount,
    mathMin,
    setMathMin,
    mathMax,
    setMathMax,
    mathOps,
    mathAllowNegative,
    setMathAllowNegative,
    mathExcludeZeroOperand,
    setMathExcludeZeroOperand,
    mathExcludeZeroResult,
    setMathExcludeZeroResult,
    mathGap,
    setMathGap,
    mathTables,
    title,
    setTitle,
    contentId,
    libraryNotice,
    saveContent,
    createClassNamed,
    deleteContent,
    room,
    roomClosed,
    roomTimeline: timeline,
    roomTimeState: timeState,
    participants,
    students,
    busy,
    error,
    connectionWarning,
    source,
    displayedTextSections,
    markerPieces,
    tokenizeMarkerText,
    removeManualSection,
    handleMarkerWordTap,
    handleMarkerMouseUp,
    mathLines,
    defaultMathGapIndex,
    words,
    startEditMathRow,
    setMathLineGap,
    insertAtMathCursor,
    mathDraftResult,
    commitMathEdit,
    connectedNames,
    importFile,
    exportCsv,
    activeStepIndex,
    activeMode,
    goBack,
    goForward,
    liveRoomConfig,
    chooseContentMode,
    setSplitConfig,
    setSources,
    generateMathTasks,
    toggleMathOperation,
    toggleMathTable,
    rerollMathLine,
    deleteMathLine,
    startAppendMathLine,
    cancelMathEdit,
    togglePunctuation,
    addCustomDelimiter,
    removeCustomDelimiter,
    markSelectionAsSection,
    splitAtCursor,
    toggleMarkerMode,
    toggleSectionExcluded,
    moveSection,
    updateVocabularyPair,
    removeVocabularyPair,
    addVocabularyPair,
    importVocabularyTable,
    removeParticipant,
    labelFor,
    animalFor,
    statusFor,
    jumpToStage,
    setStage,
    footerDisabled,
    steps,
    clearManualRanges,
  };

  return [model, refs] as const;
}

export type TeacherLiveModel = ReturnType<typeof useTeacherLiveRoom>[0];
export type TeacherLiveRefs = ReturnType<typeof useTeacherLiveRoom>[1];
