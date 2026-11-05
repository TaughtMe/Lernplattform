import { describe, expect, it } from "vitest";
import {
  FIRST_WRONG_ANSWER_MAX_LENGTH,
  rememberFirstWrongAnswer,
  shortenWrongAnswer,
} from "./first-wrong-answers";

describe("erste falsche Antwort", () => {
  it("kürzt auf 32 Zeichen, ohne Surrogatpaare zu zerreißen", () => {
    expect(FIRST_WRONG_ANSWER_MAX_LENGTH).toBe(32);
    expect(shortenWrongAnswer("9".repeat(40))).toBe("9".repeat(32));
    const emoji = shortenWrongAnswer("😀".repeat(40));
    expect([...emoji]).toHaveLength(32);
    expect(() => JSON.parse(JSON.stringify(emoji))).not.toThrow();
  });

  it("entfernt Steuerzeichen und Leerraum am Rand", () => {
    expect(shortenWrongAnswer("  4\u00008\n ")).toBe("48");
    expect(shortenWrongAnswer("\u0000\t")).toBe("");
  });

  it("merkt nur die erste Antwort je Aufgabe", () => {
    const first = rememberFirstWrongAnswer({}, "7 · 8", "54");
    expect(first).toEqual({ "7 · 8": "54" });
    expect(rememberFirstWrongAnswer(first, "7 · 8", "55")).toBe(first);
    expect(rememberFirstWrongAnswer(first, "2 + 3", "6")).toEqual({
      "7 · 8": "54",
      "2 + 3": "6",
    });
  });

  it("merkt nichts bei leerer Antwort oder leerem Schlüssel", () => {
    const empty = {};
    expect(rememberFirstWrongAnswer(empty, "7 · 8", "  ")).toBe(empty);
    expect(rememberFirstWrongAnswer(empty, "", "54")).toBe(empty);
  });
});
