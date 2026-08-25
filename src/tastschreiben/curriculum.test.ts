import { describe, expect, it } from "vitest";
import {
  NUMPAD_LESSONS,
  TYPING_LESSONS,
  availableKeysThrough,
  isNumpadLessonUnlocked,
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

  it("keeps the numpad as an independent optional path", () => {
    expect(NUMPAD_LESSONS).toHaveLength(5);
    expect(isNumpadLessonUnlocked("numpad-grundstellung", new Set())).toBe(
      true,
    );
    expect(isNumpadLessonUnlocked("numpad-obere-reihe", new Set())).toBe(false);
    expect(availableKeysThrough("numpad-obere-reihe")).toEqual([
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
    ]);
  });
});
