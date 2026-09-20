import * as z from "zod";
import { learningEventV1Schema, type LearningEventV1 } from "./learning-bundle";
import type { LearningBoxCard, LearningBoxDeck } from "./learning-box";
import type { LearningWordProgress } from "./learning-word-progress";
import type { TypingLessonProgress } from "../tastschreiben/typing-progress";

export const PERSONAL_BACKUP_SCHEMA_VERSION = 1 as const;
export const PERSONAL_BACKUP_KIND = "lernraum-personal-backup" as const;

const learningBoxSourceSchema = z
  .object({
    kind: z.enum(["self", "teacher", "import", "running-dictation"]),
    sourceId: z.string().trim().min(1).optional(),
    classId: z.string().trim().min(1).optional(),
  })
  .strict();

const learningBoxSourceLinkSchema = z
  .object({
    source: learningBoxSourceSchema,
    itemId: z.string().trim().min(1),
    revision: z.number().int().nonnegative(),
    promptLocale: z.string().trim().min(2).max(35),
    answerLocale: z.string().trim().min(2).max(35),
  })
  .strict();

const learningBoxLevelSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

const countSchema = z.number().int().nonnegative();
const learningWordProgressBackupSchema = z
  .object({
    id: z.string().min(1),
    word: z.string().min(1),
    stage: learningBoxLevelSchema,
    box: learningBoxLevelSchema,
    dueAt: z.iso.datetime({ offset: true }),
    attempts: countSchema,
    incorrectAttempts: countSchema,
    helpUses: countSchema,
    lastPracticedAt: z.iso.datetime({ offset: true }),
  })
  .strict();
const typingProgressBackupSchema = z
  .object({
    id: z.string().min(1),
    completed: z.boolean(),
    bestWpm: z.number().nonnegative(),
    bestAccuracy: z.number().min(0).max(100),
    attempts: countSchema,
    lastPracticedAt: z.iso.datetime({ offset: true }),
    problemChars: z.array(
      z.object({ char: z.string().min(1), errors: countSchema }),
    ),
  })
  .strict();

export const personalBackupDeckSchema = z
  .object({
    id: z.string().trim().min(1),
    title: z.string().trim().min(1),
    frontLocale: z.string().trim().min(2).max(35),
    backLocale: z.string().trim().min(2).max(35),
    source: learningBoxSourceSchema,
    createdAt: z.number().int().nonnegative(),
    updatedAt: z.number().int().nonnegative(),
  })
  .strict();

export const personalBackupCardSchema = z
  .object({
    id: z.string().trim().min(1),
    deckId: z.string().trim().min(1),
    question: z.string().trim().min(1),
    answer: z.string().trim().min(1),
    tag: z.string().trim().min(1).optional(),
    fingerprint: z.string().trim().min(1),
    source: learningBoxSourceSchema,
    level: learningBoxLevelSchema,
    box: learningBoxLevelSchema,
    interval: z.number().nonnegative(),
    nextReview: z.number().int().nonnegative(),
    writingStreak: z.number().int().nonnegative(),
    reverseBox: learningBoxLevelSchema,
    reverseInterval: z.number().nonnegative(),
    reverseNextReview: z.number().int().nonnegative(),
    reverseWritingStreak: z.number().int().nonnegative(),
    lastReviewed: z.number().int().nonnegative(),
    createdAt: z.number().int().nonnegative(),
    updatedAt: z.number().int().nonnegative(),
    sourceLinks: z.array(learningBoxSourceLinkSchema).max(100).optional(),
  })
  .strict();

const personalDataSchema = z
  .object({
    learningEvents: z.array(learningEventV1Schema).max(1_000_000),
    learningBoxDecks: z.array(personalBackupDeckSchema).max(100_000),
    learningBoxCards: z.array(personalBackupCardSchema).max(1_000_000),
    learningWordProgress: z
      .array(learningWordProgressBackupSchema)
      .max(100_000),
    typingProgress: z.array(typingProgressBackupSchema).max(100_000),
  })
  .strict();

export const personalLearningBackupSchema = z
  .object({
    kind: z.literal(PERSONAL_BACKUP_KIND),
    schemaVersion: z.literal(PERSONAL_BACKUP_SCHEMA_VERSION),
    exportedAt: z.iso.datetime({ offset: true }),
    dataArea: z.literal("personal"),
    data: personalDataSchema,
  })
  .strict();

export type PersonalLearningBackup = z.infer<
  typeof personalLearningBackupSchema
>;

export type PersonalLearningBackupInput = {
  learningEvents: readonly LearningEventV1[];
  learningBoxDecks: readonly LearningBoxDeck[];
  learningBoxCards: readonly LearningBoxCard[];
  learningWordProgress: readonly LearningWordProgress[];
  typingProgress: readonly TypingLessonProgress[];
};

const legacyBackupSchema = z
  .object({
    decks: z.array(personalBackupDeckSchema),
    cards: z.array(personalBackupCardSchema),
  })
  .strict();

export function createPersonalLearningBackup(
  input: PersonalLearningBackupInput,
  exportedAt = new Date().toISOString(),
): PersonalLearningBackup {
  return personalLearningBackupSchema.parse({
    kind: PERSONAL_BACKUP_KIND,
    schemaVersion: PERSONAL_BACKUP_SCHEMA_VERSION,
    exportedAt,
    dataArea: "personal",
    data: {
      learningEvents: [...input.learningEvents],
      learningBoxDecks: [...input.learningBoxDecks],
      learningBoxCards: [...input.learningBoxCards],
      learningWordProgress: [...input.learningWordProgress],
      typingProgress: [...input.typingProgress],
    },
  });
}

export function parsePersonalLearningBackup(value: unknown) {
  const current = personalLearningBackupSchema.safeParse(value);
  if (current.success) return current.data;

  const legacy = legacyBackupSchema.safeParse(value);
  if (legacy.success) {
    return createPersonalLearningBackup({
      learningEvents: [],
      learningBoxDecks: legacy.data.decks,
      learningBoxCards: legacy.data.cards,
      learningWordProgress: [],
      typingProgress: [],
    });
  }

  throw current.error;
}

export function serializePersonalLearningBackup(value: PersonalLearningBackup) {
  return JSON.stringify(personalLearningBackupSchema.parse(value), null, 2);
}

export function parsePersonalLearningBackupText(value: string) {
  try {
    return parsePersonalLearningBackup(JSON.parse(value));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("Die Sicherungsdatei enthält kein gültiges JSON.", {
        cause: error,
      });
    }
    throw error;
  }
}
