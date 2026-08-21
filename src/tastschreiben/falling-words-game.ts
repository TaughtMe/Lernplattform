import { LESSONS, lessonIndex, availableKeysThrough } from "./curriculum.ts";
import { generateWordPool, generateWords } from "./text-generator.ts";

export interface FallingWord {
  id: number;
  word: string;
  /** Wie viele Zeichen von vorne schon richtig getippt sind. */
  typed: number;
  lane: number;
  /** 0 (oben) bis 1 (unten, verpasst). */
  progress: number;
  fallMs: number;
}

export interface FallingWordsState {
  words: FallingWord[];
  nextId: number;
  activeWordId: number | null;
  score: number;
  streak: number;
  bestStreak: number;
  lives: number;
  elapsedMs: number;
  gameOver: boolean;
}

export const LANES = 5;
export const STARTING_LIVES = 3;

export function initGame(): FallingWordsState {
  return { words: [], nextId: 1, activeWordId: null, score: 0, streak: 0, bestStreak: 0, lives: STARTING_LIVES, elapsedMs: 0, gameOver: false };
}

const MIN_FALL_MS = 3500;
const MAX_FALL_MS = 7000;
const RAMP_MS = 90000;

/** Wörter fallen mit der Zeit etwas schneller, nie unter ein Minimum — nach 90s volle Geschwindigkeit. */
export function fallDurationMs(elapsedMs: number): number {
  const t = Math.min(1, elapsedMs / RAMP_MS);
  return Math.round(MAX_FALL_MS - (MAX_FALL_MS - MIN_FALL_MS) * t);
}

function freeLane(words: FallingWord[]): number | null {
  const used = new Set(words.map((w) => w.lane));
  for (let lane = 0; lane < LANES; lane++) if (!used.has(lane)) return lane;
  return null;
}

/** Fügt ein neues fallendes Wort hinzu, falls gerade eine Spur frei ist (sonst bleibt der Zustand unverändert). */
export function spawnWord(state: FallingWordsState, word: string): FallingWordsState {
  if (state.gameOver || !word) return state;
  const lane = freeLane(state.words);
  if (lane === null) return state;
  const newWord: FallingWord = { id: state.nextId, word, typed: 0, lane, progress: 0, fallMs: fallDurationMs(state.elapsedMs) };
  return { ...state, words: [...state.words, newWord], nextId: state.nextId + 1 };
}

/** Rückt die Uhr vor: Positionen aktualisieren, am Boden angekommene Wörter kosten ein Leben. */
export function tick(state: FallingWordsState, deltaMs: number): FallingWordsState {
  if (state.gameOver) return state;
  const elapsedMs = state.elapsedMs + deltaMs;
  let lives = state.lives;
  let streak = state.streak;
  let activeWordId = state.activeWordId;
  const words: FallingWord[] = [];
  for (const w of state.words) {
    const progress = w.progress + deltaMs / w.fallMs;
    if (progress >= 1) {
      lives -= 1;
      streak = 0;
      if (activeWordId === w.id) activeWordId = null;
      continue;
    }
    words.push({ ...w, progress });
  }
  return { ...state, words, elapsedMs, lives, streak, activeWordId, gameOver: lives <= 0 };
}

/**
 * Ein getipptes Zeichen: bestätigt das gerade aktive Wort, oder wählt bei
 * keinem aktiven Wort dasjenige mit passendem ersten Buchstaben, das am
 * weitesten unten steht (am dringendsten). Ein falscher Buchstabe für das
 * aktive Wort wird ignoriert, statt das Wort zu verwerfen — wie in
 * klassischen Tippspielen bleibt der Fortschritt am Wort erhalten.
 */
export function typeChar(state: FallingWordsState, char: string): FallingWordsState {
  if (state.gameOver) return state;

  let active = state.activeWordId !== null ? state.words.find((w) => w.id === state.activeWordId) : undefined;
  if (!active) {
    const candidates = state.words.filter((w) => w.typed === 0 && w.word[0] === char).sort((a, b) => b.progress - a.progress);
    active = candidates[0];
    if (!active) return state;
  } else if (active.word[active.typed] !== char) {
    return state;
  }

  const typed = active.typed + 1;
  if (typed >= active.word.length) {
    const streak = state.streak + 1;
    const bonus = 1 + Math.floor(streak / 5) * 0.5;
    const score = state.score + Math.round(active.word.length * bonus);
    const words = state.words.filter((w) => w.id !== active!.id);
    return { ...state, words, score, streak, bestStreak: Math.max(state.bestStreak, streak), activeWordId: null };
  }

  const words = state.words.map((w) => (w.id === active!.id ? { ...w, typed } : w));
  return { ...state, words, activeWordId: active.id };
}

const ALL_TASTEN_LESSON = "alle-tasten-wiederholung";

/**
 * Welche Wörter fallen, richtet sich nach dem Lernstand: Solange noch nicht
 * alle Tasten geübt wurden, fallen kurze, synthetische Buchstabengruppen aus
 * genau den schon bekannten Tasten (Anfänger können sofort mitspielen, ohne
 * Tasten zu sehen, die sie noch nicht kennen); danach fallen echte Wörter.
 */
export function pickSpawnPool(completedLessonIds: ReadonlySet<string>, seed: string): string[] {
  let furthestIdx = -1;
  for (let i = 0; i < LESSONS.length; i++) {
    if (completedLessonIds.has(LESSONS[i].id)) furthestIdx = i;
  }
  const allTastenIdx = lessonIndex(ALL_TASTEN_LESSON);

  if (furthestIdx >= allTastenIdx) {
    return generateWords(24, seed, "easy").split(" ");
  }
  const referenceLessonId = furthestIdx >= 0 ? LESSONS[furthestIdx].id : LESSONS[0].id;
  const keys = availableKeysThrough(referenceLessonId);
  return generateWordPool(keys, 24, seed);
}
