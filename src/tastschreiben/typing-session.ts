import type { TypingKeystroke } from "./typing-stats";

export interface TypedCharacter {
  char: string;
  correct: boolean;
  /** Im Fehler-Stopp: erst nach einem Fehlanschlag richtig getippt. */
  corrected?: boolean;
}

export interface TypingSessionState {
  target: string;
  position: number;
  /** Fehlanschläge an der aktuellen Stelle (nur im Fehler-Stopp). */
  missesHere: number;
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
    missesHere: 0,
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

/**
 * Nimmt einen Anschlag an. Im Fehler-Stopp (`strict`, Standard der
 * Tastenwelt) bleibt die Stelle bei einem Fehlanschlag stehen; der Fehler
 * zählt trotzdem, und das Zeichen gilt danach als korrigiert.
 */
export function enterTypingCharacter(
  state: TypingSessionState,
  char: string,
  now: number,
  { strict = false }: { strict?: boolean } = {},
): TypingSessionState {
  if (state.finishedAt !== null || state.position >= state.target.length)
    return state;
  const expected = state.target[state.position]!;
  const correct = char === expected;
  const keystroke = { expected, typed: char, correct, timestamp: now };
  if (strict && !correct) {
    return {
      ...state,
      missesHere: state.missesHere + 1,
      startedAt: state.startedAt ?? now,
      keystrokes: [...state.keystrokes, keystroke],
    };
  }
  const typed = [...state.typed];
  typed[state.position] = {
    char,
    correct,
    ...(strict && state.missesHere > 0 ? { corrected: true } : {}),
  };
  const position = state.position + 1;
  return {
    ...state,
    position,
    missesHere: 0,
    typed,
    startedAt: state.startedAt ?? now,
    finishedAt: position >= state.target.length ? now : null,
    keystrokes: [...state.keystrokes, keystroke],
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
    missesHere: 0,
    typed,
    corrections: state.corrections + 1,
  };
}
