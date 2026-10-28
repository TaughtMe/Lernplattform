import * as z from "zod";
import type { LearningWordBlockSize, LearningWordStage } from "./learning-word";
import type { WordBoxView } from "./word-box";
import type { WordRoundState } from "./word-round";

/**
 * Zwischenstand einer Wortspeicher-Runde (Befund C-001): der ganze
 * Zustandsautomat der Runde samt Wortbox, Einstellung und Startzeit. Die
 * Antworten selbst liegen längst in der Datenbank; nach dem Fortsetzen zählt
 * die Nummerierung der Versuche (`blockAttempts`) weiter, so wird keine
 * Antwort doppelt gewertet und der erste Versuch bleibt der erste.
 */
const wordKind = z.enum([
  "richtig",
  "falsch",
  "gross-klein",
  "fehlt",
  "zusaetzlich",
]);
const text = z.string().max(500);
const stage = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
]);

const wordResult = z.object({
  kind: wordKind,
  expected: text.optional(),
  actual: text.optional(),
  expectedIndex: z.number().int().min(0).max(1000).optional(),
  nearMiss: z.boolean(),
});

const feedback = z.object({
  correct: z.boolean(),
  input: z.string().max(2000),
  words: z
    .array(z.object({ word: text, correct: z.boolean(), result: wordResult }))
    .max(20),
  extra: z.array(text).max(50),
});

const roundWordResult = z.object({
  word: text,
  firstTry: z.boolean(),
  attempts: z.number().int().min(1).max(1000),
  usedHelp: z.boolean(),
  firstResult: wordKind,
});

const wordList = z.array(text).max(20);

const roundState = z.object({
  roundId: z.string().min(1).max(80),
  boxId: z.string().min(1).max(80),
  stage,
  blockSize: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(5)]),
  blocks: z.array(wordList.min(1)).min(1).max(500),
  index: z.number().int().min(0).max(500),
  phase: z.enum(["memorize", "recall", "feedback"]),
  usedHelp: z.boolean(),
  incorrectAttempts: z.number().int().min(0).max(10_000),
  results: z.array(roundWordResult).max(500),
  lastFeedback: feedback.optional(),
  blockAttempts: z.number().int().min(0).max(10_000),
  firstKinds: z.record(z.string(), wordKind),
  failedWords: wordList,
  settledWords: wordList,
  helpedWords: wordList,
  settledAt: z.record(z.string(), z.number().int().min(1).max(10_000)),
});

const view = z.object({
  id: z.string().min(1).max(80),
  kind: z.enum(["fest", "eigen", "unterricht", "faellig", "textbox"]),
  title: z.string().min(1).max(60),
  words: z.array(text.min(1)).min(1).max(500),
  editable: z.boolean(),
});

export const wordRoundSnapshotSchema = z
  .object({
    state: roundState,
    view,
    config: z.object({
      stage,
      roundSize: z.union([
        z.literal(5),
        z.literal(10),
        z.literal(20),
        z.literal("all"),
      ]),
      blockSize: z.union([
        z.literal(1),
        z.literal(2),
        z.literal(3),
        z.literal(5),
      ]),
    }),
    startedAt: z.iso.datetime({ offset: true }),
    /** Freie Runde mit den Fehlerwörtern der vorigen Runde. */
    retry: z.literal(true).optional(),
  })
  .refine(
    ({ state }) =>
      state.index < state.blocks.length &&
      // Eine Rückmeldung gehört zur Phase „feedback“ und nur zu ihr.
      (state.phase === "feedback") === (state.lastFeedback !== undefined),
    "Der Stand der Runde passt nicht zu ihren Blöcken.",
  );

export type WordRoundSnapshot = z.infer<typeof wordRoundSnapshotSchema>;

/** Was die Runde im Container zum Speichern hergibt. */
export type WordRoundSnapshotSource = {
  state: WordRoundState;
  view: WordBoxView;
  config: {
    stage: LearningWordStage;
    roundSize: 5 | 10 | 20 | "all";
    blockSize: LearningWordBlockSize;
  };
  startedAt: string;
  retry?: true | undefined;
};

/** Erledigte und alle Blöcke der Runde („3 von 10“); eine richtige Antwort zählt sofort. */
export function wordRoundProgress(state: WordRoundState): {
  done: number;
  total: number;
} {
  const total = state.blocks.length;
  if (state.phase === "complete") return { done: total, total };
  const answered =
    state.phase === "feedback" && state.lastFeedback?.correct === true;
  return { done: Math.min(total, state.index + (answered ? 1 : 0)), total };
}

/**
 * Inhalt des Zwischenstands. `null`, wenn die Runde schon abgeschlossen ist:
 * Dann gibt es nichts fortzusetzen.
 */
export function buildWordRoundSnapshot(
  source: WordRoundSnapshotSource,
): WordRoundSnapshot | null {
  const { state } = source;
  if (state.phase === "complete") return null;
  const { id, kind, title, words, editable } = source.view;
  const snapshot = {
    state,
    view: { id, kind, title, words, editable },
    config: source.config,
    startedAt: source.startedAt,
    ...(source.retry ? { retry: true as const } : {}),
  };
  // Vor dem Speichern prüfen: Was nicht wieder lesbar wäre, wird nicht angeboten.
  const checked = wordRoundSnapshotSchema.safeParse(snapshot);
  return checked.success ? checked.data : null;
}
