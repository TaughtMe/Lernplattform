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
  nextErrorBase,
  splitConfigFor,
  splitConfigWith,
  splitModeOf,
  splitOptionsOf,
  strugglingNames,
  type ErrorBase,
  STAGE_OF_STEP,
  STEP_OF_STAGE,
} from "./dictation-adapter";
import { ALL_MODES } from "./lib/modes";
import {
  useTeacherLiveRoom,
  type TeacherLiveModel,
} from "./use-teacher-live-room";
import styles from "./teacher-live-room.module.css";

/** Die echten Modi des Laufdiktats als Auswahlkarten (Schritt 2). */
const EDITOR_MODES = ALL_MODES.map(({ id, title, text }) => ({
  id,
  title,
  text,
}));

/**
 * Laufdiktat für Lehrkräfte: verbindet den Live-Raum-Kern mit der Ansicht
 * (Inhalt und Modus nach Lehrerbereich v2, 14b/14c/16a/16b; Lobby und Live
 * nach 5c/5d). Vokabeln und Mathe haben eigene Editoren (Vokabelheft,
 * Aufgaben-Generator). Funktionen ohne Entwurf (eigene Trenner, Marker-Modus,
 * Teilnehmende entfernen) sind vorerst nicht sichtbar; sie kommen mit eigenem
 * Entwurf zurück.
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
  // Fehlerstand je Schüler beim Wechsel der Aufgabe: daraus folgt, wer gerade hängt.
  const [errorBase, setErrorBase] = useState<ErrorBase>({});
  const currentBase = nextErrorBase(errorBase, t.students);
  if (currentBase !== errorBase) setErrorBase(currentBase);

  const options: Record<DictationOption, boolean> = {
    tts: t.tts,
    shuffle: stationMode ? t.stationShuffle : t.shuffleWords,
    strict: t.strictTyping,
    taskHelp: t.taskHelp,
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
    if (option === "taskHelp") t.setTaskHelp(!t.taskHelp);
    if (option === "stars") t.setShowStars(!t.showStars);
    if (option === "ink") t.setBattleInk(!t.battleInk);
    if (option === "flicker") t.setBattleFlicker(!t.battleFlicker);
  }

  const joinUrl =
    t.room && t.hydrated
      ? `${window.location.origin}/raum?code=${t.room.code}`
      : "";

  const roomTimes = roomTimesView(t.roomTimeline, t.roomTimeState);

  const next = nextLabel(t);
  const className = t.liveClasses.find(({ id }) => id === t.classChoice)?.name;

  return (
    <div className={styles.page} data-hydrated={t.hydrated ? "true" : "false"}>
      <TeacherDictationScreen
        {...(className ? { className: classLabel(className) } : {})}
        roomCode={t.room?.code ?? ""}
        joinHost={t.hydrated ? window.location.host : ""}
        theme={theme}
        step={STEP_OF_STAGE[t.stage]}
        content={{
          kind: t.contentMode,
          text: t.sources[t.contentMode],
          split: splitModeOf(t.splitConfig),
          splitOptions: splitOptionsOf(t.splitConfig),
          sections: sectionsOf(t),
        }}
        mode={t.gameMode}
        modes={EDITOR_MODES}
        {...(t.wordStoreVisible
          ? {
              wordStore: {
                value: t.wordStoreTransfer,
                onChange: t.setWordStoreTransfer,
              },
            }
          : {})}
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
            struggling: strugglingNames(currentBase, t.students),
          }),
        )}
        {...(roomTimes ? { roomTimes } : {})}
        title={t.title}
        stored={t.contentId !== null}
        onTitle={t.setTitle}
        onSavePrepared={() => void t.prepareContent()}
        onCreateClass={(name) => t.createClassNamed(name)}
        {...(t.contentId ? { onDelete: () => void t.deleteContent() } : {})}
        {...(t.libraryNotice ? { libraryNotice: t.libraryNotice } : {})}
        {...(next ? { nextLabel: next } : {})}
        nextDisabled={t.footerDisabled}
        lockedSteps={lockedSteps(t)}
        {...(t.error || t.connectionWarning
          ? { notice: t.error || t.connectionWarning }
          : {})}
        vocabulary={vocabularyProps(t)}
        vocabularyPicker={t.vocabularyPicker}
        quizFromLibrary={t.quizFromLibrary}
        math={mathProps(t, refs.mathEditInputRef)}
        onToggleTheme={toggleTheme}
        onLeave={() => window.location.assign("/lehrer")}
        onStep={(step: TeacherStep) => t.jumpToStage(STAGE_OF_STEP[step])}
        onNext={t.goForward}
        onPrevious={t.goBack}
        onText={(text) =>
          t.setSources((current) => ({ ...current, [t.contentMode]: text }))
        }
        onSplit={(split) =>
          t.setSplitConfig((current) => splitConfigFor(split, current))
        }
        onSplitOptions={(patch) =>
          t.setSplitConfig((current) => splitConfigWith(current, patch))
        }
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

/** Formeln (Brüche, Wurzeln, Potenzen) in den Fehlerlisten setzen. */
function withMathMistakes(live: LiveOverview) {
  const withDisplay = <Entry extends { word: string }>(entry: Entry) =>
    /[\\^]/.test(entry.word)
      ? { ...entry, display: <MathDisplay text={entry.word} isLatex /> }
      : entry;
  return {
    ...live,
    mistakes: live.mistakes.map(withDisplay),
    students: live.students.map((student) =>
      student.wordErrors
        ? { ...student, wordErrors: student.wordErrors.map(withDisplay) }
        : student,
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
    onPickFromLibrary: t.onPickFromLibrary,
    pickFromLibraryDisabled: t.pickFromLibraryDisabled,
    onTableInput: t.setVocabularyTableInput,
    onImportTable: t.importVocabularyTable,
    commaSeparates: t.vocabularyCommaSeparates,
    onCommaSeparates: t.setVocabularyCommaSeparates,
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
  // Inhalt und Modus beschriftet die Ansicht selbst („Raum jetzt öffnen“,
  // auf dem Handy „Raum öffnen“).
  if (t.stage === "content" || t.stage === "settings") return undefined;
  if (t.stage === "lobby") return "Sitzung starten";
  return "Sitzung beenden";
}

/** „7b“ statt „Klasse 7b“, damit die Zeile über dem Titel nicht doppelt. */
function classLabel(name: string) {
  return name.replace(/^klasse\s+/i, "");
}
