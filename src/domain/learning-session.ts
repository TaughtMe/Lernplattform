import type { LearningEventV1, VocabularyItemV1 } from "./learning-bundle";
import { normalizeVocabularyText } from "./learning-bundle";

export type VocabularyAnswerResult = {
  accepted: boolean;
  expectedAnswer: string;
};

export type LearningProgressSummary = {
  attempts: number;
  correct: number;
  incorrect: number;
};

export function evaluateVocabularyAnswer(
  item: VocabularyItemV1,
  input: string,
): VocabularyAnswerResult {
  const normalizedInput = normalizeVocabularyText(input, item.answer.locale);
  const acceptedAnswers = [
    item.answer.text,
    ...(item.answer.alternatives ?? []),
  ].map((answer) => normalizeVocabularyText(answer, item.answer.locale));

  return {
    accepted: acceptedAnswers.includes(normalizedInput),
    expectedAnswer: item.answer.text,
  };
}

export function summarizeLearningProgress(
  events: readonly LearningEventV1[],
  learningObjectId: string,
): LearningProgressSummary {
  const matchingEvents = events.filter(
    (event) => event.learningObjectId === learningObjectId,
  );
  const correct = matchingEvents.filter(
    (event) => event.assessment.knowledge === "correct",
  ).length;

  return {
    attempts: matchingEvents.length,
    correct,
    incorrect: matchingEvents.length - correct,
  };
}
