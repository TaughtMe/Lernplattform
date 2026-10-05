import type { LiveVocabularyTransferChoice } from "../../domain/live-vocabulary-placement";
import { mathOptionsSchema } from "../../domain/math-practice";
import { z } from "zod";
import { classSealFingerprintSchema } from "../../domain/class-seal";
import { deterministicOrder } from "../../domain/running-dictation";
import { toleratesSpelling } from "../../domain/spelling-tolerance";

const liveWordSchema = z
  .object({
    id: z.string().min(1).max(160),
    kind: z.enum(["text", "math", "vocabulary"]).optional(),
    targetWord: z.string().min(1).max(2_000),
    prompt: z.string().max(2_000).optional(),
    acceptedAnswers: z.array(z.string().min(1).max(500)).max(30).optional(),
    caseSensitive: z.boolean().optional(),
    promptLang: z.string().max(35).optional(),
    answerLang: z.string().max(35).optional(),
    isLatex: z.boolean().optional(),
    tag: z.string().trim().max(80).optional(),
  })
  .passthrough();

const liveSessionConfigSchema = z
  .object({
    mathPracticeOptions: mathOptionsSchema.optional(),
    words: z.array(liveWordSchema).min(1).max(1_000),
    gameMode: z
      .enum(["LAUFDIKTAT", "UEBUNG", "BATTLE", "TEST"])
      .default("UEBUNG")
      .transform((mode) => (mode === "TEST" ? "LAUFDIKTAT" : mode)),
    stationMode: z.boolean().default(false),
    stationCount: z.number().int().min(1).max(100).default(1),
    isTtsEnabled: z.boolean().default(false),
    uebungMaxAttempts: z.number().int().min(1).max(20).default(3),
    uebungAssistanceEnabled: z.boolean().default(false),
    repeatWrongAnswers: z.boolean().default(false),
    vocabularyTransfer: z.enum(["errors", "all", "none"]).default("errors"),
    vocabularyTag: z.string().trim().max(80).optional(),
    /** Abdruck des Klassenstempels; nur dann kann eine Freigabe wirken. */
    classSeal: classSealFingerprintSchema.optional(),
    showStars: z.boolean().default(true),
    shuffleWords: z.boolean().default(false),
    strictTypingMode: z.boolean().default(false),
    /** Mathe: Aufgabe nach mehreren Fehlern im Antwortfeld wieder zeigen. */
    showTaskAfterErrors: z.boolean().default(false),
    stationShuffle: z.boolean().default(false),
    battleOptions: z
      .object({
        ink: z.boolean().default(true),
        flicker: z.boolean().default(true),
      })
      .default({ ink: true, flicker: true }),
  })
  .passthrough();

export type LiveWord = z.infer<typeof liveWordSchema>;
export type VocabularyTransferChoice = LiveVocabularyTransferChoice;
export type LiveSession = z.infer<typeof liveSessionConfigSchema> & {
  sessionId: string;
};

export function parseLiveSession(
  config: unknown,
  sessionId: string,
  shuffleSeed: string,
): LiveSession {
  const parsed = liveSessionConfigSchema.parse(config);
  const words =
    parsed.shuffleWords && !parsed.stationMode
      ? deterministicOrder(parsed.words.length, shuffleSeed).map(
          (index) => parsed.words[index] as LiveWord,
        )
      : parsed.words;
  return { ...parsed, words, sessionId };
}

const NUMERIC_TOLERANCE = 0.01;

function normalizeAnswer(
  value: string,
  caseSensitive: boolean,
  locale?: string,
) {
  const normalized = value.trim().replace(/\s+/g, " ").normalize("NFC");
  return caseSensitive
    ? normalized
    : normalized.toLocaleLowerCase(locale ?? "de-DE");
}

export type LiveAnswerResult = "correct" | "tolerated" | "wrong";

/**
 * Bewertet eine Antwort. Mit `tolerance` zählt bei Vokabeln „fast richtig“
 * (ein Buchstabe falsch, fehlend, zusätzlich oder vertauscht) als `tolerated`.
 */
export function evaluateLiveAnswer(
  word: LiveWord,
  input: string,
  options: { tolerance?: boolean } = {},
): LiveAnswerResult {
  const kind = word.kind ?? (word.prompt ? "math" : "text");
  const value = input.trim();
  if (!value) return "wrong";
  if (kind === "math") {
    const actual = Number(value.replace(",", "."));
    const expected = Number(word.targetWord);
    return Number.isFinite(actual) &&
      Number.isFinite(expected) &&
      Math.abs(actual - expected) < NUMERIC_TOLERANCE
      ? "correct"
      : "wrong";
  }
  if (kind === "vocabulary") {
    const caseSensitive = word.caseSensitive ?? false;
    const actual = normalizeAnswer(value, caseSensitive, word.answerLang);
    const accepted = [word.targetWord, ...(word.acceptedAnswers ?? [])].map(
      (answer) => normalizeAnswer(answer, caseSensitive, word.answerLang),
    );
    if (accepted.includes(actual)) return "correct";
    return options.tolerance &&
      accepted.some((answer) => toleratesSpelling(actual, answer))
      ? "tolerated"
      : "wrong";
  }
  return value === word.targetWord ? "correct" : "wrong";
}

export function checkLiveAnswer(word: LiveWord, input: string) {
  return evaluateLiveAnswer(word, input) === "correct";
}

export function liveWordKind(word: LiveWord) {
  return word.kind ?? (word.prompt ? "math" : "text");
}
