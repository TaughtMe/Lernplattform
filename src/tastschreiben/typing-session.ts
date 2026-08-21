import type { Keystroke } from "./typing-stats.ts";

export interface TypedChar {
  char: string;
  correct: boolean;
}

export interface TypingSessionState {
  target: string;
  position: number;
  /** Ergebnis pro Position, `null` = noch nicht getippt. */
  typed: Array<TypedChar | null>;
  keystrokeLog: Keystroke[];
  corrections: number;
  startedAt: number | null;
  finishedAt: number | null;
}

export function initSession(target: string): TypingSessionState {
  return {
    target,
    position: 0,
    typed: new Array(target.length).fill(null),
    keystrokeLog: [],
    corrections: 0,
    startedAt: null,
    finishedAt: null,
  };
}

export function isFinished(state: TypingSessionState): boolean {
  return state.finishedAt !== null;
}

export function currentExpectedChar(state: TypingSessionState): string | undefined {
  return state.target[state.position];
}

/**
 * Ein falsches Zeichen rückt trotzdem vor (rot markiert, Position bleibt
 * nicht stecken) — Anfänger sehen den Fehler sofort, Fortgeschrittene werden
 * beim Tippen nicht ausgebremst. Korrigieren geht per Rücktaste (backspace()).
 */
export function typeChar(state: TypingSessionState, char: string, now: number): TypingSessionState {
  if (isFinished(state) || state.position >= state.target.length) return state;
  const startedAt = state.startedAt ?? now;
  const expected = state.target[state.position];
  const correct = char === expected;

  const typed = state.typed.slice();
  typed[state.position] = { char, correct };
  const keystrokeLog = [...state.keystrokeLog, { expected, typed: char, correct, timestamp: now }];
  const position = state.position + 1;
  const finishedAt = position >= state.target.length ? now : null;

  return { ...state, startedAt, position, typed, keystrokeLog, finishedAt };
}

export function backspace(state: TypingSessionState): TypingSessionState {
  if (isFinished(state) || state.position === 0) return state;
  const position = state.position - 1;
  const typed = state.typed.slice();
  typed[position] = null;
  return { ...state, position, typed, corrections: state.corrections + 1 };
}
