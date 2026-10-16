"use client";

/**
 * Zustand und Abläufe des Lehrkraft-Laufdiktats (Inhalt → Modus → Lobby →
 * Live). Die Fachregeln stammen unverändert aus dem Laufdiktat-Quellcode;
 * die Darstellung liegt in den Schritt-Komponenten dieses Ordners.
 */
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ParticipantStatus } from "../../views/laufdiktat/teacher-dictation-screen";
import { tokenizeMarkerText } from "../../../src/domain/running-dictation-sections";
import { defaultMathGapIndex } from "../../../src/domain/mental-math";
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
  type LiveRoomState,
  type LiveRoomStudent,
  type OpenedLiveRoom,
} from "../../../src/integrations/laufdiktat/room-api";
import {
  buildMathPracticeOptions,
  buildTeacherRoomConfig,
  buildTeacherWords,
  type TeacherContentMode,
  type TeacherGameMode,
} from "../../../src/integrations/laufdiktat/teacher-session";
import {
  buildTeacherResultCsv,
  csvParticipantLabel,
  resultNamesFor,
} from "../../../src/integrations/laufdiktat/teacher-results";
import { parseLiveSession } from "../../../src/integrations/laufdiktat/live-session";
import { createLiveRoomDebounce } from "../../../src/integrations/laufdiktat/debounce";
import {
  roomTimeline,
  roomTimeState,
} from "../../../src/integrations/laufdiktat/room-limits";
import { useMathContent } from "./hooks/use-math-content";
import { useLiveClassChoice } from "./hooks/use-live-class-choice";
import { useTextContent } from "./hooks/use-text-content";
import { useVocabularyContent } from "./hooks/use-vocabulary-content";
import { useGameSettings } from "./hooks/use-game-settings";
import { useHydrated } from "../../ui/use-hydrated";
import { createTeacherContentLibraryRepository } from "../../../src/storage/teacher-class-settings";
import { liveContentToPackage, packageToLiveContent } from "../content-adapter";
import { takeLiveIntent } from "../live-intent";
import { splitModeOf } from "./dictation-adapter";
import {
  participantAnimal,
  participantLabel,
  participantStatus,
} from "./lib/participant-display";
import type { TeacherContentPackage } from "../../../src/domain/teacher-content-library";

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

export {
  emptyVocabularyPair,
  emptyVocabularySide,
} from "./lib/vocabulary-pairs";

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
  const [connectionWarning, setConnectionWarning] = useState("");
  const channelRef = useRef<RealtimeChannel | null>(null);

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

  const registeredNames = participants.map(({ studentName }) => studentName);
  const connectedNames = Array.from(
    new Set([
      ...presenceNames,
      ...participants.filter(isOnline).map(({ studentName }) => studentName),
    ]),
  ).sort((a, b) => a.localeCompare(b, "de"));
  const allNames = Array.from(new Set([...registeredNames, ...connectedNames]));

  function statusFor(name: string): ParticipantStatus {
    return participantStatus(practicingNames, connectedNames, name);
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
  const onClockClosesRoom = useEffectEvent(() => finishClosedRoom());
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
      await onClockClosesRoom();
    })();
  }, [closesAtMs, liveRoomConfig, nowMs, room, roomClosed]);

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
    const resultNames = resultNamesFor(gameMode, students, allNames);
    const blob = new Blob(
      [
        buildTeacherResultCsv(resultNames, students, words.length, (name) =>
          csvParticipantLabel(name, participants),
        ),
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
      loadPairsFromTable(sources.vocabulary);
    }
  }

  async function removeParticipant(name: string) {
    if (!liveRoomConfig || !room) return;
    await removeLiveRoomParticipant(liveRoomConfig, room, name);
    await refresh();
  }

  function labelFor(key: string | null | undefined) {
    return participantLabel(participants, key);
  }

  function animalFor(key: string | null | undefined) {
    return participantAnimal(participants, key);
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
