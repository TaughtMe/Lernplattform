import { describe, expect, it } from "vitest";
import {
  REFLECTION_QUESTIONS,
  reflectionQuestionsFor,
} from "./progress-reflection";

describe("reflectionQuestionsFor", () => {
  it("asks nothing before two results", () => {
    expect(reflectionQuestionsFor([])).toEqual([]);
    expect(reflectionQuestionsFor([{ percent: 50 }])).toEqual([]);
  });

  it("asks the four questions from two results on", () => {
    expect(reflectionQuestionsFor([{ percent: 50 }, { percent: 80 }])).toEqual([
      ...REFLECTION_QUESTIONS,
    ]);
  });
});
