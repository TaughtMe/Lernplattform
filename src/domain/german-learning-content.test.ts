import { describe, expect, it } from "vitest";
import {
  LEARNING_WORD_COLLECTIONS,
  getLearningWordCollection,
} from "./german-learning-content";

describe("German learning content", () => {
  it("keeps every collection addressable and tagged with a strategy", () => {
    expect(new Set(LEARNING_WORD_COLLECTIONS.map(({ id }) => id)).size).toBe(
      LEARNING_WORD_COLLECTIONS.length,
    );
    expect(
      LEARNING_WORD_COLLECTIONS.every(
        ({ strategy, words }) => Boolean(strategy) && words.length >= 5,
      ),
    ).toBe(true);
  });

  it("finds a collection without inventing an unknown one", () => {
    expect(getLearningWordCollection("umlaut")?.strategy).toBe("Ableiten");
    expect(getLearningWordCollection("unknown")).toBeUndefined();
  });
});
