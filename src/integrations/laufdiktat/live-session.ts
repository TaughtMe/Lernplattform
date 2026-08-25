import { z } from "zod";
import { deterministicOrder } from "../../domain/running-dictation";

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
  })
  .passthrough();

const liveSessionConfigSchema = z
  .object({
    words: z.array(liveWordSchema).min(1).max(1_000),
    gameMode: z
      .enum(["LAUFDIKTAT", "UEBUNG", "BATTLE", "TEST"])
      .default("UEBUNG"),
    stationMode: z.boolean().default(false),
    stationCount: z.number().int().min(1).max(100).default(1),
    isTtsEnabled: z.boolean().default(false),
    uebungMaxAttempts: z.number().int().min(1).max(20).default(3),
    uebungAssistanceEnabled: z.boolean().default(false),
    repeatWrongAnswers: z.boolean().default(false),
    vocabularyTransfer: z.enum(["errors", "all", "none"]).default("errors"),
    showStars: z.boolean().default(true),
    shuffleWords: z.boolean().default(false),
    strictTypingMode: z.boolean().default(false),
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
export type VocabularyTransferChoice = "errors" | "all" | "none";
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

export function checkLiveAnswer(word: LiveWord, input: string) {
  const kind = word.kind ?? (word.prompt ? "math" : "text");
  const value = input.trim();
  if (!value) return false;
  if (kind === "math") {
    const actual = Number.parseFloat(value.replace(",", "."));
    const expected = Number(word.targetWord);
    return (
      Number.isFinite(actual) &&
      Number.isFinite(expected) &&
      Math.abs(actual - expected) < NUMERIC_TOLERANCE
    );
  }
  if (kind === "vocabulary") {
    const actual = normalizeAnswer(
      value,
      word.caseSensitive ?? false,
      word.answerLang,
    );
    return [word.targetWord, ...(word.acceptedAnswers ?? [])].some(
      (answer) =>
        normalizeAnswer(
          answer,
          word.caseSensitive ?? false,
          word.answerLang,
        ) === actual,
    );
  }
  return value === word.targetWord;
}

export function liveWordKind(word: LiveWord) {
  return word.kind ?? (word.prompt ? "math" : "text");
}
