"use client";

/**
 * Zustand und Abläufe des Lehrkraft-Laufdiktats (Inhalt → Modus → Lobby →
 * Live). Dieser Hook setzt die Teil-Hooks aus `./hooks` zusammen und baut
 * daraus das Modell für die Oberfläche. Die Fachregeln stammen unverändert
 * aus dem Laufdiktat-Quellcode; die Darstellung liegt in den
 * Schritt-Komponenten dieses Ordners.
 *
 * Die Reihenfolge der Aufrufe ist die Reihenfolge der Effekte: Teil-Hooks mit
 * Effekten stehen so, wie diese Effekte vor der Aufteilung liefen.
 */
import {
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type SetStateAction,
} from "react";
import { defaultMathGapIndex } from "../../../src/domain/mental-math";
import { tokenizeMarkerText } from "../../../src/domain/running-dictation-sections";
import type { LiveRoomConfig } from "../../../src/integrations/laufdiktat/live-room-client";
import {
  buildTeacherWords,
  type TeacherContentMode,
} from "../../../src/integrations/laufdiktat/teacher-session";
import { useHydrated } from "../../ui/use-hydrated";
import { useContentLibrary } from "./hooks/use-content-library";
import { useContentRestore } from "./hooks/use-content-restore";
import { useGameSettings } from "./hooks/use-game-settings";
import { useLaunchRequest } from "./hooks/use-launch-request";
import { useLiveClassChoice } from "./hooks/use-live-class-choice";
import { useLiveRoomSession } from "./hooks/use-live-room-session";
import { useMathContent } from "./hooks/use-math-content";
import { useTextContent } from "./hooks/use-text-content";
import { useVocabularyContent } from "./hooks/use-vocabulary-content";
import { DEFAULT_SOURCES, MODES } from "./lib/modes";
import { buildLiveRoomConfig } from "./lib/room-config";
import {
  forwardCommand,
  initialLiveFlow,
  jumpCommand,
  liveFlowReducer,
  type Stage,
} from "./teacher-live-flow";

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
  const source = sources[contentMode];
  const [error, setError] = useState("");
  const [libraryNotice, setLibraryNotice] = useState("");

  const game = useGameSettings();
  const { settings, patchSettings } = game;
  const { setGameMode, setShuffleWords } = game.model;
  const math = useMathContent({
    mathSource: sources.math,
    contentMode,
    settings,
    setSources,
    setError,
  });
  const vocabulary = useVocabularyContent({ setSources });
  const text = useTextContent({ textSource: sources.text, source });
  const classes = useLiveClassChoice({ clock, setError, setLibraryNotice });
  const library = useContentLibrary({
    clock,
    contentMode,
    source,
    splitConfig: text.splitConfig,
    vocabularyLocales: vocabulary.vocabularyLocales,
    activeClass: classes.classChoice,
    setError,
    setLibraryNotice,
    setSources,
    loadPairsFromTable: vocabulary.loadPairsFromTable,
  });
  const { setContentId } = library;

  const mainRef = useRef<HTMLElement>(null);
  const builderRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, [stage]);
  useEffect(() => {
    if (builderRef.current) builderRef.current.scrollTop = 0;
  }, [contentMode]);

  const { orderedTextSections } = text;
  const { direction, vocabularyCaseSensitive, vocabularyLocales } = vocabulary;
  const words = useMemo(
    () =>
      contentMode === "text"
        ? orderedTextSections.map((section) => ({
            id: section.id,
            kind: "text" as const,
            targetWord: section.text,
          }))
        : contentMode === "math"
          ? math.mathWords
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
      math.mathWords,
      orderedTextSections,
      source,
      vocabularyCaseSensitive,
      vocabularyLocales,
    ],
  );

  const { vocabularyTransfer, vocabularyTag } = vocabulary;
  const { wordStoreTransfer } = text;
  const { classSeal } = classes;
  const roomConfig = useMemo(
    () =>
      buildLiveRoomConfig({
        contentMode,
        source,
        direction,
        vocabularyTransfer,
        wordStoreTransfer,
        vocabularyTag,
        classSeal,
        settings,
        words,
      }),
    [
      classSeal,
      contentMode,
      direction,
      settings,
      source,
      vocabularyTag,
      vocabularyTransfer,
      wordStoreTransfer,
      words,
    ],
  );

  function chooseContentMode(mode: TeacherContentMode) {
    // Ein anderer Typ ist ein anderer Inhalt: nicht über das Paket schreiben.
    if (mode !== contentMode) setContentId(null);
    setContentMode(mode);
    if (mode === "vocabulary") {
      setShuffleWords(true);
      vocabulary.loadPairsFromTable(sources.vocabulary);
    }
  }

  const { applyRestoredContent } = useContentRestore({
    setContentMode,
    setSources,
    loadPairsFromTable: vocabulary.loadPairsFromTable,
    patchSettings,
    setVocabularyTransfer: vocabulary.setVocabularyTransfer,
    setWordStoreTransfer: text.setWordStoreTransfer,
    setRoundTag: vocabulary.setRoundTag,
    setRestoredClassSeal: classes.setRestoredClassSeal,
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
    gameMode: settings.gameMode,
    storeContent: library.storeContent,
  });
  const { room, connectedNames, openLobby, startSession, endRoom } = session;
  useLaunchRequest({
    hydrated,
    liveRoomConfig,
    restoreChecked,
    classesLoaded: classes.classesLoaded,
    room,
    busy,
    startRequested,
    liveClasses: classes.liveClasses,
    setError,
    dispatchFlow,
    setContentMode,
    setSources,
    setTitle: library.setTitle,
    setContentId,
    resetTextLayout: text.resetTextLayout,
    loadPairsFromTable: vocabulary.loadPairsFromTable,
    setVocabularyLocales: vocabulary.model.setVocabularyLocales,
    setShuffleWords,
    setGameMode,
    chooseContentMode,
    setClassChoice: classes.setClassChoice,
    openLobby,
  });

  const steps: Array<[Stage, string]> = [
    ["content", "Inhalte"],
    ["settings", "Einstellungen"],
    ["lobby", "Lobby"],
    ["live", "Durchführung & Auswertung"],
  ];
  const activeStepIndex = steps.findIndex(([id]) => id === stage);
  const activeMode =
    MODES.find((mode) => mode.id === settings.gameMode) ?? MODES[0]!;
  const footerDisabled =
    busy ||
    (stage === "content" && !words.length) ||
    (stage === "lobby" &&
      settings.gameMode !== "STATION" &&
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
    if (command === "reset-room") session.resetRoomState();
    if (command === "end-room") void endRoom();
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
    sourceRef: text.sourceRef,
    markerContainerRef: text.markerContainerRef,
    mathEditInputRef: math.mathEditInputRef,
  };

  const model = {
    ...game.model,
    ...math.model,
    ...vocabulary.model,
    ...text.model,
    ...classes.model,
    ...library.model,
    ...session.model,
    hydrated,
    stage,
    contentMode,
    sources,
    libraryNotice,
    busy,
    error,
    source,
    tokenizeMarkerText,
    defaultMathGapIndex,
    words,
    activeStepIndex,
    activeMode,
    goBack,
    goForward,
    liveRoomConfig,
    chooseContentMode,
    setSources,
    jumpToStage,
    setStage,
    roomClosed,
    footerDisabled,
    steps,
  };

  return [model, refs] as const;
}

export type TeacherLiveModel = ReturnType<typeof useTeacherLiveRoom>[0];
export type TeacherLiveRefs = ReturnType<typeof useTeacherLiveRoom>[1];
