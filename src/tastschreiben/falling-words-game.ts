import { TYPING_LESSONS, availableKeysThrough } from "./curriculum";

export interface FallingWord {
  id: number;
  word: string;
  typed: number;
  lane: number;
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
  missed: number;
  elapsedMs: number;
  finished: boolean;
}

export const FALLING_WORDS_DURATION_MS = 60_000;
export const FALLING_WORDS_LANES = 5;

export function createFallingWordsGame(): FallingWordsState {
  return {
    words: [],
    nextId: 1,
    activeWordId: null,
    score: 0,
    streak: 0,
    bestStreak: 0,
    missed: 0,
    elapsedMs: 0,
    finished: false,
  };
}

export function fallingWordDuration(elapsedMs: number) {
  const progress = Math.min(1, elapsedMs / FALLING_WORDS_DURATION_MS);
  return Math.round(7_200 - 2_800 * progress);
}

function nextFreeLane(words: readonly FallingWord[]) {
  const used = new Set(words.map((word) => word.lane));
  for (let lane = 0; lane < FALLING_WORDS_LANES; lane += 1) {
    if (!used.has(lane)) return lane;
  }
  return null;
}

export function spawnFallingWord(
  state: FallingWordsState,
  word: string,
): FallingWordsState {
  if (state.finished || word.length === 0) return state;
  const lane = nextFreeLane(state.words);
  if (lane === null) return state;
  return {
    ...state,
    nextId: state.nextId + 1,
    words: [
      ...state.words,
      {
        id: state.nextId,
        word,
        typed: 0,
        lane,
        progress: 0,
        fallMs: fallingWordDuration(state.elapsedMs),
      },
    ],
  };
}

export function advanceFallingWords(
  state: FallingWordsState,
  deltaMs: number,
): FallingWordsState {
  if (state.finished) return state;
  const elapsedMs = Math.min(
    FALLING_WORDS_DURATION_MS,
    state.elapsedMs + deltaMs,
  );
  const words: FallingWord[] = [];
  let missed = state.missed;
  let streak = state.streak;
  let activeWordId = state.activeWordId;

  for (const word of state.words) {
    const progress = word.progress + deltaMs / word.fallMs;
    if (progress >= 1) {
      missed += 1;
      streak = 0;
      if (activeWordId === word.id) activeWordId = null;
    } else {
      words.push({ ...word, progress });
    }
  }

  return {
    ...state,
    words,
    missed,
    streak,
    activeWordId,
    elapsedMs,
    finished: elapsedMs >= FALLING_WORDS_DURATION_MS,
  };
}

export function typeFallingWordCharacter(
  state: FallingWordsState,
  char: string,
): FallingWordsState {
  if (state.finished) return state;
  let active =
    state.activeWordId === null
      ? undefined
      : state.words.find((word) => word.id === state.activeWordId);

  if (!active) {
    active = state.words
      .filter((word) => word.typed === 0 && word.word[0] === char)
      .sort((left, right) => right.progress - left.progress)[0];
    if (!active) return state;
  } else if (active.word[active.typed] !== char) {
    return state;
  }

  const typed = active.typed + 1;
  if (typed >= active.word.length) {
    const streak = state.streak + 1;
    return {
      ...state,
      words: state.words.filter((word) => word.id !== active!.id),
      activeWordId: null,
      streak,
      bestStreak: Math.max(state.bestStreak, streak),
      score: state.score + active.word.length + Math.floor(streak / 5),
    };
  }

  return {
    ...state,
    activeWordId: active.id,
    words: state.words.map((word) =>
      word.id === active!.id ? { ...word, typed } : word,
    ),
  };
}

const completeWords = [
  "ramo",
  "tasten",
  "lernen",
  "garten",
  "wolke",
  "licht",
  "schule",
  "finger",
  "ruhig",
  "genau",
];

function seededRandom(seed: string) {
  let state = 0;
  for (const char of seed) state = (state * 31 + char.charCodeAt(0)) >>> 0;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 4_294_967_296;
  };
}

export function createFallingWordPool(
  completedLessonIds: ReadonlySet<string>,
  seed: string,
) {
  if (completedLessonIds.has("alle-tasten-wiederholung")) {
    return completeWords;
  }

  let lastCompleted = TYPING_LESSONS[0]!.id;
  for (const lesson of TYPING_LESSONS) {
    if (completedLessonIds.has(lesson.id)) lastCompleted = lesson.id;
  }
  const keys = availableKeysThrough(lastCompleted).filter((key) =>
    /\p{L}/u.test(key),
  );
  const usableKeys = keys.length > 0 ? keys : ["f", "j"];
  const random = seededRandom(seed);

  return Array.from({ length: 24 }, () => {
    const length = 2 + Math.floor(random() * 3);
    return Array.from(
      { length },
      () => usableKeys[Math.floor(random() * usableKeys.length)]!,
    ).join("");
  });
}
