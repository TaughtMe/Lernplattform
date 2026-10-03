"use client";

import { QRCodeCanvas } from "qrcode.react";
import { useState } from "react";
import { MULTIPLICATION_TABLES } from "../../../src/domain/mental-math";
import { VOCABULARY_LANGUAGES } from "../../../src/domain/running-dictation";
import type { LiveRoomConfig } from "../../../src/integrations/laufdiktat/live-room-client";
import { MathDisplay } from "../../components/math-display";
import { useThemeToggle } from "../../ui/theme";
import type { MathEditorProps } from "../../views/laufdiktat/math-editor";
import type { VocabularyEditorProps } from "../../views/laufdiktat/vocabulary-editor";
import {
  TeacherDictationScreen,
  type DictationOption,
  type TeacherStep,
} from "../../views/laufdiktat/teacher-dictation-screen";
import {
  liveOverview,
  type LiveOverview,
  mathGapRow,
  mathLineParts,
  roomTimesView,
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
 * mit der Design-Ansicht. Vokabeln und Mathe haben eigene Editoren
 * (Vokabelheft, Aufgaben-Generator). Funktionen ohne Entwurf (eigene
 * Trenner, Marker-Modus, Teilnehmende entfernen) sind vorerst nicht
 * sichtbar; sie kommen mit eigenem Entwurf zurück.
 */
export function TeacherLiveRoom({
  liveRoomConfig,
  clock,
}: {
  liveRoomConfig: LiveRoomConfig | null;
  /** Uhr für die Raumfristen in Millisekunden; die Tests setzen eine eigene. */
  clock?: () => number;
}) {
  const [t, refs] = useTeacherLiveRoom(liveRoomConfig, clock);
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

  const roomTimes = roomTimesView(t.roomTimeline, t.roomTimeState);

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
        classChoice={{
          options: t.liveClasses,
          value: t.classChoice,
          onChange: (id) => void t.setClassChoice(id),
        }}
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
        qrLarge={
          joinUrl ? (
            <QRCodeCanvas
              value={joinUrl}
              size={1024}
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
            status: t.statusFor(studentName),
          })),
        }}
        live={withMathMistakes(
          liveOverview({
            students: t.students,
            connectedNames: t.connectedNames,
            total: t.words.length,
            stationMode,
            stationCount: t.stationCount,
            labelFor: t.labelFor,
            animalFor: t.animalFor,
            statusFor: t.statusFor,
          }),
        )}
        {...(roomTimes ? { roomTimes } : {})}
        nextLabel={nextLabel(t)}
        nextDisabled={t.footerDisabled}
        lockedSteps={lockedSteps(t)}
        {...(t.error || t.connectionWarning
          ? { notice: t.error || t.connectionWarning }
          : {})}
        vocabulary={vocabularyProps(t)}
        math={mathProps(t, refs.mathEditInputRef)}
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

/** Formeln (Brüche, Wurzeln, Potenzen) in „Häufigste Fehler“ setzen. */
function withMathMistakes(live: LiveOverview) {
  return {
    ...live,
    mistakes: live.mistakes.map((entry) =>
      /[\\^]/.test(entry.word)
        ? { ...entry, display: <MathDisplay text={entry.word} isLatex /> }
        : entry,
    ),
  };
}

function vocabularyProps(t: TeacherLiveModel): VocabularyEditorProps {
  return {
    pairs: t.vocabularyPairs,
    languages: VOCABULARY_LANGUAGES,
    locales: t.vocabularyLocales,
    direction: t.direction,
    caseSensitive: t.vocabularyCaseSensitive,
    transfer: t.vocabularyTransfer,
    ...(t.lernboxTag ? { defaultTag: t.lernboxTag } : {}),
    roundTag: t.roundTag,
    onRoundTag: t.setRoundTag,
    tableInput: t.vocabularyTableInput,
    onLocale: (side, locale) =>
      t.setVocabularyLocales((current) => ({ ...current, [side]: locale })),
    onPrimary: (id, side, value) =>
      t.updateVocabularyPair(id, side, { primary: value }),
    onAlternatives: (id, side, values) =>
      t.updateVocabularyPair(id, side, { alternatives: values }),
    onRemove: t.removeVocabularyPair,
    onAdd: t.addVocabularyPair,
    onDirection: t.setDirection,
    onCaseSensitive: t.setVocabularyCaseSensitive,
    onTransfer: t.setVocabularyTransfer,
    onTag: t.updateVocabularyTag,
    onTableInput: t.setVocabularyTableInput,
    onImportTable: t.importVocabularyTable,
    onImportFile: t.importFile,
  };
}

/** Mathe-Zeile mit Ergebnis; Brüche, Wurzeln und Potenzen per KaTeX. */
function MathLine({ line }: { line: string }) {
  const { text, latex, result } = mathLineParts(line);
  if (result === null) return <>{text}</>;
  if (!latex) return <>{`${text} = ${result}`}</>;
  return (
    <>
      <MathDisplay text={text} isLatex /> = {result}
    </>
  );
}

function mathProps(
  t: TeacherLiveModel,
  inputRef: MathEditorProps["inputRef"],
): MathEditorProps {
  const draftResult =
    t.mathDraft.trim() === ""
      ? ""
      : t.mathDraftResult === null
        ? "ungültig"
        : `= ${String(t.mathDraftResult).replace(".", ",")}`;
  return {
    operators: t.mathOps,
    min: t.mathMin,
    max: t.mathMax,
    count: t.mathCount,
    allowNegative: t.mathAllowNegative,
    excludeZeroOperand: t.mathExcludeZeroOperand,
    excludeZeroResult: t.mathExcludeZeroResult,
    gap: t.mathGap,
    tables: { all: MULTIPLICATION_TABLES, active: t.mathTables },
    settingsOpen: t.mathSettingsOpen,
    lines: t.mathLines.map((line, index) => (
      <MathLine key={index} line={line} />
    )),
    preview: t.mathLines.map((line, index) => {
      const gaps = t.mathGap ? mathGapRow(line, t.mathGaps[index]) : null;
      return gaps ?? { kind: "plain", content: <MathLine line={line} /> };
    }),
    edit: {
      index: t.mathEditIndex,
      draft: t.mathDraft,
      result: draftResult,
      invalid: t.mathDraft.trim() !== "" && t.mathDraftResult === null,
    },
    ...(inputRef ? { inputRef } : {}),
    onToggleOperator: t.toggleMathOperation,
    onMin: t.setMathMin,
    onMax: t.setMathMax,
    onCount: t.setMathCount,
    onAllowNegative: t.setMathAllowNegative,
    onExcludeZeroOperand: t.setMathExcludeZeroOperand,
    onExcludeZeroResult: t.setMathExcludeZeroResult,
    onGap: t.setMathGap,
    onToggleTable: t.toggleMathTable,
    onToggleSettings: () => t.setMathSettingsOpen(!t.mathSettingsOpen),
    onGenerate: t.generateMathTasks,
    onEdit: t.startEditMathRow,
    onReroll: t.rerollMathLine,
    onDelete: t.deleteMathLine,
    onAppend: t.startAppendMathLine,
    onDraft: t.setMathDraft,
    onCommit: t.commitMathEdit,
    onCancel: t.cancelMathEdit,
    onInsert: t.insertAtMathCursor,
    onChooseGap: t.setMathLineGap,
  };
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
  // Ein geschlossener Raum hat keine Lobby und keine Einstellungen mehr.
  if (t.roomClosed) locked.push("import", "settings", "lobby");
  return locked;
}

function nextLabel(t: TeacherLiveModel) {
  if (t.busy) {
    if (t.stage === "settings") return "Öffnet …";
    if (t.stage === "lobby") return "Startet …";
    if (t.stage === "live") return "Beendet …";
  }
  if (t.roomClosed) return "Neuen Raum öffnen";
  if (t.stage === "content") return "Weiter zu Modus";
  if (t.stage === "settings") return "Raum öffnen";
  if (t.stage === "lobby") return "Sitzung starten";
  return "Sitzung beenden";
}
