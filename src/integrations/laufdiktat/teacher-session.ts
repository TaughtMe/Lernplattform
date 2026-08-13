import {
  buildVocabularyItems,
  parseRunningDictationText,
  parseVocabularyTable,
  type VocabularyDirection,
} from "../../domain/running-dictation";
import type { LiveWord } from "./live-session";

export type TeacherContentMode = "text" | "vocabulary" | "math";
export type TeacherGameMode = "UEBUNG" | "TEST";

export type TeacherSessionOptions = {
  contentMode: TeacherContentMode;
  source: string;
  vocabularyDirection: VocabularyDirection;
  gameMode: TeacherGameMode;
  shuffleWords: boolean;
  repeatWrongAnswers: boolean;
};

export type TeacherRoomConfig = {
  words: LiveWord[];
  gameMode: TeacherGameMode;
  stationMode: false;
  stationCount: 1;
  isTtsEnabled: false;
  uebungMaxAttempts: number;
  uebungAssistanceEnabled: boolean;
  repeatWrongAnswers: boolean;
  showStars: true;
  shuffleWords: boolean;
  strictTypingMode: false;
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
    gameMode: options.gameMode,
    stationMode: false,
    stationCount: 1,
    isTtsEnabled: false,
    uebungMaxAttempts: options.gameMode === "TEST" ? 1 : 3,
    uebungAssistanceEnabled: options.gameMode === "UEBUNG",
    repeatWrongAnswers: options.repeatWrongAnswers,
    showStars: true,
    shuffleWords: options.shuffleWords,
    strictTypingMode: false,
    appVersion: "lernraum-0.1.0",
  };
}
