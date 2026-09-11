import type { TypingStats } from "./typing-stats";

export const TYPING_COMPLETION_ACCURACY = 90;

export interface TypingLessonProgress {
  id: string;
  completed: boolean;
  bestWpm: number;
  bestAccuracy: number;
  attempts: number;
  lastPracticedAt: string;
  problemChars: Array<{ char: string; errors: number }>;
}

export function updateTypingProgress(
  current: TypingLessonProgress | undefined,
  lessonId: string,
  stats: TypingStats,
  now: string,
): TypingLessonProgress {
  return {
    id: lessonId,
    completed:
      Boolean(current?.completed) ||
      stats.accuracy >= TYPING_COMPLETION_ACCURACY,
    bestWpm: Math.max(current?.bestWpm ?? 0, stats.wpm),
    bestAccuracy: Math.max(current?.bestAccuracy ?? 0, stats.accuracy),
    attempts: (current?.attempts ?? 0) + 1,
    lastPracticedAt: now,
    problemChars: stats.problemChars,
  };
}
