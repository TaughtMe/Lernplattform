import type { MathOptions } from "../../domain/math-practice";
import {
  buildVocabularyItems,
  parseRunningDictationText,
  parseVocabularyTable,
  type VocabularyDirection,
  type VocabularyLocales,
} from "../../domain/running-dictation";
import type { LiveWord, VocabularyTransferChoice } from "./live-session";
import {
  generateMentalMathTasks,
  normalizeMathChainInput,
  parseMentalMathTask,
  type MentalMathOperation,
} from "../../domain/mental-math";
import { LIVE_APP_VERSION } from "../../app-version";

export type TeacherContentMode = "text" | "vocabulary" | "math";
export type TeacherGameMode = "LAUFDIKTAT" | "UEBUNG" | "BATTLE" | "STATION";
export type TeacherBattleOptions = { ink: boolean; flicker: boolean };

export type TeacherSessionOptions = {
  contentMode: TeacherContentMode;
  source: string;
  vocabularyDirection: VocabularyDirection;
  gameMode: TeacherGameMode;
  shuffleWords: boolean;
  repeatWrongAnswers: boolean;
  vocabularyTransfer?: VocabularyTransferChoice;
  /** Standard-Tag der Lehrkraft für übernommene Vokabeln. */
  vocabularyTag?: string;
  /** Abdruck des Klassenstempels, wenn die Runde für eine Klasse startet. */
  classSeal?: string;
  isTtsEnabled?: boolean;
  uebungMaxAttempts?: number;
  uebungAssistanceEnabled?: boolean;
  showStars?: boolean;
  strictTypingMode?: boolean;
  showTaskAfterErrors?: boolean;
  stationCount?: number;
  stationShuffle?: boolean;
  battleOptions?: TeacherBattleOptions;
  wordsOverride?: LiveWord[];
  mathPracticeOptions?: MathOptions;
};

export type TeacherRoomConfig = {
  mathPracticeOptions?: MathOptions;
  words: LiveWord[];
  gameMode: "LAUFDIKTAT" | "UEBUNG" | "BATTLE";
  battleOptions: TeacherBattleOptions;
  stationMode: boolean;
  stationCount: number;
  isTtsEnabled: boolean;
  uebungMaxAttempts: number;
  uebungAssistanceEnabled: boolean;
  repeatWrongAnswers: boolean;
  vocabularyTransfer: VocabularyTransferChoice;
  vocabularyTag?: string;
  classSeal?: string;
  showStars: boolean;
  shuffleWords: boolean;
  strictTypingMode: boolean;
  showTaskAfterErrors: boolean;
  stationShuffle: boolean;
  appVersion: typeof LIVE_APP_VERSION;
};

function parseMathLine(line: string, index: number): LiveWord | null {
  const gapParts = line.split(/\s*=>\s*/);
  if (gapParts.length === 2 && gapParts[0]?.includes("_")) {
    const answer = Number(gapParts[1]?.replace(",", "."));
    if (!Number.isFinite(answer)) return null;
    return {
      id: `math-gap-${index}`,
      kind: "math",
      prompt: gapParts[0],
      targetWord: String(answer),
    };
  }
  const task = parseMentalMathTask(line, index);
  if (!task) return null;
  return {
    id: task.id,
    kind: "math",
    prompt: task.prompt,
    targetWord: String(task.answer),
    isLatex: task.operation === "mixed-expression",
  };
}

export function buildTeacherWords(
  mode: TeacherContentMode,
  source: string,
  vocabularyDirection: VocabularyDirection,
  vocabularyCaseSensitive = false,
  vocabularyLocales?: VocabularyLocales,
): LiveWord[] {
  if (mode === "text") {
    return parseRunningDictationText(source).map((item) => ({
      id: item.id,
      kind: "text",
      targetWord: item.target,
    }));
  }
  if (mode === "vocabulary") {
    return buildVocabularyItems(
      parseVocabularyTable(source),
      vocabularyDirection,
      vocabularyCaseSensitive,
      vocabularyLocales,
    ).map((item) => ({
      id: item.id,
      kind: "vocabulary",
      prompt: item.prompt,
      targetWord: item.target,
      acceptedAnswers: item.acceptedAnswers,
      promptLang: item.promptLocale,
      answerLang: item.answerLocale,
      caseSensitive: item.caseSensitive,
      ...(item.tag ? { tag: item.tag } : {}),
    }));
  }
  return source
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line, index) => parseMathLine(line, index))
    .filter((word): word is LiveWord => word !== null);
}

export function buildTeacherRoomConfig(
  options: TeacherSessionOptions,
): TeacherRoomConfig {
  return {
    ...(options.mathPracticeOptions
      ? { mathPracticeOptions: options.mathPracticeOptions }
      : {}),
    words:
      options.wordsOverride ??
      buildTeacherWords(
        options.contentMode,
        options.source,
        options.vocabularyDirection,
      ),
    gameMode: options.gameMode === "STATION" ? "UEBUNG" : options.gameMode,
    battleOptions: options.battleOptions ?? { ink: true, flicker: true },
    stationMode: options.gameMode === "STATION",
    stationCount: options.stationCount ?? 20,
    isTtsEnabled: options.isTtsEnabled ?? false,
    uebungMaxAttempts:
      options.gameMode === "LAUFDIKTAT" ? 1 : (options.uebungMaxAttempts ?? 3),
    uebungAssistanceEnabled:
      options.gameMode === "UEBUNG" &&
      (options.uebungAssistanceEnabled ?? true),
    repeatWrongAnswers:
      options.gameMode === "UEBUNG" &&
      (options.uebungAssistanceEnabled ?? true) &&
      options.repeatWrongAnswers,
    vocabularyTransfer:
      options.contentMode === "vocabulary"
        ? (options.vocabularyTransfer ?? "errors")
        : "none",
    ...(options.contentMode === "vocabulary" && options.vocabularyTag?.trim()
      ? { vocabularyTag: options.vocabularyTag.trim() }
      : {}),
    ...(options.classSeal ? { classSeal: options.classSeal } : {}),
    showStars: options.gameMode !== "STATION" && (options.showStars ?? true),
    shuffleWords: options.gameMode !== "STATION" && options.shuffleWords,
    strictTypingMode:
      options.gameMode !== "STATION" && (options.strictTypingMode ?? false),
    showTaskAfterErrors:
      options.contentMode === "math" &&
      options.gameMode !== "STATION" &&
      (options.showTaskAfterErrors ?? true),
    stationShuffle:
      options.gameMode === "STATION" && (options.stationShuffle ?? true),
    appVersion: LIVE_APP_VERSION,
  };
}

export type MathOperation = "+" | "-" | "*" | "/";

export function generateMentalMathSource(options: {
  count: number;
  min: number;
  max: number;
  operations: MathOperation[];
  allowNegativeResults?: boolean;
  excludeZeroOperand?: boolean;
  excludeZeroResult?: boolean;
  multiplicationTables?: number[];
  gapMode?: boolean;
}) {
  const operationMap: Record<MathOperation, MentalMathOperation> = {
    "+": "add",
    "-": "subtract",
    "*": "multiply",
    "/": "divide",
  };
  return generateMentalMathTasks({
    count: options.count,
    minValue: options.min,
    maxValue: options.max,
    operations: options.operations.map((operation) => operationMap[operation]),
    ...(options.allowNegativeResults === undefined
      ? {}
      : { allowNegativeResults: options.allowNegativeResults }),
    ...(options.excludeZeroOperand === undefined
      ? {}
      : { excludeZeroOperand: options.excludeZeroOperand }),
    ...(options.excludeZeroResult === undefined
      ? {}
      : { excludeZeroResult: options.excludeZeroResult }),
    ...(options.multiplicationTables === undefined
      ? {}
      : { multiplicationTables: options.multiplicationTables }),
    ...(options.gapMode === undefined ? {} : { gapMode: options.gapMode }),
  })
    .map((task) =>
      task.gap
        ? `${task.prompt} => ${task.answer}`
        : // Einheitliche Schreibweise, negative Zahlen in Klammern: „-1 − (-4)“.
          (normalizeMathChainInput(task.source) ?? task.source),
    )
    .join("\n");
}
