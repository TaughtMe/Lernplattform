import { describe, expect, it } from "vitest";
import { updateTypingProgress } from "./typing-progress";

describe("typing progress", () => {
  it("unlocks completion through accuracy while treating speed as information", () => {
    const progress = updateTypingProgress(
      undefined,
      "grundstellung-links",
      {
        totalChars: 50,
        correctChars: 46,
        errorCount: 4,
        accuracy: 92,
        elapsedMs: 60_000,
        cpm: 46,
        wpm: 9,
        corrections: 1,
        problemChars: [{ char: "f", errors: 2 }],
      },
      "2026-08-24T10:00:00.000Z",
    );

    expect(progress.completed).toBe(true);
    expect(progress.bestWpm).toBe(9);
    expect(progress.problemChars).toEqual([{ char: "f", errors: 2 }]);
  });
});
