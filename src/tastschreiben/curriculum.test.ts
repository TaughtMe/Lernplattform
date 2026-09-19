import { describe, expect, it } from "vitest";
import {
  NUMPAD_LESSONS,
  TYPING_LESSONS,
  availableKeysThrough,
  isNumpadLessonUnlocked,
  isTypingLessonUnlocked,
} from "./curriculum";

describe("typing curriculum", () => {
  it("isolates each finger before combining it with earlier fingers", () => {
    expect(TYPING_LESSONS[0]).toMatchObject({
      id: "grundstellung-zeigefinger",
      newKeys: ["f", "j"],
      practiceKeys: ["f", "j"],
    });
    expect(TYPING_LESSONS[1]).toMatchObject({
      id: "grundstellung-mittelfinger",
      newKeys: ["d", "k"],
      practiceKeys: ["d", "k"],
    });
    expect(TYPING_LESSONS[2]).toMatchObject({
      id: "grundstellung-zeige-mittel",
      newKeys: [],
      practiceKeys: ["f", "j", "d", "k"],
    });
    expect(TYPING_LESSONS[3]).toMatchObject({
      id: "grundstellung-ringfinger",
      practiceKeys: ["s", "l"],
    });
    expect(TYPING_LESSONS.length).toBeGreaterThanOrEqual(45);
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
    expect(NUMPAD_LESSONS).toHaveLength(7);
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
    expect(NUMPAD_LESSONS[2]).toMatchObject({
      id: "numpad-oben-mitte",
      practiceKeys: ["4", "5", "6", "7", "8", "9"],
    });
  });

  it("adds one-hand and early word exercises", () => {
    expect(
      TYPING_LESSONS.find((lesson) => lesson.id === "oben-linke-hand"),
    ).toMatchObject({
      practiceKeys: ["a", "s", "d", "f", "g", " ", "q", "w", "e", "r", "t"],
    });
    expect(
      TYPING_LESSONS.find((lesson) => lesson.id === "erste-woerter-grundreihe"),
    ).toMatchObject({ kind: "words" });
  });
});
