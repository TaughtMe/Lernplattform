"use client";

import { QRCodeCanvas } from "qrcode.react";
import { useState } from "react";
import type { LiveRoomConfig } from "../../../src/integrations/laufdiktat/live-room-client";
import { useThemeToggle } from "../../ui/theme";
import {
  TeacherDictationScreen,
  type DictationOption,
  type TeacherStep,
} from "../../views/laufdiktat/teacher-dictation-screen";
import {
  liveOverview,
  splitConfigFor,
  splitModeOf,
  STAGE_OF_STEP,
  STEP_OF_STAGE,
} from "./dictation-adapter";
import {
  useTeacherLiveRoom,
  type TeacherLiveModel,
} from "./use-teacher-live-room";
import styles from "./teacher-live-room.module.css";

/**
 * Laufdiktat für Lehrkräfte (Design 5c/5d): verbindet den Live-Raum-Kern
 * mit der Design-Ansicht. Funktionen ohne Entwurf (eigene Trenner,
 * Marker-Modus, Generator-Einstellungen, Teilnehmende entfernen) sind
 * vorerst nicht sichtbar; sie kommen mit eigenem Entwurf zurück.
 */
export function TeacherLiveRoom({
  liveRoomConfig,
}: {
  liveRoomConfig: LiveRoomConfig | null;
}) {
  const [t] = useTeacherLiveRoom(liveRoomConfig);
  const { theme, toggleTheme } = useThemeToggle();
  const [optionsOpen, setOptionsOpen] = useState(false);
  const stationMode = t.gameMode === "STATION";

  const options: Record<DictationOption, boolean> = {
    tts: t.tts,
    shuffle: stationMode ? t.stationShuffle : t.shuffleWords,
    strict: t.strictTyping,
    stars: t.showStars,
    ink: t.battleInk,
    flicker: t.battleFlicker,
  };

  function toggleOption(option: DictationOption) {
    if (option === "tts") t.setTts(!t.tts);
    if (option === "shuffle") {
      if (stationMode) t.setStationShuffle(!t.stationShuffle);
      else t.setShuffleWords(!t.shuffleWords);
    }
    if (option === "strict") t.setStrictTyping(!t.strictTyping);
    if (option === "stars") t.setShowStars(!t.showStars);
    if (option === "ink") t.setBattleInk(!t.battleInk);
    if (option === "flicker") t.setBattleFlicker(!t.battleFlicker);
  }

  const joinUrl =
    t.room && t.hydrated
      ? `${window.location.origin}/raum?code=${t.room.code}`
      : "";

  return (
    <div className={styles.page} data-hydrated={t.hydrated ? "true" : "false"}>
      <TeacherDictationScreen
        roomCode={t.room?.code ?? ""}
        joinHost={t.hydrated ? window.location.host : ""}
        theme={theme}
        step={STEP_OF_STAGE[t.stage]}
        content={{
          kind: t.contentMode,
          text: t.sources[t.contentMode],
          split: splitModeOf(t.splitConfig),
          sections: sectionsOf(t),
        }}
        mode={t.gameMode}
        options={options}
        stationCount={t.stationCount}
        optionsOpen={optionsOpen}
        qr={
          joinUrl ? (
            <QRCodeCanvas
              value={joinUrl}
              size={512}
              level="H"
              marginSize={2}
              className={styles.qr}
              role="img"
              aria-label={`QR-Code zum Raum ${t.room?.code ?? ""}`}
            />
          ) : null
        }
        lobby={{
          joined: t.participants.map(({ studentName }) => ({
            name: t.labelFor(studentName),
            animal: t.animalFor(studentName),
          })),
        }}
        live={liveOverview({
          students: t.students,
          connectedNames: t.connectedNames,
          total: t.words.length,
          stationMode,
          stationCount: t.stationCount,
          labelFor: t.labelFor,
          animalFor: t.animalFor,
        })}
        nextLabel={nextLabel(t)}
        nextDisabled={t.footerDisabled}
        lockedSteps={lockedSteps(t)}
        {...(t.error || t.connectionWarning
          ? { notice: t.error || t.connectionWarning }
          : {})}
        onToggleTheme={toggleTheme}
        onLeave={() => window.location.assign("/lehrer")}
        onStep={(step: TeacherStep) => t.jumpToStage(STAGE_OF_STEP[step])}
        onNext={t.goForward}
        onPrevious={t.goBack}
        onKind={t.chooseContentMode}
        onText={(text) =>
          t.setSources((current) => ({ ...current, [t.contentMode]: text }))
        }
        onSplit={(split) => t.setSplitConfig(splitConfigFor(split))}
        onMoveSection={t.moveSection}
        onImportFile={t.importFile}
        onMode={t.setGameMode}
        onToggleOption={toggleOption}
        onStationCount={(count) =>
          t.setStationCount(Math.min(40, Math.max(1, count)))
        }
        onOpenOptions={() => setOptionsOpen(true)}
        onCloseOptions={() => setOptionsOpen(false)}
        onExportCsv={t.exportCsv}
      />
    </div>
  );
}

function sectionsOf(t: TeacherLiveModel): string[] {
  if (t.contentMode === "text") {
    return t.displayedTextSections
      .filter(({ id }) => !t.excludedSectionIds.includes(id))
      .map(({ text }) => text);
  }
  return t.words.map((word) => {
    const prompt = "prompt" in word ? word.prompt : undefined;
    if (!prompt) return word.targetWord;
    return t.contentMode === "vocabulary"
      ? `${prompt} → ${word.targetWord}`
      : prompt;
  });
}

function lockedSteps(t: TeacherLiveModel): TeacherStep[] {
  const locked: TeacherStep[] = [];
  if (!t.words.length) locked.push("settings", "lobby", "live");
  if (!t.room && t.stage !== "settings") locked.push("lobby");
  if (t.stage !== "live") locked.push("live");
  return locked;
}

function nextLabel(t: TeacherLiveModel) {
  if (t.busy) {
    if (t.stage === "settings") return "Öffnet …";
    if (t.stage === "lobby") return "Startet …";
    if (t.stage === "live") return "Beendet …";
  }
  if (t.stage === "content") return "Weiter zu Modus";
  if (t.stage === "settings") return "Raum öffnen";
  if (t.stage === "lobby") return "Sitzung starten";
  return "Sitzung beenden";
}
