import { describe, expect, it } from "vitest";
import {
  TYPING_LESSONS,
  availableKeysThrough,
  isTypingLessonUnlocked,
} from "./curriculum";

describe("typing curriculum", () => {
  it("starts with one finger pair and introduces keys in small steps", () => {
    expect(TYPING_LESSONS[0]).toMatchObject({
      id: "grundstellung-zeigefinger",
      newKeys: ["f", "j"],
    });
    expect(
      TYPING_LESSONS.slice(0, 4).map((lesson) => lesson.newKeys.length),
    ).toEqual([2, 2, 2, 2]);
    expect(TYPING_LESSONS.length).toBeGreaterThanOrEqual(20);
  });

  it("unlocks lessons sequentially and accumulates introduced keys", () => {
    expect(isTypingLessonUnlocked("grundstellung-zeigefinger", new Set())).toBe(
      true,
    );
    expect(
      isTypingLessonUnlocked("grundstellung-mittelfinger", new Set()),
    ).toBe(false);
    expect(
      isTypingLessonUnlocked(
        "grundstellung-mittelfinger",
        new Set(["grundstellung-zeigefinger"]),
      ),
    ).toBe(true);
    expect(availableKeysThrough("grundstellung-mittelfinger")).toEqual([
      "f",
      "j",
      "d",
      "k",
    ]);
  });
});
