"use client";

/**
 * Zustand und Abläufe des Lehrkraft-Laufdiktats (Inhalt → Modus → Lobby →
 * Live). Die Fachregeln stammen unverändert aus dem Laufdiktat-Quellcode;
 * die Darstellung liegt in den Schritt-Komponenten dieses Ordners.
 */
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { tokenizeMarkerText } from "../../../src/domain/running-dictation-sections";
import { defaultMathGapIndex } from "../../../src/domain/mental-math";
import { type LiveRoomConfig } from "../../../src/integrations/laufdiktat/live-room-client";
import {
  clearTeacherLiveRoom,
  getLiveRoomState,
  readTeacherLiveRoom,
  type LiveRoomState,
  type OpenedLiveRoom,
} from "../../../src/integrations/laufdiktat/room-api";
import {
  buildMathPracticeOptions,
  buildTeacherRoomConfig,
  buildTeacherWords,
  type TeacherContentMode,
  type TeacherGameMode,
} from "../../../src/integrations/laufdiktat/teacher-session";
import {} from "../../../src/integrations/laufdiktat/teacher-results";
import { parseLiveSession } from "../../../src/integrations/laufdiktat/live-session";
import {} from "../../../src/integrations/laufdiktat/room-limits";
import { useMathContent } from "./hooks/use-math-content";
import { useLiveClassChoice } from "./hooks/use-live-class-choice";
import { useTextContent } from "./hooks/use-text-content";
import { useVocabularyContent } from "./hooks/use-vocabulary-content";
import type { Stage } from "./teacher-live-flow";
import {
  useLiveRoomChannel,
  useLiveRoomSession,
} from "./hooks/use-live-room-session";
import { useGameSettings } from "./hooks/use-game-settings";
import { useHydrated } from "../../ui/use-hydrated";
import { createTeacherContentLibraryRepository } from "../../../src/storage/teacher-class-settings";
import { liveContentToPackage, packageToLiveContent } from "../content-adapter";
import { takeLiveIntent } from "../live-intent";
import { splitModeOf } from "./dictation-adapter";
import {} from "./lib/participant-display";
import type { TeacherContentPackage } from "../../../src/domain/teacher-content-library";

export type { Stage };

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
export {
  emptyVocabularyPair,
  emptyVocabularySide,
} from "./lib/vocabulary-pairs";

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
  const [sources, setSources] = useState(DEFAULT_SOURCES);
  const {
    settings: {
      gameMode,
      shuffleWords,
      stationShuffle,
      repeatWrongAnswers,
      assistance,
      attempts,
      tts,
      showStars,
      strictTyping,
      taskHelp,
      stationCount,
      battleInk,
      battleFlicker,
      mathCount,
      mathMin,
      mathMax,
      mathOps,
      mathAllowNegative,
      mathExcludeZeroOperand,
      mathExcludeZeroResult,
      mathGap,
      mathTables,
    },
    setGameMode,
    setShuffleWords,
    setStationShuffle,
    setRepeatWrongAnswers,
    setAssistance,
    setAttempts,
    setTts,
    setShowStars,
    setStrictTyping,
    setTaskHelp,
    setStationCount,
    setBattleInk,
    setBattleFlicker,
    setMathCount,
    setMathMin,
    setMathMax,
    setMathAllowNegative,
    setMathExcludeZeroOperand,
    setMathExcludeZeroResult,
    setMathGap,
    patchSettings,
    toggleMathOperation,
    toggleMathTable,
  } = useGameSettings();
  const [error, setError] = useState("");
  const {
    mathSettingsOpen,
    setMathSettingsOpen,
    mathEditIndex,
    setMathEditIndex,
    mathDraft,
    setMathDraft,
    mathGaps,
    mathEditInputRef,
    mathLines,
    mathWords,
    mathDraftResult,
    startEditMathRow,
    setMathLineGap,
    insertAtMathCursor,
    commitMathEdit,
    generateMathTasks,
    rerollMathLine,
    deleteMathLine,
    startAppendMathLine,
    cancelMathEdit,
  } = useMathContent({
    mathSource: sources.math,
    contentMode,
    settings: {
      mathCount,
      mathMin,
      mathMax,
      mathOps,
      mathAllowNegative,
      mathExcludeZeroOperand,
      mathExcludeZeroResult,
      mathTables,
      mathGap,
    },
    setSources,
    setError,
  });
  const {
    vocabularyPairs,
    vocabularyCaseSensitive,
    setVocabularyCaseSensitive,
    vocabularyLocales,
    setVocabularyLocales,
    vocabularyTableInput,
    setVocabularyTableInput,
    direction,
    setDirection,
    vocabularyTransfer,
    setVocabularyTransfer,
    lernboxTag,
    roundTag,
    setRoundTag,
    vocabularyTag,
    applyVocabularyPairs,
    loadPairsFromTable,
    updateVocabularyPair,
    updateVocabularyTag,
    removeVocabularyPair,
    addVocabularyPair,
    importVocabularyTable,
  } = useVocabularyContent({ setSources });
  const source = sources[contentMode];
  const {
    markerMode,
    markerAnchor,
    splitConfig,
    setSplitConfig,
    manualRanges,
    excludedSectionIds,
    sectionOrder,
    customDelimiter,
    setCustomDelimiter,
    wordStoreVisible,
    wordStoreChoice,
    setWordStoreTransfer,
    wordStoreTransfer,
    sourceRef,
    markerContainerRef,
    orderedTextSections,
    displayedTextSections,
    markerPieces,
    resetTextLayout,
    removeManualSection,
    handleMarkerWordTap,
    handleMarkerMouseUp,
    togglePunctuation,
    addCustomDelimiter,
    removeCustomDelimiter,
    markSelectionAsSection,
    splitAtCursor,
    toggleMarkerMode,
    toggleSectionExcluded,
    moveSection,
    clearManualRanges,
  } = useTextContent({ textSource: sources.text, source });
  const [libraryNotice, setLibraryNotice] = useState("");
  const {
    liveClasses,
    classChoice: activeClass,
    classesLoaded,
    classSeal,
    setClassChoice,
    setRestoredClassSeal,
    createClassNamed,
  } = useLiveClassChoice({ clock, setError, setLibraryNotice });
  const mainRef = useRef<HTMLElement>(null);
  const builderRef = useRef<HTMLDivElement>(null);
  // Abgelegter Inhalt, der gerade bearbeitet wird (null = noch nicht abgelegt).
  const [contentId, setContentId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  // Die Wiederaufnahme eines offenen Raums hat Vorrang vor Adressen und Absicht.
  const [restoreChecked, setRestoreChecked] = useState(false);
  const [startRequested, setStartRequested] = useState(false);
  // Raum ist zu Ende (Frist oder Server), die letzten Ergebnisse bleiben sichtbar.
  const [roomClosed, setRoomClosed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, [stage]);
  useEffect(() => {
    if (builderRef.current) builderRef.current.scrollTop = 0;
  }, [contentMode]);
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
              mathPracticeOptions: buildMathPracticeOptions({
                min: mathMin,
                max: mathMax,
                operations: mathOps,
                allowNegativeResults: mathAllowNegative,
                excludeZeroOperand: mathExcludeZeroOperand,
                excludeZeroResult: mathExcludeZeroResult,
                tables: mathTables,
                gap: mathGap,
              }),
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

  const session = useLiveRoomSession({
    liveRoomConfig,
    clock,
    stage,
    setStage,
    roomClosed,
    setRoomClosed,
    setBusy,
    setError,
    roomConfig,
    wordCount: words.length,
    gameMode,
    storeContent,
  });
  const {
    room,
    setRoom,
    participants,
    students,
    connectionWarning,
    timeline,
    timeState,
    connectedNames,
    statusFor,
    labelFor,
    animalFor,
    openLobby,
    startSession,
    endRoom,
    resetRoomState,
    exportCsv,
    removeParticipant,
  } = session;

  // Übernimmt einen offenen Raum samt Inhalt und Optionen. Liest den Stand
  // dieses Renderns; Auslöser ist allein der Effekt darunter.
  const applyRestoredRoom = useEffectEvent(
    (
      stored: OpenedLiveRoom,
      state: LiveRoomState,
      restoreClock: () => number,
    ) => {
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
        loadPairsFromTable(restoredSource);
      }
      patchSettings({
        gameMode: restored.stationMode ? "STATION" : restored.gameMode,
        shuffleWords: restored.shuffleWords,
        stationShuffle: restored.stationShuffle,
        repeatWrongAnswers: restored.repeatWrongAnswers,
        assistance: restored.uebungAssistanceEnabled,
        attempts: restored.uebungMaxAttempts,
        tts: restored.isTtsEnabled,
        showStars: restored.showStars,
        strictTyping: restored.strictTypingMode,
        taskHelp: restored.showTaskAfterErrors,
        stationCount: restored.stationCount,
        battleInk: restored.battleOptions.ink,
        battleFlicker: restored.battleOptions.flicker,
      });
      setVocabularyTransfer(restored.vocabularyTransfer);
      setWordStoreTransfer(restored.wordStoreTransfer);
      setRoundTag(restored.vocabularyTag ?? "");
      setRestoredClassSeal(restored.classSeal);
      // Ohne gemerkte Öffnungszeit (ältere Sitzung) zählt der Moment der Wiederaufnahme.
      setRoom({ ...stored, openedAt: stored.openedAt ?? nowIso(restoreClock) });
      setStage(state.status === "live" ? "live" : "lobby");
      setRestoreChecked(true);
    },
  );
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
        applyRestoredRoom(stored, state, clock);
      })
      .catch(() => {
        clearTeacherLiveRoom();
        setRestoreChecked(true);
      });
  }, [clock, hydrated, liveRoomConfig, room]);

  useLiveRoomChannel({ liveRoomConfig, stage, roomClosed, session });

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
      resetTextLayout(loaded.textSplitConfig);
    }
    if (loaded.contentMode === "vocabulary") {
      loadPairsFromTable(loaded.source);
      setVocabularyLocales(loaded.vocabularyLocales);
      setShuffleWords(true);
    }
  }

  // Adresse (`inhalt`, `neu`, `schritt`, `modus`) und Start-Absicht werten wir
  // genau einmal aus. Beides löst nur Laden und Anzeigen aus; einen Raum
  // erstellt allein „Jetzt starten“, und die Absicht ist dann schon gelöscht.
  const paramsHandled = useRef(false);
  // Liest den Stand dieses Renderns; Auslöser sind allein die Abhängigkeiten des Effekts.
  const handleLaunchParams = useEffectEvent(() => {
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
  });
  useEffect(() => {
    if (paramsHandled.current) return;
    if (!hydrated || !restoreChecked || !classesLoaded) return;
    paramsHandled.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- einmalige Auswertung der Adresse beim Start, kein Abgleich von Zuständen
    handleLaunchParams();
  }, [classesLoaded, hydrated, params, restoreChecked, room, router]);

  // „Jetzt starten“: Sobald Inhalt, Modus und Klasse übernommen sind, öffnet
  // sich die Lobby mit den Standardoptionen des Modus.
  const onStartRequested = useEffectEvent(() => {
    if (busy || room) return;
    setStartRequested(false);
    void openLobby();
  });
  useEffect(() => {
    if (!startRequested) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- einmaliges Ergebnis einer Prüfung beim Start, kein Abgleich von Zuständen
    onStartRequested();
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
        loadPairsFromTable(text);
      }
    };
    reader.readAsText(file);
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
      loadPairsFromTable(sources.vocabulary);
    }
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
