import type { VocabularyDirection } from "../../../../src/domain/running-dictation";
import type {
  VocabularyTransferChoice,
  WordStoreTransferChoice,
} from "../../../../src/integrations/laufdiktat/live-session";
import {
  buildMathPracticeOptions,
  buildTeacherRoomConfig,
  type TeacherContentMode,
} from "../../../../src/integrations/laufdiktat/teacher-session";
import type { GameSettings } from "../hooks/use-game-settings";

type LiveRoomConfigInput = {
  contentMode: TeacherContentMode;
  source: string;
  direction: VocabularyDirection;
  vocabularyTransfer: VocabularyTransferChoice;
  wordStoreTransfer: WordStoreTransferChoice;
  vocabularyTag: string;
  /** Abdruck des Klassenstempels; ohne Klasse leer. */
  classSeal: string | undefined;
  settings: GameSettings;
  words: NonNullable<
    Parameters<typeof buildTeacherRoomConfig>[0]["wordsOverride"]
  >;
};

/** Spieloptionen und Inhalt der Lehrkraft → Einstellungen des Raums. */
export function buildLiveRoomConfig({
  contentMode,
  source,
  direction,
  vocabularyTransfer,
  wordStoreTransfer,
  vocabularyTag,
  classSeal,
  settings,
  words,
}: LiveRoomConfigInput) {
  return buildTeacherRoomConfig({
    contentMode,
    source,
    vocabularyDirection: direction,
    vocabularyTransfer,
    wordStoreTransfer,
    vocabularyTag,
    ...(classSeal ? { classSeal } : {}),
    gameMode: settings.gameMode,
    shuffleWords: settings.shuffleWords,
    repeatWrongAnswers: settings.repeatWrongAnswers,
    isTtsEnabled: settings.tts,
    uebungMaxAttempts: settings.attempts,
    uebungAssistanceEnabled: settings.assistance,
    showStars: settings.showStars,
    showTempoPoints: settings.showTempoPoints,
    strictTypingMode: settings.strictTyping,
    showTaskAfterErrors: settings.taskHelp,
    stationCount: settings.stationCount,
    stationShuffle: settings.stationShuffle,
    battleOptions: { ink: settings.battleInk, flicker: settings.battleFlicker },
    wordsOverride: words,
    ...(contentMode === "math"
      ? {
          mathPracticeOptions: buildMathPracticeOptions({
            min: settings.mathMin,
            max: settings.mathMax,
            operations: settings.mathOps,
            allowNegativeResults: settings.mathAllowNegative,
            excludeZeroOperand: settings.mathExcludeZeroOperand,
            excludeZeroResult: settings.mathExcludeZeroResult,
            tables: settings.mathTables,
            gap: settings.mathGap,
          }),
        }
      : {}),
  });
}
