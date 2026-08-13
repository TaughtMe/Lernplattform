import {
  buildVocabularyItems,
  parseRunningDictationText,
  parseVocabularyTable,
  type VocabularyDirection,
} from "../../domain/running-dictation";
import type { LiveWord } from "./live-session";

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

const NUMBER_PATTERN = "-?\\d+(?:[.,]\\d+)?";
const MATH_LINE = new RegExp(
  `^(${NUMBER_PATTERN})\\s*([+\\-−*×·/:÷])\\s*(${NUMBER_PATTERN})(?:\\s*=\\s*(${NUMBER_PATTERN}))?$`,
);

function parseNumber(value: string) {
  return Number.parseFloat(value.replace(",", "."));
}

function round(value: number) {
  return Math.round(value * 1e9) / 1e9;
}

function parseMathLine(line: string, index: number): LiveWord | null {
  const match = line.trim().match(MATH_LINE);
  if (!match) return null;
  const leftRaw = match[1];
  const operatorRaw = match[2];
  const rightRaw = match[3];
  if (!leftRaw || !operatorRaw || !rightRaw) return null;

  const left = parseNumber(leftRaw);
  const right = parseNumber(rightRaw);
  const operator =
    operatorRaw === "−"
      ? "-"
      : operatorRaw === "×" || operatorRaw === "·"
        ? "*"
        : operatorRaw === ":" || operatorRaw === "÷"
          ? "/"
          : operatorRaw;
  const result =
    operator === "+"
      ? left + right
      : operator === "-"
        ? left - right
        : operator === "*"
          ? left * right
          : right !== 0
            ? left / right
            : Number.NaN;
  if (!Number.isFinite(result)) return null;

  const expected = match[4] ? parseNumber(match[4]) : result;
  if (!Number.isFinite(expected) || Math.abs(expected - result) > 1e-9) {
    return null;
  }

  const promptOperator =
    operator === "*" ? "·" : operator === "/" ? ":" : operator;
  return {
    id: `math-${index}-${leftRaw}-${operator}-${rightRaw}`,
    kind: "math",
    prompt: `${leftRaw} ${promptOperator} ${rightRaw}`,
    targetWord: String(round(result)),
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
}) {
  const operations = options.operations.length ? options.operations : ["+"];
  const min = Math.min(options.min, options.max);
  const max = Math.max(options.min, options.max);
  const random = (from: number, to: number) =>
    from + Math.floor(Math.random() * (to - from + 1));
  const lines: string[] = [];
  for (let index = 0; index < Math.max(1, options.count); index += 1) {
    const operation = operations[index % operations.length] ?? "+";
    if (operation === "*") {
      const left = random(Math.max(1, min), Math.min(10, Math.max(1, max)));
      const right = random(1, 10);
      lines.push(`${left} · ${right}`);
      continue;
    }
    if (operation === "/") {
      const divisor = random(1, Math.min(10, Math.max(1, max)));
      const result = random(1, 10);
      lines.push(`${divisor * result} : ${divisor}`);
      continue;
    }
    const left = random(min, max);
    const right =
      operation === "-" ? random(min, Math.max(min, left)) : random(min, max);
    lines.push(`${left} ${operation} ${right}`);
  }
  return lines.join("\n");
}
