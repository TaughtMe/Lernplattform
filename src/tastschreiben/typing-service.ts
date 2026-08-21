import type { LocalRepositoryFactory } from "../storage/local-data-boundaries.ts";
import type { TypingStats } from "./typing-stats.ts";
import { computePoints } from "./scoring.ts";
import { LESSONS } from "./curriculum.ts";

export interface LessonProgressV1 {
  id: string;
  completed: boolean;
  bestWpm: number;
  bestAccuracy: number;
  attempts: number;
  lastPracticedAt: string;
}

export interface TypingAttemptV1 {
  id: string;
  lessonId: string;
  occurredAt: string;
  wpm: number;
  accuracy: number;
  corrections: number;
  problemChars: Array<{ char: string; errors: number }>;
  points: number;
}

export interface GameScoreV1 {
  id: string;
  bestScore: number;
  bestStreak: number;
  attempts: number;
  lastPlayedAt: string;
}

export interface ProgressSnapshot {
  /** Nur echte Lehrplan-Lektionen, keine Spiele/Sonder-Übungen wie Zeitrennen oder Fehlertasten. */
  lessonProgress: LessonProgressV1[];
  totalLessons: number;
  totalPoints: number;
  bestGameScore: number;
  bestGameStreak: number;
  bestTimeAttackWpm: number;
}

/** Ab dieser Genauigkeit gilt eine Lektion als bestanden — Geschwindigkeit bleibt informativ, siehe "07 - Adaptive Merkstrecke". */
export const COMPLETION_ACCURACY = 90;

const TIME_ATTACK_ID = "zeitrennen";
const FALLING_WORDS_GAME_ID = "buchstabenregen";

function nowIso(): string {
  return new Date().toISOString();
}

function defaultProgress(lessonId: string): LessonProgressV1 {
  return { id: lessonId, completed: false, bestWpm: 0, bestAccuracy: 0, attempts: 0, lastPracticedAt: "" };
}

function defaultGameScore(gameId: string): GameScoreV1 {
  return { id: gameId, bestScore: 0, bestStreak: 0, attempts: 0, lastPlayedAt: "" };
}

export function createTypingService(factory: LocalRepositoryFactory) {
  const progressRepo = factory.open<LessonProgressV1>("personal", "typing-progress");
  const attemptsRepo = factory.open<TypingAttemptV1>("personal", "typing-attempts");
  const gameScoresRepo = factory.open<GameScoreV1>("personal", "game-scores");

  async function getProgress(lessonId: string): Promise<LessonProgressV1> {
    return (await progressRepo.get(lessonId)) ?? defaultProgress(lessonId);
  }

  async function listProgress(): Promise<LessonProgressV1[]> {
    return progressRepo.list();
  }

  /**
   * Aktualisiert den Lektionsfortschritt wie zuvor, protokolliert die Runde
   * zusätzlich in der Verlaufs-Historie (Grundlage für Fortschritts-Diagramm,
   * Fehlertasten-Auswertung und die Gesamtpunktzahl) — auch für
   * Sonder-"Lektionen" wie Zeitrennen oder Fehlertasten-Training, die keinen
   * echten Lehrplan-Eintrag haben, aber genauso Punkte und Verlauf verdienen.
   */
  async function recordAttempt(lessonId: string, stats: TypingStats, now: string = nowIso()): Promise<LessonProgressV1> {
    const existing = await getProgress(lessonId);
    const willComplete = existing.completed || stats.accuracy >= COMPLETION_ACCURACY;
    const isFirstCompletion = !existing.completed && willComplete;

    const updated: LessonProgressV1 = {
      id: lessonId,
      completed: willComplete,
      bestWpm: Math.max(existing.bestWpm, stats.wpm),
      bestAccuracy: Math.max(existing.bestAccuracy, stats.accuracy),
      attempts: existing.attempts + 1,
      lastPracticedAt: now,
    };
    await progressRepo.put(updated);

    const attempt: TypingAttemptV1 = {
      id: `${lessonId}:${now}:${Math.random().toString(36).slice(2)}`,
      lessonId,
      occurredAt: now,
      wpm: stats.wpm,
      accuracy: stats.accuracy,
      corrections: stats.corrections,
      problemChars: stats.problemChars,
      points: computePoints(stats, isFirstCompletion),
    };
    await attemptsRepo.put(attempt);

    return updated;
  }

  async function getHistory(lessonId?: string): Promise<TypingAttemptV1[]> {
    const all = await attemptsRepo.list();
    const filtered = lessonId ? all.filter((a) => a.lessonId === lessonId) : all;
    return filtered.sort((a, b) => (a.occurredAt < b.occurredAt ? -1 : a.occurredAt > b.occurredAt ? 1 : 0));
  }

  /** Summierte Fehler pro Zeichen über die gesamte Verlaufshistorie, häufigstes zuerst. */
  async function getWeakKeys(limit: number = 8): Promise<Array<{ char: string; errors: number }>> {
    const all = await attemptsRepo.list();
    const tally = new Map<string, number>();
    for (const attempt of all) {
      for (const p of attempt.problemChars) tally.set(p.char, (tally.get(p.char) ?? 0) + p.errors);
    }
    return Array.from(tally.entries())
      .map(([char, errors]) => ({ char, errors }))
      .sort((a, b) => b.errors - a.errors)
      .slice(0, limit);
  }

  async function getTotalPoints(): Promise<number> {
    const all = await attemptsRepo.list();
    return all.reduce((sum, a) => sum + a.points, 0);
  }

  async function getGameScore(gameId: string): Promise<GameScoreV1> {
    return (await gameScoresRepo.get(gameId)) ?? defaultGameScore(gameId);
  }

  async function recordGameScore(gameId: string, score: number, streak: number, now: string = nowIso()): Promise<GameScoreV1> {
    const existing = await getGameScore(gameId);
    const updated: GameScoreV1 = {
      id: gameId,
      bestScore: Math.max(existing.bestScore, score),
      bestStreak: Math.max(existing.bestStreak, streak),
      attempts: existing.attempts + 1,
      lastPlayedAt: now,
    };
    await gameScoresRepo.put(updated);
    return updated;
  }

  /** Alles, was Abzeichen und die Gesamt-Medaille brauchen, an einer Stelle zusammengefasst. */
  async function getProgressSnapshot(): Promise<ProgressSnapshot> {
    const realLessonIds = new Set(LESSONS.map((l) => l.id));
    const [allProgress, totalPoints, gameScore, timeAttackProgress] = await Promise.all([
      listProgress(),
      getTotalPoints(),
      getGameScore(FALLING_WORDS_GAME_ID),
      getProgress(TIME_ATTACK_ID),
    ]);
    return {
      lessonProgress: allProgress.filter((p) => realLessonIds.has(p.id)),
      totalLessons: LESSONS.length,
      totalPoints,
      bestGameScore: gameScore.bestScore,
      bestGameStreak: gameScore.bestStreak,
      bestTimeAttackWpm: timeAttackProgress.bestWpm,
    };
  }

  return {
    getProgress,
    listProgress,
    recordAttempt,
    getHistory,
    getWeakKeys,
    getTotalPoints,
    getGameScore,
    recordGameScore,
    getProgressSnapshot,
  };
}

export type TypingService = ReturnType<typeof createTypingService>;
export { TIME_ATTACK_ID, FALLING_WORDS_GAME_ID };
