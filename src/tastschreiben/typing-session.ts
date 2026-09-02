import type { TypingKeystroke } from "./typing-stats";

export interface TypedCharacter {
  char: string;
  correct: boolean;
}

export interface TypingSessionState {
  target: string;
  position: number;
  typed: Array<TypedCharacter | null>;
  keystrokes: TypingKeystroke[];
  corrections: number;
  startedAt: number | null;
  finishedAt: number | null;
}

export function createTypingSession(target: string): TypingSessionState {
  return {
    target,
    position: 0,
    typed: new Array(target.length).fill(null),
    keystrokes: [],
    corrections: 0,
    startedAt: null,
    finishedAt: null,
  };
}

export function expectedTypingCharacter(state: TypingSessionState) {
  return state.target[state.position];
}

export function enterTypingCharacter(
  state: TypingSessionState,
  char: string,
  now: number,
): TypingSessionState {
  if (state.finishedAt !== null || state.position >= state.target.length)
    return state;
  const expected = state.target[state.position]!;
  const typed = [...state.typed];
  typed[state.position] = { char, correct: char === expected };
  const position = state.position + 1;
  return {
    ...state,
    position,
    typed,
    startedAt: state.startedAt ?? now,
    finishedAt: position >= state.target.length ? now : null,
    keystrokes: [
      ...state.keystrokes,
      { expected, typed: char, correct: char === expected, timestamp: now },
    ],
  };
}

export function correctTypingCharacter(
  state: TypingSessionState,
): TypingSessionState {
  if (state.finishedAt !== null || state.position === 0) return state;
  const typed = [...state.typed];
  typed[state.position - 1] = null;
  return {
    ...state,
    position: state.position - 1,
    typed,
    corrections: state.corrections + 1,
  };
}
