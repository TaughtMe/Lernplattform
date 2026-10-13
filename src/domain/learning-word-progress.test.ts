import { describe, expect, it } from "vitest";
import { updateLearningWordProgress } from "./learning-word-progress";

describe("learning word progress", () => {
  it("keeps merk stage and repetition box separate", () => {
    const first = updateLearningWordProgress(undefined, {
      word: "Schlüssel",
      correct: true,
      usedHelp: false,
      selfCorrected: false,
      stage: 2,
      now: "2026-08-24T10:00:00.000Z",
    });
    const afterError = updateLearningWordProgress(first, {
      word: "Schlüssel",
      correct: false,
      usedHelp: false,
      selfCorrected: false,
      stage: 3,
      now: "2026-08-25T10:00:00.000Z",
    });

    expect(first).toMatchObject({ stage: 3, box: 2 });
    expect(afterError).toMatchObject({ stage: 2, box: 1 });
    expect(afterError.dueAt).toBe("2026-08-25T10:00:00.000Z");
  });

  it("does not advance after help or self-correction", () => {
    const progress = updateLearningWordProgress(undefined, {
      word: "Bibliothek",
      correct: true,
      usedHelp: true,
      selfCorrected: false,
      stage: 4,
      now: "2026-08-24T10:00:00.000Z",
    });
    expect(progress).toMatchObject({ stage: 4, box: 1, helpUses: 1 });
  });

  it("advances up to stage six while the repetition box stops at five", () => {
    let progress = updateLearningWordProgress(undefined, {
      word: "Rad",
      correct: true,
      usedHelp: false,
      selfCorrected: false,
      stage: 5,
      now: "2026-08-24T10:00:00.000Z",
    });
    expect(progress.stage).toBe(6);
    for (let day = 0; day < 8; day += 1) {
      progress = updateLearningWordProgress(progress, {
        word: "Rad",
        correct: true,
        usedHelp: false,
        selfCorrected: false,
        stage: 6,
        now: "2026-08-25T10:00:00.000Z",
      });
    }
    expect(progress).toMatchObject({ stage: 6, box: 5 });
  });
});
