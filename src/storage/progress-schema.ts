import { z } from "zod";
import type { LearningWordProgress } from "../domain/learning-word-progress";
import type { TypingLessonProgress } from "../tastschreiben/typing-progress";
import type { TypingStats } from "../tastschreiben/typing-stats";

const count = z.number().int().nonnegative();
const level = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);
const instant = z.iso.datetime({ offset: true });
const problemChars = z.array(
  z.object({ char: z.string().min(1), errors: count }),
);

export const learningWordProgressSchema: z.ZodType<LearningWordProgress> =
  z.object({
    id: z.string().min(1),
    word: z.string().min(1),
    stage: level,
    box: level,
    dueAt: instant,
    attempts: count,
    incorrectAttempts: count,
    helpUses: count,
    lastPracticedAt: instant,
  });
export const typingProgressSchema: z.ZodType<TypingLessonProgress> = z.object({
  id: z.string().min(1),
  completed: z.boolean(),
  bestWpm: z.number().nonnegative(),
  bestAccuracy: z.number().min(0).max(100),
  attempts: count,
  lastPracticedAt: instant,
  problemChars,
});
export const typingStatsSchema: z.ZodType<TypingStats> = z.object({
  totalChars: count,
  correctChars: count,
  errorCount: count,
  accuracy: z.number().min(0).max(100),
  elapsedMs: z.number().nonnegative(),
  cpm: z.number().nonnegative(),
  wpm: z.number().nonnegative(),
  corrections: count,
  problemChars,
});
