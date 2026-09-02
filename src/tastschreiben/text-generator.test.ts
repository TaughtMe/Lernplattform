import { describe, expect, it } from "vitest";
import { TYPING_LESSONS } from "./curriculum";
import { generateTypingPracticeText } from "./text-generator";

function lesson(id: string) {
  return TYPING_LESSONS.find((item) => item.id === id)!;
}

describe("typing practice text", () => {
  it("keeps isolated finger lessons inside their exact key scope", () => {
    const text = generateTypingPracticeText(
      lesson("grundstellung-mittelfinger"),
      "middle-finger",
    );

    expect(text).toMatch(/^[dk ]+$/);
    expect(text).not.toMatch(/[fj]/);
  });

  it("uses all intended keys in combination lessons without older extras", () => {
    const text = generateTypingPracticeText(
      lesson("grundstellung-zeige-mittel"),
      "combined-fingers",
    );

    expect(text).toMatch(/^[fjdk ]+$/);
    expect(text).not.toMatch(/[aslögh]/);
  });

  it("uses the restricted word pool for early word lessons", () => {
    const earlyLesson = lesson("erste-woerter-grundreihe");
    const text = generateTypingPracticeText(earlyLesson, "early-words");
    const allowedWords = new Set(earlyLesson.wordPool);

    expect(text.split(" ").every((word) => allowedWords.has(word))).toBe(true);
  });
});
