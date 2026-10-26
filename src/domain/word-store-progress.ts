import * as z from "zod";
import { LEARNING_WORD_STAGES, type LearningWordStage } from "./learning-word";
import {
  isLearningArchiveWord,
  type LearningWordProgress,
} from "./learning-word-progress";
import { localDayKey } from "./local-day";
import { wordKey } from "./word-box";

const instant = z.iso.datetime({ offset: true });
const count = z.number().int().nonnegative();
const stageSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
]);

/** Ein Wort in einer abgeschlossenen Runde (Wörter auf 60 Zeichen begrenzt). */
export const wordRoundWordSchema = z
  .object({
    word: z.string().min(1).max(60),
    firstTry: z.boolean(),
    attempts: count.max(1000),
    usedHelp: z.boolean(),
    firstResult: z.enum([
      "richtig",
      "falsch",
      "gross-klein",
      "fehlt",
      "zusaetzlich",
    ]),
  })
  .strict();

export const wordRoundSchema = z
  .object({
    id: z.string().min(1).max(200),
    boxId: z.string().min(1).max(100),
    /** Titel zum Zeitpunkt der Runde, für gelöschte Wortboxen. */
    boxTitle: z.string().min(1).max(60),
    stage: stageSchema,
    blockSize: z
      .union([z.literal(1), z.literal(2), z.literal(3), z.literal(5)])
      .optional(),
    startedAt: instant,
    completedAt: instant,
    words: z.array(wordRoundWordSchema).min(1).max(500),
    percent: z.number().int().min(0).max(100),
  })
  .strict();

export type WordRoundRecord = z.infer<typeof wordRoundSchema>;

/** Wortbox „Meine Fehlerwörter“ (`?quelle=fehler`): Runden zeigen keinen Prozentwert (W-12). */
export const FEHLER_BOX_ID = "fehler";

/** Für diese Wortboxen steht „n Wörter geübt“ statt eines Prozentwerts. */
export function showsPracticedWordsOnly(boxId: string): boolean {
  return boxId === FEHLER_BOX_ID;
}

export type WordBoxStageSummary = {
  stage: LearningWordStage;
  rounds: number;
  bestPercent?: number;
  lastPercent?: number;
  /** Anzahl Wörter der letzten Runde dieser Stufe. */
  lastWords?: number;
  lastPracticedAt?: string;
};

function byCompletion(left: WordRoundRecord, right: WordRoundRecord) {
  return (
    left.completedAt.localeCompare(right.completedAt) ||
    left.id.localeCompare(right.id)
  );
}

/** Bestwert, letzter Wert und Anzahl werden immer aus den Runden abgeleitet. */
export function summarizeWordBox(
  boxId: string,
  rounds: readonly WordRoundRecord[],
): Record<LearningWordStage, WordBoxStageSummary> {
  const summary = Object.fromEntries(
    LEARNING_WORD_STAGES.map((stage) => [stage, { stage, rounds: 0 }]),
  ) as Record<LearningWordStage, WordBoxStageSummary>;
  for (const round of rounds
    .filter((entry) => entry.boxId === boxId)
    .sort(byCompletion)) {
    const entry = summary[round.stage];
    entry.rounds += 1;
    entry.bestPercent = Math.max(entry.bestPercent ?? 0, round.percent);
    entry.lastPercent = round.percent;
    entry.lastWords = round.words.length;
    entry.lastPracticedAt = round.completedAt;
  }
  return summary;
}

/** Zeile der Kachel: Stufe und Ergebnis der zuletzt abgeschlossenen Runde (W-10). */
export function headlineForBox(
  summary: Record<LearningWordStage, WordBoxStageSummary>,
):
  | { stage: LearningWordStage; lastPercent: number; practicedWords: number }
  | undefined {
  let latest: WordBoxStageSummary | undefined;
  for (const stage of LEARNING_WORD_STAGES) {
    const entry = summary[stage];
    if (
      entry.rounds > 0 &&
      (latest === undefined ||
        (entry.lastPracticedAt ?? "") >= (latest.lastPracticedAt ?? ""))
    ) {
      latest = entry;
    }
  }
  if (latest?.lastPercent === undefined || latest.lastWords === undefined) {
    return undefined;
  }
  return {
    stage: latest.stage,
    lastPercent: latest.lastPercent,
    practicedWords: latest.lastWords,
  };
}

export type BoxCoverage = {
  /** Wörter der Wortbox, deren letzte Abfrage auf dieser Stufe auf Anhieb richtig war. */
  mastered: number;
  /** Wörter der Wortbox (ohne Doppelte nach `wordKey`). */
  total: number;
  /** Ganze Prozent, gerundet wie das Rundenergebnis; 100 nur, wenn wirklich alle Wörter zählen. 0 bei leerer Wortbox. */
  percent: number;
};

/**
 * Box-Fortschritt (W-10): Anteil der Wörter, die aktuell in der Wortbox stehen
 * und deren jüngste Abfrage auf dieser Stufe in dieser Wortbox auf Anhieb
 * richtig war. Anders als das Rundenergebnis zählt er die ganze Wortbox: Eine
 * Runde mit 10 von 100 Wörtern, alle richtig, ergibt 10 %. Gelöschte Wörter
 * zählen nicht, neue Wörter ohne Abfrage senken den Anteil. Nichts davon wird
 * gespeichert, alles folgt aus den Runden.
 */
export function boxCoverage(
  boxWords: readonly string[],
  rounds: readonly WordRoundRecord[],
  boxId: string,
  stage: LearningWordStage,
): BoxCoverage {
  const latest = new Map<string, boolean>();
  for (const round of rounds
    .filter((entry) => entry.boxId === boxId && entry.stage === stage)
    .sort(byCompletion)) {
    for (const entry of round.words) {
      latest.set(wordKey(entry.word), entry.firstTry);
    }
  }
  const keys = new Set(boxWords.map(wordKey));
  let mastered = 0;
  for (const key of keys) if (latest.get(key) === true) mastered += 1;
  return {
    mastered,
    total: keys.size,
    percent:
      keys.size === 0
        ? 0
        : mastered === keys.size
          ? 100
          : Math.min(99, Math.round((mastered / keys.size) * 100)),
  };
}

/** „n Wörter geübt“ bzw. „1 Wort geübt“ (W-12). */
export function practicedWordsLabel(count: number): string {
  return count === 1 ? "1 Wort geübt" : `${count} Wörter geübt`;
}

/**
 * Übungsmenge eines lokalen Tages (W-13): Summe der Wörter aller Runden, die an
 * diesem Tag abgeschlossen wurden. `now` ist injizierbar.
 */
export function wordsPracticedOnDay(
  rounds: readonly WordRoundRecord[],
  now: string | number | Date,
): number {
  const day = localDayKey(now);
  return rounds
    .filter((round) => localDayKey(round.completedAt) === day)
    .reduce((sum, round) => sum + round.words.length, 0);
}

/**
 * Empfohlene Merkstufe: die Stufe, auf der die meisten Wörter der Wortbox mit
 * Lernstand stehen (bei Gleichstand die leichtere).
 */
export function recommendedStage(
  words: readonly string[],
  progress: readonly LearningWordProgress[],
): LearningWordStage | undefined {
  const keys = new Set(words.map(wordKey));
  const tally = new Map<LearningWordStage, number>();
  for (const entry of progress) {
    if (!keys.has(wordKey(entry.word))) continue;
    tally.set(entry.stage, (tally.get(entry.stage) ?? 0) + 1);
  }
  let best: LearningWordStage | undefined;
  for (const stage of LEARNING_WORD_STAGES) {
    const amount = tally.get(stage) ?? 0;
    if (amount > 0 && (best === undefined || amount > (tally.get(best) ?? 0))) {
      best = stage;
    }
  }
  return best;
}

export const MOST_ERRORS_LIMIT = 5;

export type WordStoreSummary = {
  trainedWords: number;
  secureWords: number;
  /** Wörter im Lernarchiv (Box 6, A-6); sie zählen auch als sicher. */
  archivedWords: number;
  repetitions: number;
  rounds: number;
  byStage: Record<LearningWordStage, number>;
  mostErrors: { word: string; incorrectAttempts: number }[];
};

export function summarizeWordStore(
  progress: readonly LearningWordProgress[],
  rounds: readonly WordRoundRecord[],
): WordStoreSummary {
  const byStage = Object.fromEntries(
    LEARNING_WORD_STAGES.map((stage) => [stage, 0]),
  ) as Record<LearningWordStage, number>;
  for (const entry of progress) byStage[entry.stage] += 1;
  return {
    trainedWords: progress.length,
    // „Sicher“ heißt: mindestens Box 3, also mehrfach verdeckt richtig.
    secureWords: progress.filter((entry) => entry.box >= 3).length,
    archivedWords: progress.filter(isLearningArchiveWord).length,
    repetitions: progress.reduce((sum, entry) => sum + entry.attempts, 0),
    rounds: rounds.length,
    byStage,
    mostErrors: progress
      .filter((entry) => entry.incorrectAttempts > 0)
      .map((entry) => ({
        word: entry.word,
        incorrectAttempts: entry.incorrectAttempts,
      }))
      .sort(
        (left, right) =>
          right.incorrectAttempts - left.incorrectAttempts ||
          left.word.localeCompare(right.word, "de"),
      )
      .slice(0, MOST_ERRORS_LIMIT),
  };
}
