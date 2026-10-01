import { describe, expect, it } from "vitest";
import {
  coachSay,
  keyTarget,
  lessonKeys,
  medalFor,
  shortLessonTitle,
  starsFor,
} from "./typing-coach";

describe("typing-coach", () => {
  it("beschriftet Lektionskarten kurz und vergibt Medaillen", () => {
    expect([medalFor(99), medalFor(95), medalFor(90)]).toEqual([
      "gold",
      "silver",
      "bronze",
    ]);
    expect(shortLessonTitle("Obere Reihe: nur Zeigefinger")).toBe(
      "Nur Zeigefinger",
    );
    expect(shortLessonTitle("Wörter")).toBe("Wörter");
    expect(lessonKeys({ newKeys: ["f", "j"] })).toBe("f und j");
    expect(lessonKeys({ newKeys: ["r", "t", "z"] })).toBe("r, t und z");
    expect(lessonKeys({ newKeys: [" "] })).toBe("Leertaste");
    expect(lessonKeys({ newKeys: [] })).toBeNull();
  });

  it("nennt Taste, Finger und Umschalt für Großbuchstaben", () => {
    const upper = keyTarget("F");
    expect(upper.codes).toEqual(["KeyF", "ShiftRight"]);
    expect(upper.fingers).toEqual(["left-index", "right-pinky"]);
    expect(upper.hint?.text).toBe(
      "„F“ · linker Zeigefinger + Umschalt mit dem rechten kleinen Finger",
    );
    expect(keyTarget(" ").hint?.text).toBe("Leertaste · mit dem Daumen");
    expect(keyTarget(undefined).codes).toEqual([]);
  });

  it("vergibt Sterne nach Genauigkeit und kommentiert Fehler", () => {
    expect([starsFor(98), starsFor(92), starsFor(70)]).toEqual([3, 2, 1]);
    expect(
      coachSay({
        done: false,
        accuracy: 90,
        wrong: "g",
        wanted: "f",
        position: 3,
        combo: 0,
      }),
    ).toBe("Hoppla, das war „g“. Gesucht ist „f“.");
  });
});
