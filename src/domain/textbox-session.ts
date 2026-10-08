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

export type TextboxRoundResult = {
  round: TextboxRound;
  /** Wortindizes, die in diesem Durchgang ausgeblendet waren (aufsteigend). */
  blanked: number[];
  words: WordResult[];
  score: RoundScore;
  memorizeMs: number;
  writingMs: number;
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

export const textboxRoundResultSchema: z.ZodType<TextboxRoundResult> = z
  .object({
    round: roundSchema,
    blanked: z.array(count).max(2000),
    words: z.array(wordResultSchema).max(3000),
    score: roundScoreSchema,
    memorizeMs: z.number().nonnegative(),
    writingMs: z.number().nonnegative(),
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

  const round: TextboxRoundResult = {
    round: state.round,
    blanked,
    words: results,
    score,
    memorizeMs: state.memorizeMs ?? 0,
    writingMs: Math.max(0, writingMs),
  };
  const next: TextboxRunState = {
    ...state,
    phase: "review",
    rounds: [...state.rounds, round],
  };
  delete next.memorizeMs;
  return next;
}

export function nextRound(state: TextboxRunState): TextboxRunState {
  requirePhase(state, "review");
  if (state.round === 4) return { ...state, phase: "complete" };
  return {
    ...state,
    round: (state.round + 1) as TextboxRound,
    phase: "memorize",
  };
}

/** Hauptwert der Einheit: das Ergebnis aus Durchgang 4. */
export function finalPercent(state: TextboxRunState): number | undefined {
  return state.rounds.find((round) => round.round === 4)?.score.percent;
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
