/** Abgeleitete Werte für Dashboard und LernBox (rein, ohne Speicherzugriff). */
import type { LearningDirection } from "../domain/learning-bundle";
import { visibleBox, visibleDue, type ReviewMode } from "../domain/leitner";
import { dayKey, STREAK_MIN_CARDS, type DayActivity, type Deck, type TypingState, type WordEntry } from "./personal";

export const DIR_FW: LearningDirection = "prompt-to-answer";

export function dueItems(deck: Deck, mode: ReviewMode, dir: LearningDirection, now: Date) {
  return deck.items.filter((item) => {
    const p = deck.progress[item.id];
    return !p || visibleDue(p, dir, mode, now);
  });
}

export function boxCounts(deck: Deck, mode: ReviewMode, dir: LearningDirection): number[] {
  const counts = [0, 0, 0, 0, 0];
  deck.items.forEach((item) => {
    const p = deck.progress[item.id];
    counts[(p ? visibleBox(p, dir, mode) : 1) - 1]++;
  });
  return counts;
}

export function dueWords(words: WordEntry[], now: Date): WordEntry[] {
  return words.filter((w) => new Date(w.dueAt).getTime() <= now.getTime());
}

export interface Overview {
  todayCards: number;
  due: number;
  goal: number;
  streakLeft: number;
  level: number;
  levelProgress: number;
  hardWords: { text: string; wrong: number }[];
  badges: string[];
}

export function overview(decks: Deck[], words: WordEntry[], activity: Record<string, DayActivity>, typing: TypingState, streak: number, now = new Date()): Overview {
  const todayCards = activity[dayKey(now)]?.cards ?? 0;
  const due = decks.reduce((n, d) => n + dueItems(d, "writing", DIR_FW, now).length, 0) + dueWords(words, now).length;
  const goal = Math.max(STREAK_MIN_CARDS, todayCards + due);
  const growth = decks.reduce((n, d) => n + boxCounts(d, "writing", DIR_FW).reduce((s, c, i) => s + c * i, 0), 0) + words.reduce((s, w) => s + w.box - 1, 0);
  const level = 1 + Math.floor(growth / 25);
  const hardVocab = decks.flatMap((d) => d.errorIds.map((id) => d.items.find((i) => i.id === id)).filter(Boolean).map((i) => ({ text: i!.answer, wrong: 3 })));
  const hardWords = [...words.filter((w) => w.wrongCount > 0).map((w) => ({ text: w.word, wrong: w.wrongCount })), ...hardVocab]
    .sort((a, b) => b.wrong - a.wrong)
    .slice(0, 3);
  const badges = [
    streak >= 3 && "3 Tage in Folge",
    streak >= 7 && "Eine Woche dran",
    streak >= 30 && "Monatsserie",
    todayCards >= STREAK_MIN_CARDS && "Tagesziel",
    decks.some((d) => boxCounts(d, "writing", DIR_FW)[4] >= 5) && "Fünf in Box 5",
    words.filter((w) => w.box >= 4).length >= 5 && "Wortprofi",
    typing.stars.filter((s) => s === 3).length >= 3 && "Drei Tastensterne",
    typing.stage >= 5 && "Tastenwelt Hälfte",
    Object.keys(activity).length >= 10 && "Zehn Lerntage",
  ].filter(Boolean) as string[];
  return { todayCards, due, goal, streakLeft: Math.max(0, STREAK_MIN_CARDS - todayCards), level, levelProgress: (growth % 25) / 25, hardWords, badges };
}
