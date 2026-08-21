import { normalizeVocabularyText } from "../domain/learning-bundle.ts";
import type { DuellWord } from "./duell-content.ts";

/** Freie Eingabe, wie in "09 - Duelle" gefordert ("freie Eingabe zählt stärker als Multiple Choice") — keine Auswahlantworten. */
export function checkDuellAnswer(word: DuellWord, input: string): boolean {
  const typed = input.trim();
  if (!typed) return false;
  const accepted = [word.answer, ...word.alternatives];
  const normalizedTyped = normalizeVocabularyText(typed, word.answerLocale);
  return accepted.some((candidate) => normalizeVocabularyText(candidate, word.answerLocale) === normalizedTyped);
}

export interface DuellAnswerInput {
  itemId: string;
  typed: string;
}

export interface DuellWordResult {
  itemId: string;
  correct: boolean;
}

export interface DuellRoundResult {
  wordResults: DuellWordResult[];
  correctCount: number;
  totalCount: number;
  /** 0–100, gerundet. */
  accuracy: number;
  totalTimeMs: number;
}

/** Fehlende Antworten (kein Eintrag in `answers`) gelten als falsch, nicht als übersprungen. */
export function evaluateDuellRound(words: DuellWord[], answers: DuellAnswerInput[], totalTimeMs: number): DuellRoundResult {
  const typedByItemId = new Map(answers.map((a) => [a.itemId, a.typed]));
  const wordResults = words.map((word) => ({
    itemId: word.itemId,
    correct: checkDuellAnswer(word, typedByItemId.get(word.itemId) ?? ""),
  }));
  const correctCount = wordResults.filter((r) => r.correct).length;
  const totalCount = words.length;
  const accuracy = totalCount === 0 ? 0 : Math.round((correctCount / totalCount) * 100);
  return { wordResults, correctCount, totalCount, accuracy, totalTimeMs };
}

export interface DuellParticipantResult {
  participantId: string;
  alias: string;
  round: DuellRoundResult;
}

/** Genauigkeit zählt stärker als Zeit — Zeit entscheidet nur bei gleicher Genauigkeit (siehe "09 - Duelle"). */
export function rankDuellResults(results: DuellParticipantResult[]): DuellParticipantResult[] {
  return [...results].sort((a, b) => {
    if (b.round.accuracy !== a.round.accuracy) return b.round.accuracy - a.round.accuracy;
    return a.round.totalTimeMs - b.round.totalTimeMs;
  });
}
