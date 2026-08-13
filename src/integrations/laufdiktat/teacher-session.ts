import {
  buildVocabularyItems,
  parseRunningDictationText,
  parseVocabularyTable,
  type VocabularyDirection,
} from "../../domain/running-dictation";
import type { LiveWord } from "./live-session";
import {
  generateMentalMathTasks,
  parseMentalMathTask,
  type MentalMathOperation,
} from "../../domain/mental-math";

export type TeacherContentMode = "text" | "vocabulary" | "math";
export type TeacherGameMode = "UEBUNG" | "TEST" | "BATTLE" | "STATION";
export type TeacherBattleOptions = { ink: boolean; flicker: boolean };

export type TeacherSessionOptions = {
  contentMode: TeacherContentMode;
  source: string;
  vocabularyDirection: VocabularyDirection;
  gameMode: TeacherGameMode;
  shuffleWords: boolean;
  repeatWrongAnswers: boolean;
  isTtsEnabled?: boolean;
  uebungMaxAttempts?: number;
  uebungAssistanceEnabled?: boolean;
  showStars?: boolean;
  strictTypingMode?: boolean;
  stationCount?: number;
  stationShuffle?: boolean;
  battleOptions?: TeacherBattleOptions;
};

export type TeacherRoomConfig = {
  words: LiveWord[];
  gameMode: "UEBUNG" | "TEST" | "BATTLE";
  battleOptions: TeacherBattleOptions;
  stationMode: boolean;
  stationCount: number;
  isTtsEnabled: boolean;
  uebungMaxAttempts: number;
  uebungAssistanceEnabled: boolean;
  repeatWrongAnswers: boolean;
  showStars: boolean;
  shuffleWords: boolean;
  strictTypingMode: boolean;
  stationShuffle: boolean;
  appVersion: "lernraum-0.1.0";
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
    ).map((item) => ({
      id: item.id,
      kind: "vocabulary",
      prompt: item.prompt,
      targetWord: item.target,
      acceptedAnswers: item.acceptedAnswers,
      promptLang: item.promptLocale,
      answerLang: item.answerLocale,
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
    words: buildTeacherWords(
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
      options.gameMode === "TEST" ? 1 : (options.uebungMaxAttempts ?? 3),
    uebungAssistanceEnabled:
      options.gameMode === "UEBUNG" &&
      (options.uebungAssistanceEnabled ?? true),
    repeatWrongAnswers:
      options.gameMode === "UEBUNG" &&
      (options.uebungAssistanceEnabled ?? true) &&
      options.repeatWrongAnswers,
    showStars: options.gameMode !== "STATION" && (options.showStars ?? true),
    shuffleWords: options.gameMode !== "STATION" && options.shuffleWords,
    strictTypingMode:
      options.gameMode !== "STATION" && (options.strictTypingMode ?? false),
    stationShuffle:
      options.gameMode === "STATION" && (options.stationShuffle ?? true),
    appVersion: "lernraum-0.1.0",
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
      task.gap ? `${task.prompt} => ${task.answer}` : task.source,
    )
    .join("\n");
}
