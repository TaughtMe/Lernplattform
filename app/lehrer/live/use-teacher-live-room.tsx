"use client";

/**
 * Zustand und Abläufe des Lehrkraft-Laufdiktats (Inhalt → Modus → Lobby →
 * Live). Die Fachregeln stammen unverändert aus dem Laufdiktat-Quellcode;
 * die Darstellung liegt in den Schritt-Komponenten dieses Ordners.
 */
import {
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type SetStateAction,
} from "react";
import { tokenizeMarkerText } from "../../../src/domain/running-dictation-sections";
import { defaultMathGapIndex } from "../../../src/domain/mental-math";
import type { LiveRoomConfig } from "../../../src/integrations/laufdiktat/live-room-client";
import {
  buildMathPracticeOptions,
  buildTeacherRoomConfig,
  buildTeacherWords,
  type TeacherContentMode,
} from "../../../src/integrations/laufdiktat/teacher-session";
import {} from "../../../src/integrations/laufdiktat/teacher-results";
import {} from "../../../src/integrations/laufdiktat/room-limits";
import { useMathContent } from "./hooks/use-math-content";
import { useLiveClassChoice } from "./hooks/use-live-class-choice";
import { useTextContent } from "./hooks/use-text-content";
import { useVocabularyContent } from "./hooks/use-vocabulary-content";
import { DEFAULT_SOURCES, MODES } from "./lib/modes";
import {
  forwardCommand,
  initialLiveFlow,
  jumpCommand,
  liveFlowReducer,
  type Stage,
} from "./teacher-live-flow";
import { useLiveRoomSession } from "./hooks/use-live-room-session";
import { useContentRestore } from "./hooks/use-content-restore";
import { useLaunchRequest } from "./hooks/use-launch-request";
import { useGameSettings } from "./hooks/use-game-settings";
import { useHydrated } from "../../ui/use-hydrated";
import { createTeacherContentLibraryRepository } from "../../../src/storage/teacher-class-settings";
import { liveContentToPackage } from "../content-adapter";
import { splitModeOf } from "./dictation-adapter";

export type { Stage };

export { ALL_MODES, CONTENT_MODES, LABELS, MODES } from "./lib/modes";
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
  const [flow, dispatchFlow] = useReducer(liveFlowReducer, initialLiveFlow);
  // Die Wiederaufnahme eines offenen Raums (`restoreChecked`) hat Vorrang vor
  // Adressen und Absicht; `roomClosed` heißt: Raum zu Ende, die letzten
  // Ergebnisse bleiben sichtbar.
  const { stage, roomClosed, busy, startRequested, restoreChecked } = flow;
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

  const { applyRestoredContent } = useContentRestore({
    setContentMode,
    setSources,
    loadPairsFromTable,
    patchSettings,
    setVocabularyTransfer,
    setWordStoreTransfer,
    setRoundTag,
    setRestoredClassSeal,
  });
  const session = useLiveRoomSession({
    hydrated,
    liveRoomConfig,
    clock,
    stage,
    roomClosed,
    dispatchFlow,
    applyRestoredContent,
    setError,
    roomConfig,
    wordCount: words.length,
    gameMode,
    storeContent,
  });
  const {
    room,
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

  useLaunchRequest({
    hydrated,
    liveRoomConfig,
    restoreChecked,
    classesLoaded,
    room,
    busy,
    startRequested,
    liveClasses,
    setError,
    dispatchFlow,
    setContentMode,
    setSources,
    setTitle,
    setContentId,
    resetTextLayout,
    loadPairsFromTable,
    setVocabularyLocales,
    setShuffleWords,
    setGameMode,
    chooseContentMode,
    setClassChoice,
    openLobby,
  });

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
    dispatchFlow({ type: "goBack" });
  }

  function goForward() {
    setError("");
    dispatchFlow({ type: "goForward" });
    const command = forwardCommand(flow);
    if (command === "open-lobby") void openLobby();
    if (command === "start-session") void startSession();
    // Ein geschlossener Raum braucht keinen Aufruf mehr: weiter zum neuen Raum.
    if (command === "reset-room") resetRoomState();
    if (command === "end-room") void endRoom();
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
    if (jumpCommand(id, room !== null)) void openLobby();
    else
      dispatchFlow({ type: "jumpToStage", stage: id, hasRoom: room !== null });
  }

  // Gibt es für die Oberfläche nicht mehr; bleibt für das Modell, wie es war.
  function setStage(value: SetStateAction<Stage>) {
    dispatchFlow({
      type: "jumpToStage",
      stage: typeof value === "function" ? value(stage) : value,
      hasRoom: room !== null,
    });
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
