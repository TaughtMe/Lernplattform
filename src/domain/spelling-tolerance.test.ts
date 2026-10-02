import { describe, expect, it } from "vitest";
import { isWithinOneEdit, toleratesSpelling } from "./spelling-tolerance";

describe("isWithinOneEdit", () => {
  it.each([
    ["Haus", "Haus", true],
    ["Hous", "Haus", true], // ein Buchstabe falsch
    ["Hau", "Haus", true], // fehlt
    ["Hauss", "Haus", true], // zusätzlich
    ["Huas", "Haus", true], // zwei benachbarte vertauscht
    ["Hsua", "Haus", false], // Abstand 2
    ["Hxxs", "Haus", false],
    ["Ha", "Haus", false], // zwei fehlen
    ["Haussss", "Haus", false],
    ["Hasu", "Haus", true],
    ["Auhs", "Haus", false],
    ["", "a", true],
  ])("%s ↔ %s → %s", (actual, expected, result) => {
    expect(isWithinOneEdit(actual, expected)).toBe(result);
  });
});

describe("toleratesSpelling", () => {
  it("lässt kurze Lösungen (höchstens 3 Zeichen) streng", () => {
    expect(toleratesSpelling("ca", "cat")).toBe(false);
    expect(toleratesSpelling("cut", "cat")).toBe(false);
    // Exakte Treffer prüft die Bewertung vorher; Toleranz gibt es hier nie.
    expect(toleratesSpelling("dog", "dog")).toBe(false);
  });

  it("toleriert ab 4 Zeichen genau einen Fehler", () => {
    expect(toleratesSpelling("hous", "house")).toBe(true);
    expect(toleratesSpelling("hose", "house")).toBe(true);
    expect(toleratesSpelling("hoas", "house")).toBe(false);
  });
});
