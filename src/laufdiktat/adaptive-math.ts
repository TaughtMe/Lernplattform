import { generateMathLines, parseMathLine, type GenOptions } from "./math-tasks.ts";
import type { WordItem } from "./types.ts";

export interface AdaptiveMathState {
  /** Index into LEVELS — how hard the next task should be. */
  level: number;
  correctStreak: number;
  wrongStreak: number;
}

/** After this many answers in a row correct/wrong, the level moves. */
const LEVEL_UP_STREAK = 3;
const LEVEL_DOWN_STREAK = 2;

/**
 * Difficulty ladder for self-directed practice, easiest first. Each level
 * widens the number range and/or unlocks a new operation. Kept student-
 * friendly: no negative numbers, times-tables build up gradually.
 */
export const LEVELS: GenOptions[] = [
  { ops: ["+"], minValue: 0, maxValue: 10, count: 1, allowNegativeResults: false, excludeZeroOperand: false, excludeZeroResult: false, multiplicationTables: [] },
  { ops: ["+", "-"], minValue: 0, maxValue: 10, count: 1, allowNegativeResults: false, excludeZeroOperand: true, excludeZeroResult: false, multiplicationTables: [] },
  { ops: ["+", "-"], minValue: 0, maxValue: 20, count: 1, allowNegativeResults: false, excludeZeroOperand: true, excludeZeroResult: false, multiplicationTables: [] },
  { ops: ["+", "-", "*"], minValue: 0, maxValue: 20, count: 1, allowNegativeResults: false, excludeZeroOperand: true, excludeZeroResult: false, multiplicationTables: [1, 2, 5, 10] },
  { ops: ["+", "-", "*", "/"], minValue: 0, maxValue: 20, count: 1, allowNegativeResults: false, excludeZeroOperand: true, excludeZeroResult: false, multiplicationTables: [1, 2, 5, 10] },
  { ops: ["+", "-", "*", "/"], minValue: 0, maxValue: 50, count: 1, allowNegativeResults: false, excludeZeroOperand: true, excludeZeroResult: false, multiplicationTables: [] },
  { ops: ["+", "-", "*", "/"], minValue: 0, maxValue: 100, count: 1, allowNegativeResults: false, excludeZeroOperand: true, excludeZeroResult: false, multiplicationTables: [] },
];

export const MAX_LEVEL = LEVELS.length - 1;

export function initialAdaptiveState(startLevel = 0): AdaptiveMathState {
  return { level: Math.min(Math.max(startLevel, 0), MAX_LEVEL), correctStreak: 0, wrongStreak: 0 };
}

/**
 * Pure state transition: N correct answers in a row raise the difficulty one
 * step, M wrong answers in a row lower it one step — otherwise just the
 * streak counters change. Level never leaves [0, MAX_LEVEL].
 */
export function nextAdaptiveState(state: AdaptiveMathState, wasCorrect: boolean): AdaptiveMathState {
  if (wasCorrect) {
    const correctStreak = state.correctStreak + 1;
    if (correctStreak >= LEVEL_UP_STREAK) {
      return { level: Math.min(state.level + 1, MAX_LEVEL), correctStreak: 0, wrongStreak: 0 };
    }
    return { ...state, correctStreak, wrongStreak: 0 };
  }
  const wrongStreak = state.wrongStreak + 1;
  if (wrongStreak >= LEVEL_DOWN_STREAK) {
    return { level: Math.max(state.level - 1, 0), correctStreak: 0, wrongStreak: 0 };
  }
  return { ...state, wrongStreak, correctStreak: 0 };
}

/** Generates one task at the state's current difficulty level. */
export function generateAdaptiveTask(state: AdaptiveMathState): WordItem {
  const opts = LEVELS[Math.min(Math.max(state.level, 0), MAX_LEVEL)];
  const [line] = generateMathLines({ ...opts, count: 1 });
  const word = parseMathLine(line);
  // generateMathLines always returns a parseable line (falls back to a safe
  // one internally), so this should never happen — but keep a hard failure
  // loud rather than silently handing back an unusable task.
  if (!word) throw new Error("generateAdaptiveTask: generated an unparsable line");
  return word;
}
