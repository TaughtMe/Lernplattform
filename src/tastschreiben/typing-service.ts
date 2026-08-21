import type { LocalRepositoryFactory } from "../storage/local-data-boundaries.ts";
import type { TypingStats } from "./typing-stats.ts";

export interface LessonProgressV1 {
  id: string;
  completed: boolean;
  bestWpm: number;
  bestAccuracy: number;
  attempts: number;
  lastPracticedAt: string;
}

/** Ab dieser Genauigkeit gilt eine Lektion als bestanden — Geschwindigkeit bleibt informativ, siehe "07 - Adaptive Merkstrecke". */
export const COMPLETION_ACCURACY = 90;

function nowIso(): string {
  return new Date().toISOString();
}

function defaultProgress(lessonId: string): LessonProgressV1 {
  return { id: lessonId, completed: false, bestWpm: 0, bestAccuracy: 0, attempts: 0, lastPracticedAt: "" };
}

export function createTypingService(factory: LocalRepositoryFactory) {
  const progressRepo = factory.open<LessonProgressV1>("personal", "typing-progress");

  async function getProgress(lessonId: string): Promise<LessonProgressV1> {
    return (await progressRepo.get(lessonId)) ?? defaultProgress(lessonId);
  }

  async function listProgress(): Promise<LessonProgressV1[]> {
    return progressRepo.list();
  }

  async function recordAttempt(lessonId: string, stats: TypingStats, now: string = nowIso()): Promise<LessonProgressV1> {
    const existing = await getProgress(lessonId);
    const updated: LessonProgressV1 = {
      id: lessonId,
      completed: existing.completed || stats.accuracy >= COMPLETION_ACCURACY,
      bestWpm: Math.max(existing.bestWpm, stats.wpm),
      bestAccuracy: Math.max(existing.bestAccuracy, stats.accuracy),
      attempts: existing.attempts + 1,
      lastPracticedAt: now,
    };
    await progressRepo.put(updated);
    return updated;
  }

  return { getProgress, listProgress, recordAttempt };
}

export type TypingService = ReturnType<typeof createTypingService>;
