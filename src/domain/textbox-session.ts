import * as z from "zod";
import { LEARNING_WORD_COLLECTIONS } from "./german-learning-content";
import { deterministicOrder } from "./running-dictation";
import {
  alignWords,
  comparePunctuation,
  compareGaps,
  scoreWords,
  tokenizeText,
  type RoundScore,
  type WordResult,
} from "./text-compare";
import {
  PHENOMENON_TO_COLLECTION,
  textboxDifficultySchema,
  type TextboxDifficulty,
  type TextboxText,
} from "./textbox-text";

/** Anteil der ausgeblendeten Wörter je Durchgang (kalibrierbar, Plan 1.3). */
export const TEXTBOX_BLANK_RATIOS = [0.2, 0.4, 0.7, 1] as const;

/** Merkzeit in Sekunden je Schwierigkeit (kalibrierbar, Plan 1.2). */
const MEMORIZE_SECONDS: Record<TextboxDifficulty, number> = {
  leicht: 60,
  mittel: 90,
  schwer: 120,
};

/** Wörter ab dieser Länge gelten als Inhaltswörter (Plan 1.3). */
const MIN_CONTENT_WORD_LENGTH = 4;
/** Obergrenze für frei geschriebene Wörter, schützt Speicher und Rechenzeit. */
const MAX_FREE_WORDS = 1000;

export type TextboxRound = 1 | 2 | 3 | 4;
export type TextboxPhase = "memorize" | "write" | "review" | "complete";

/**
 * Ein Versuch an einem Durchgang. Jeder Versuch ist vollwertig und hat seinen
 * eigenen Prozentwert; „Durchgang wiederholen“ legt einen weiteren an, es geht
 * keiner verloren. Die Lehrkraft sieht im Verlauf die Entwicklung aller
 * Versuche (Steigerung, Verschlechterung, auffällige Sprünge). Das Ergebnis des
 * Durchgangs ist der jeweils letzte Versuch.
 */
export type TextboxAttempt = {
  words: WordResult[];
  score: RoundScore;
  memorizeMs: number;
  writingMs: number;
  /** Zeitpunkt der Abgabe; ältere Einheiten kennen ihn nicht. */
  at?: string | undefined;
};

/** Ein späterer Versuch (ab dem zweiten) im Feld `retries`. */
export type TextboxRetry = TextboxAttempt;

/**
 * Höchstzahl gespeicherter Versuche je Durchgang. Großzügig, damit auch ein
 * Kind, das einen Text sehr oft wiederholt, vollständig im Verlauf steht;
 * zugleich eine Grenze für Speicher und Sicherung.
 */
export const MAX_TEXTBOX_ATTEMPTS = 100;

/**
 * Höchstzahl der späteren Versuche (`retries`). Der erste Versuch bleibt als
 * Ausgangswert immer erhalten; sind es mehr als 100, fallen von den späteren
 * die ältesten zuerst weg. Die 0.9.4-Daten (höchstens 5) liegen weit darunter.
 */
export const MAX_TEXTBOX_RETRIES = MAX_TEXTBOX_ATTEMPTS - 1;

/**
 * Ergebnis eines Durchgangs. Die Felder `words`, `score`, `memorizeMs`,
 * `writingMs`, `at` sind der ERSTE Versuch (so speichert es seit 0.9.4); alle
 * weiteren stehen in `retries`. Gelesen wird immer über `roundAttempts` und
 * `latestAttempt`.
 */
export type TextboxRoundResult = {
  round: TextboxRound;
  /** Wortindizes, die in diesem Durchgang ausgeblendet waren (aufsteigend). */
  blanked: number[];
  /** Erster Versuch (siehe oben). */
  words: WordResult[];
  score: RoundScore;
  memorizeMs: number;
  writingMs: number;
  at?: string | undefined;
  /** Weitere Versuche desselben Durchgangs in zeitlicher Reihenfolge. */
  retries?: TextboxRetry[] | undefined;
};

export type TextboxRunState = {
  trainingId: string;
  textId: string;
  seed: string;
  /** Aus dem Wortspeicher geübte Wörter, die zusätzlich ausgeblendet werden. */
  extraTargets?: string[];
  round: TextboxRound;
  phase: TextboxPhase;
  /** Merkzeit des laufenden Durchgangs, solange noch nicht abgegeben. */
  memorizeMs?: number;
  /**
   * Der laufende Durchgang ist eine Wiederholung („Durchgang wiederholen“):
   * Sein Ergebnis wird als weiterer Versuch an den Durchgang gehängt.
   */
  retry?: boolean;
  rounds: TextboxRoundResult[];
};

export type TextboxSession = {
  id: string; // trainingId
  textId: string;
  difficulty: TextboxDifficulty;
  status: "laufend" | "abgeschlossen";
  seed: string;
  extraTargets?: string[] | undefined;
  startedAt: string;
  completedAt?: string | undefined;
  updatedAt: string;
  rounds: TextboxRoundResult[];
  finalPercent?: number | undefined;
};

const count = z.number().int().nonnegative();
const instant = z.iso.datetime({ offset: true });
const roundSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);

export const wordResultSchema: z.ZodType<WordResult> = z
  .object({
    kind: z.enum(["richtig", "falsch", "gross-klein", "fehlt", "zusaetzlich"]),
    expected: z.string().max(200).optional(),
    actual: z.string().max(200).optional(),
    expectedIndex: count.optional(),
    nearMiss: z.boolean(),
  })
  .strict();

export const roundScoreSchema: z.ZodType<RoundScore> = z
  .object({
    percent: z.number().int().min(0).max(100),
    correct: count,
    total: count,
    extra: count,
    byKind: z
      .object({
        richtig: count,
        falsch: count,
        "gross-klein": count,
        fehlt: count,
        zusaetzlich: count,
      })
      .strict(),
    punctuationHints: count,
  })
  .strict();

export const textboxRetrySchema: z.ZodType<TextboxRetry> = z
  .object({
    words: z.array(wordResultSchema).max(3000),
    score: roundScoreSchema,
    memorizeMs: z.number().nonnegative(),
    writingMs: z.number().nonnegative(),
    at: instant.optional(),
  })
  .strict();

export const textboxRoundResultSchema: z.ZodType<TextboxRoundResult> = z
  .object({
    round: roundSchema,
    blanked: z.array(count).max(2000),
    words: z.array(wordResultSchema).max(3000),
    score: roundScoreSchema,
    memorizeMs: z.number().nonnegative(),
    writingMs: z.number().nonnegative(),
    at: instant.optional(),
    // Ältere Einheiten kennen weder weitere Versuche noch Zeitpunkte (tolerant
    // gelesen); 0.9.4 speicherte höchstens 5 weitere Versuche.
    retries: z.array(textboxRetrySchema).max(MAX_TEXTBOX_RETRIES).optional(),
  })
  .strict();

export const textboxSessionSchema: z.ZodType<TextboxSession> = z
  .object({
    id: z.string().min(1).max(200),
    textId: z.string().regex(/^TXT-\d{3}$/),
    difficulty: textboxDifficultySchema,
    status: z.enum(["laufend", "abgeschlossen"]),
    seed: z.string().min(1).max(200),
    extraTargets: z.array(z.string().min(1).max(100)).max(50).optional(),
    startedAt: instant,
    completedAt: instant.optional(),
    updatedAt: instant,
    rounds: z.array(textboxRoundResultSchema).max(4),
    finalPercent: z.number().int().min(0).max(100).optional(),
  })
  .strict()
  .superRefine((session, context) => {
    const done = session.status === "abgeschlossen";
    if (done && (!session.completedAt || session.finalPercent === undefined)) {
      context.addIssue({
        code: "custom",
        message:
          "Eine abgeschlossene Einheit braucht Abschlusszeit und Endergebnis.",
      });
    }
    if (!done && (session.completedAt || session.finalPercent !== undefined)) {
      context.addIssue({
        code: "custom",
        message: "Eine laufende Einheit hat noch kein Endergebnis.",
      });
    }
  });

/** Alle Versuche eines Durchgangs in zeitlicher Reihenfolge (erster zuerst). */
export function roundAttempts(round: TextboxRoundResult): TextboxAttempt[] {
  const { words, score, memorizeMs, writingMs, at } = round;
  return [
    { words, score, memorizeMs, writingMs, at },
    ...(round.retries ?? []),
  ];
}

/** Der letzte Versuch eines Durchgangs: Er bestimmt das Ergebnis. */
export function latestAttempt(round: TextboxRoundResult): TextboxAttempt {
  return round.retries?.at(-1) ?? roundAttempts(round)[0]!;
}

/** Prozentwerte als Reihe, z. B. „25 % → 27 % → 100 %“. */
export function formatPercentSeries(percents: readonly number[]): string {
  return percents.map((percent) => `${percent} %`).join(" → ");
}

export function memorizeSeconds(difficulty: TextboxDifficulty): number {
  return MEMORIZE_SECONDS[difficulty];
}

function normalizeKey(word: string) {
  return word.normalize("NFC").toLocaleLowerCase("de");
}

function letterCount(word: string) {
  return Array.from(word.replace(/[^\p{L}]/gu, "")).length;
}

function seededSubset<T>(items: T[], seed: string): T[] {
  return deterministicOrder(items.length, seed).map((index) => items[index]!);
}

/**
 * Wortindizes je Durchgang. Die Mengen sind ineinander geschachtelt.
 * Reihenfolge der Auswahl: Zielwörter (und Wörter aus dem Wortspeicher),
 * dann weitere Wörter zum Schwerpunkt, dann längere Inhaltswörter, dann der
 * Rest. Innerhalb jeder Gruppe entscheidet der Seed.
 */
export function buildBlankingPlan(
  text: TextboxText,
  seed: string,
  extraTargets: string[] = [],
): [Set<number>, Set<number>, Set<number>, Set<number>] {
  const words = tokenizeText(text.text)
    .filter((token) => token.kind === "word")
    .map((token) => token.text);
  const total = words.length;
  const exactTargets = new Set(text.targetWords.map((w) => w.normalize("NFC")));
  const extras = new Set(extraTargets.map(normalizeKey));
  const focusWords = new Set<string>();
  for (const phenomenon of text.phenomena) {
    const collectionId = PHENOMENON_TO_COLLECTION[phenomenon];
    const collection = LEARNING_WORD_COLLECTIONS.find(
      (entry) => entry.id === collectionId,
    );
    for (const word of collection?.words ?? []) {
      focusWords.add(normalizeKey(word));
    }
  }

  const groups: number[][] = [[], [], [], []];
  words.forEach((word, index) => {
    const nfc = word.normalize("NFC");
    if (exactTargets.has(nfc) || extras.has(normalizeKey(nfc))) {
      groups[0]!.push(index);
    } else if (focusWords.has(normalizeKey(nfc))) {
      groups[1]!.push(index);
    } else if (letterCount(nfc) >= MIN_CONTENT_WORD_LENGTH) {
      groups[2]!.push(index);
    } else {
      groups[3]!.push(index);
    }
  });
  const priority = groups.flatMap((group, position) =>
    seededSubset(group, `${seed}:${position}`),
  );

  let previous = 0;
  const sets = TEXTBOX_BLANK_RATIOS.map((ratio, position) => {
    // Alle Zielwörter fallen schon in Durchgang 1 weg, auch über 20 % hinaus.
    const minimum = position === 0 ? groups[0]!.length : previous;
    const size = Math.min(
      total,
      Math.max(minimum, previous, Math.ceil(total * ratio)),
    );
    previous = size;
    return new Set(priority.slice(0, size));
  });
  return sets as [Set<number>, Set<number>, Set<number>, Set<number>];
}

export function startRun(
  text: TextboxText,
  trainingId: string,
  extraTargets?: string[],
): TextboxRunState {
  const state: TextboxRunState = {
    trainingId,
    textId: text.id,
    seed: trainingId,
    round: 1,
    phase: "memorize",
    rounds: [],
  };
  if (extraTargets && extraTargets.length > 0) {
    state.extraTargets = [...extraTargets];
  }
  return state;
}

function requirePhase(state: TextboxRunState, phase: TextboxPhase) {
  if (state.phase !== phase) {
    throw new Error(
      `Ungültiger Übergang: erwartet Phase „${phase}“, aktuell „${state.phase}“.`,
    );
  }
}

export function finishMemorize(
  state: TextboxRunState,
  memorizeMs: number,
): TextboxRunState {
  requirePhase(state, "memorize");
  return {
    ...state,
    phase: "write",
    memorizeMs: Math.max(0, memorizeMs),
  };
}

export function submitRound(
  state: TextboxRunState,
  text: TextboxText,
  input: string[] | string,
  writingMs: number,
  at?: string,
): TextboxRunState {
  requirePhase(state, "write");
  if (text.id !== state.textId) {
    throw new Error("Der Text passt nicht zur laufenden Einheit.");
  }
  const tokens = tokenizeText(text.text);
  const words = tokens.filter((token) => token.kind === "word");
  const plan = buildBlankingPlan(text, state.seed, state.extraTargets);
  const blanked = [...plan[state.round - 1]!].sort((a, b) => a - b);

  let results: WordResult[];
  let score: RoundScore;
  if (state.round === 4) {
    if (typeof input !== "string") {
      throw new Error("Durchgang 4 erwartet einen frei geschriebenen Text.");
    }
    const typed = tokenizeText(input);
    const typedWords = typed
      .filter((token) => token.kind === "word")
      .map((token) => token.text)
      .slice(0, MAX_FREE_WORDS);
    results = alignWords(
      words.map((token) => token.text),
      typedWords,
    );
    score = scoreWords(
      results,
      words.length,
      comparePunctuation(tokens, typed),
    );
  } else {
    if (typeof input === "string") {
      throw new Error("Durchgang 1 bis 3 erwarten eine Eingabe je Lücke.");
    }
    if (input.length !== blanked.length) {
      throw new Error(
        `Erwartet ${blanked.length} Eingaben, erhalten ${input.length}.`,
      );
    }
    results = compareGaps(
      blanked.map((index) => words[index]!.text),
      input,
    ).map((result, position) => ({
      ...result,
      expectedIndex: blanked[position]!,
    }));
    score = scoreWords(results, blanked.length);
  }

  const attempt: TextboxAttempt = {
    words: results,
    score,
    memorizeMs: state.memorizeMs ?? 0,
    writingMs: Math.max(0, writingMs),
  };
  if (at !== undefined) attempt.at = at;
  let rounds: TextboxRoundResult[];
  if (state.retry) {
    // Wiederholung: Der Durchgang behält alle bisherigen Versuche, der neue
    // kommt ans Ende und bestimmt nun das Ergebnis.
    const first = state.rounds[state.rounds.length - 1];
    if (first === undefined || first.round !== state.round) {
      throw new Error("Der erste Versuch dieses Durchgangs fehlt.");
    }
    rounds = [
      ...state.rounds.slice(0, -1),
      {
        ...first,
        retries: appendRetry(first.retries ?? [], attempt),
      },
    ];
  } else {
    rounds = [...state.rounds, { round: state.round, blanked, ...attempt }];
  }
  const next: TextboxRunState = { ...state, phase: "review", rounds };
  delete next.memorizeMs;
  return next;
}

/**
 * Hängt einen Versuch an. Prozentwert, Zähler und Zeitpunkt bleiben für jeden
 * Versuch erhalten; die Wortliste behält nur der jüngste (nur er bestimmt
 * Fehlerwörter), damit viele Wiederholungen den Speicher nicht füllen.
 */
function appendRetry(
  retries: TextboxRetry[],
  attempt: TextboxAttempt,
): TextboxRetry[] {
  return [
    ...retries.map((retry) =>
      retry.words.length > 0 ? { ...retry, words: [] } : retry,
    ),
    attempt,
  ].slice(-MAX_TEXTBOX_RETRIES);
}

export function nextRound(state: TextboxRunState): TextboxRunState {
  requirePhase(state, "review");
  const next: TextboxRunState =
    state.round === 4
      ? { ...state, phase: "complete" }
      : {
          ...state,
          round: (state.round + 1) as TextboxRound,
          phase: "memorize",
        };
  delete next.retry;
  return next;
}

/**
 * Beginnt den Durchgang noch einmal (gleiche Lücken), beliebig oft. Alle
 * bisherigen Versuche bleiben erhalten; der neue wird beim Abgeben als
 * weiterer Versuch angehängt (`retries`) und ist dann das Ergebnis.
 */
export function repeatRound(state: TextboxRunState): TextboxRunState {
  requirePhase(state, "review");
  const last = state.rounds[state.rounds.length - 1];
  if (last === undefined || last.round !== state.round) {
    throw new Error("Das Ergebnis des laufenden Durchgangs fehlt.");
  }
  const next: TextboxRunState = { ...state, phase: "memorize", retry: true };
  delete next.memorizeMs;
  return next;
}

/** Hauptwert der Einheit: das Ergebnis des letzten Versuchs in Durchgang 4. */
export function finalPercent(state: TextboxRunState): number | undefined {
  const last = state.rounds.find((round) => round.round === 4);
  return last ? latestAttempt(last).score.percent : undefined;
}

/** Zustand einer Einheit für die Speicherung (laufend oder abgeschlossen). */
export function sessionFromRun(
  state: TextboxRunState,
  text: TextboxText,
  times: { startedAt: string; now: string },
): TextboxSession {
  if (state.rounds.length === 0) {
    throw new Error(
      "Eine Einheit wird erst nach dem ersten Durchgang gespeichert.",
    );
  }
  const percent = state.phase === "complete" ? finalPercent(state) : undefined;
  const session: TextboxSession = {
    id: state.trainingId,
    textId: state.textId,
    difficulty: text.difficulty,
    status: percent === undefined ? "laufend" : "abgeschlossen",
    seed: state.seed,
    startedAt: times.startedAt,
    updatedAt: times.now,
    rounds: state.rounds,
  };
  if (state.extraTargets) session.extraTargets = state.extraTargets;
  if (percent !== undefined) {
    session.completedAt = times.now;
    session.finalPercent = percent;
  }
  return session;
}

/** Setzt eine gespeicherte Einheit an der Merkphase des nächsten Durchgangs fort. */
export function runFromSession(session: TextboxSession): TextboxRunState {
  const done = session.rounds.length;
  const state: TextboxRunState = {
    trainingId: session.id,
    textId: session.textId,
    seed: session.seed,
    round: Math.min(4, done + 1) as TextboxRound,
    phase:
      done < 4
        ? "memorize"
        : session.status === "abgeschlossen"
          ? "complete"
          : "review",
    rounds: session.rounds,
  };
  if (session.extraTargets) state.extraTargets = session.extraTargets;
  return state;
}
