import { describe, expect, it, vi } from "vitest";
import {
  createLearningBoxCard,
  evaluateLearningBoxAnswer,
  isLearningBoxCardDue,
  processLearningBoxResult,
} from "./learning-box";

vi.stubGlobal("crypto", { randomUUID: () => "fixed-id" });

describe("integrated learning box domain", () => {
  it("keeps both learning directions independent", () => {
    const card = createLearningBoxCard({
      deckId: "deck",
      question: "library",
      answer: "Bibliothek",
      now: 1_000,
    });
    const updated = processLearningBoxResult(card, {
      correct: true,
      direction: "reverse",
      mode: "writing",
      now: 2_000,
    });

    expect(updated.box).toBe(1);
    expect(updated.reverseBox).toBe(2);
    expect(updated.reverseWritingStreak).toBe(1);
  });

  it("uses the original LernBox interval and answer rules", () => {
    const card = createLearningBoxCard({
      deckId: "deck",
      question: "library",
      answer: "Bibliothek",
      now: 1_000,
    });
    expect(evaluateLearningBoxAnswer(card, " bibliothek ", "forward")).toEqual({
      accepted: true,
      expectedAnswer: "Bibliothek",
    });
    expect(isLearningBoxCardDue(card, "forward", 1_000)).toBe(true);
    expect(evaluateLearningBoxAnswer(card, "library", "reverse")).toEqual({
      accepted: true,
      expectedAnswer: "library",
    });
    expect(
      isLearningBoxCardDue(
        { ...card, interval: 2, nextReview: 20 * 60 * 60 * 1_000 },
        "forward",
        1_000,
      ),
    ).toBe(false);
  });

  it("keeps the level after a recovered second chance and resets after a failed one", () => {
    const card = {
      ...createLearningBoxCard({
        deckId: "deck",
        question: "library",
        answer: "Bibliothek",
        now: 100,
      }),
      box: 3 as const,
      level: 3 as const,
    };
    const recovered = processLearningBoxResult(card, {
      correct: true,
      direction: "forward",
      mode: "writing",
      secondChance: "recovered",
      now: 200,
    });
    const failed = processLearningBoxResult(card, {
      correct: false,
      direction: "forward",
      mode: "writing",
      secondChance: "failed",
      now: 200,
    });
    expect(recovered.box).toBe(3);
    expect(recovered.writingStreak).toBe(0);
    expect(failed.box).toBe(1);
  });
});
