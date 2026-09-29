import { describe, expect, it } from "vitest";
import { coachSay, keyTarget, starsFor } from "./typing-coach";

describe("typing-coach", () => {
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
