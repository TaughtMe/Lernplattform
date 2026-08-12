import type {
  LearningDirection,
  LearningEventV1,
  VocabularyItemV1,
} from "./learning-bundle";
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

export type VocabularyPrompt = {
  question: VocabularyItemV1["prompt"];
  expected: VocabularyItemV1["answer"];
};

export function getVocabularyPrompt(
  item: VocabularyItemV1,
  direction: LearningDirection,
): VocabularyPrompt {
  return direction === "prompt-to-answer"
    ? { question: item.prompt, expected: item.answer }
    : { question: item.answer, expected: item.prompt };
}

export function evaluateVocabularyAnswerForDirection(
  item: VocabularyItemV1,
  input: string,
  direction: LearningDirection,
): VocabularyAnswerResult {
  const { expected } = getVocabularyPrompt(item, direction);
  const normalizedInput = normalizeVocabularyText(input, expected.locale);
  const acceptedAnswers = [expected.text, ...(expected.alternatives ?? [])].map(
    (answer) => normalizeVocabularyText(answer, expected.locale),
  );

  return {
    accepted: acceptedAnswers.includes(normalizedInput),
    expectedAnswer: expected.text,
  };
}

export function evaluateVocabularyAnswer(
  item: VocabularyItemV1,
  input: string,
): VocabularyAnswerResult {
  return evaluateVocabularyAnswerForDirection(item, input, "prompt-to-answer");
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
