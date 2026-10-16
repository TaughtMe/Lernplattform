"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  useEffect,
  useEffectEvent,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { TextSplitConfig } from "../../../../src/domain/running-dictation-sections";
import type { VocabularyLocales } from "../../../../src/domain/running-dictation";
import type { TeacherContentPackage } from "../../../../src/domain/teacher-content-library";
import type { LiveRoomConfig } from "../../../../src/integrations/laufdiktat/live-room-client";
import type { OpenedLiveRoom } from "../../../../src/integrations/laufdiktat/room-api";
import type {
  TeacherContentMode,
  TeacherGameMode,
} from "../../../../src/integrations/laufdiktat/teacher-session";
import { createTeacherContentLibraryRepository } from "../../../../src/storage/teacher-class-settings";
import { packageToLiveContent } from "../../content-adapter";
import { takeLiveIntent } from "../../live-intent";
import { ALL_MODES } from "../lib/modes";
import type { LiveFlowAction, Stage } from "../teacher-live-flow";

type LaunchRequestInput = {
  hydrated: boolean;
  liveRoomConfig: LiveRoomConfig | null;
  /** Die Wiederaufnahme eines offenen Raums ist geprüft. */
  restoreChecked: boolean;
  classesLoaded: boolean;
  room: OpenedLiveRoom | null;
  busy: boolean;
  startRequested: boolean;
  liveClasses: { id: string }[];
  setError: (message: string) => void;
  dispatchFlow: Dispatch<LiveFlowAction>;
  setContentMode: Dispatch<SetStateAction<TeacherContentMode>>;
  setSources: Dispatch<SetStateAction<Record<TeacherContentMode, string>>>;
  setTitle: Dispatch<SetStateAction<string>>;
  setContentId: Dispatch<SetStateAction<string | null>>;
  resetTextLayout: (splitConfig: TextSplitConfig) => void;
  loadPairsFromTable: (table: string) => void;
  setVocabularyLocales: Dispatch<SetStateAction<VocabularyLocales>>;
  setShuffleWords: Dispatch<SetStateAction<boolean>>;
  setGameMode: Dispatch<SetStateAction<TeacherGameMode>>;
  chooseContentMode: (mode: TeacherContentMode) => void;
  setClassChoice: (id: string) => Promise<void>;
  openLobby: () => Promise<void>;
};

/**
 * Adresse und Start-Absicht: Laden aus der Ablage, Anzeigen eines Schritts
 * und „Jetzt starten“. Sie laufen erst nach der Wiederaufnahme.
 */
export function useLaunchRequest({
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
}: LaunchRequestInput) {
  const router = useRouter();
  const params = useSearchParams();

  // Ohne Raumdienst gibt es nichts wiederherzustellen.
  const markRestoreChecked = useEffectEvent(() =>
    dispatchFlow({ type: "restoreChecked" }),
  );
  useEffect(() => {
    if (hydrated && !liveRoomConfig) markRestoreChecked();
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
    // Ein offener Raum hat Vorrang und führt gar nicht erst hierher.
    const jumpTo = (stage: Stage) =>
      dispatchFlow({ type: "jumpToStage", stage, hasRoom: false });
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
      if (stepParam === "inhalt") jumpTo("content");
      if (stepParam === "einstellungen") jumpTo("settings");
      if (intent) {
        const known = liveClasses.some(({ id }) => id === intent.classId);
        await setClassChoice(known ? intent.classId : "");
        jumpTo("settings");
        dispatchFlow({ type: "startRequested" });
      }
    })().catch(() =>
      setError("Der Inhalt konnte nicht aus der Ablage geladen werden."),
    );
  });
  useEffect(() => {
    if (paramsHandled.current) return;
    if (!hydrated || !restoreChecked || !classesLoaded) return;
    paramsHandled.current = true;
    handleLaunchParams();
  }, [classesLoaded, hydrated, params, restoreChecked, room, router]);

  // „Jetzt starten“: Sobald Inhalt, Modus und Klasse übernommen sind, öffnet
  // sich die Lobby mit den Standardoptionen des Modus.
  const onStartRequested = useEffectEvent(() => {
    if (busy || room) return;
    dispatchFlow({ type: "startHandled" });
    void openLobby();
  });
  useEffect(() => {
    if (!startRequested) return;
    onStartRequested();
  }, [startRequested]);
}
