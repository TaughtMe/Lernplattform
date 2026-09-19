import { describe, expect, it } from "vitest";
import type { LearningEventV1, VocabularyItemV1 } from "./learning-bundle";
import {
  evaluateVocabularyAnswer,
  evaluateVocabularyAnswerForDirection,
  getVocabularyPrompt,
  summarizeLearningProgress,
} from "./learning-session";

const item: VocabularyItemV1 = {
  kind: "vocabulary",
  id: "library",
  prompt: { text: "library", locale: "en" },
  answer: {
    text: "Bibliothek",
    locale: "de",
    alternatives: ["Bücherei"],
  },
  tagIds: ["school"],
  createdAt: "2026-08-12T10:00:00.000Z",
  updatedAt: "2026-08-12T10:00:00.000Z",
};

function event(
  id: string,
  learningObjectId: string,
  knowledge: "correct" | "incorrect",
): LearningEventV1 {
  return {
    id,
    learningObjectId,
    occurredAt: "2026-08-12T10:00:00.000Z",
    source: "learning-box",
    roundId: "round-1",
    direction: "prompt-to-answer",
    answerMode: "typed",
    help: "none",
    assessment: {
      knowledge,
      writing: knowledge,
      selfCorrected: false,
    },
  };
}

describe("evaluateVocabularyAnswer", () => {
  it("accepts the main answer independent of case and surrounding whitespace", () => {
    expect(evaluateVocabularyAnswer(item, "  bibliothek ").accepted).toBe(true);
  });

  it("accepts explicitly provided alternatives", () => {
    expect(evaluateVocabularyAnswer(item, "Bücherei").accepted).toBe(true);
  });

  it("rejects a different answer without hiding the expected answer", () => {
    expect(evaluateVocabularyAnswer(item, "Schule")).toEqual({
      accepted: false,
      expectedAnswer: "Bibliothek",
    });
  });

  it("reverses question and accepted answer without mutating the item", () => {
    expect(getVocabularyPrompt(item, "answer-to-prompt")).toEqual({
      question: item.answer,
      expected: item.prompt,
    });
    expect(
      evaluateVocabularyAnswerForDirection(
        item,
        " library ",
        "answer-to-prompt",
      ),
    ).toEqual({ accepted: true, expectedAnswer: "library" });
    expect(item.prompt.text).toBe("library");
  });
});

describe("summarizeLearningProgress", () => {
  it("summarizes only events for the requested learning object", () => {
    expect(
      summarizeLearningProgress(
        [
          event("one", "library", "correct"),
          event("two", "library", "incorrect"),
          event("three", "other", "correct"),
        ],
        "library",
      ),
    ).toEqual({ attempts: 2, correct: 1, incorrect: 1 });
  });
});
