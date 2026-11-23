import { describe, expect, it } from "vitest";
import {
  END_TOKEN,
  START_TOKEN,
  SYMBOLS,
  symbolsToIds,
  tokenize,
} from "./symbols";

describe("Symboltabelle von KittenTTS", () => {
  it("hat 178 Zeichen in der Reihenfolge des Modells", () => {
    expect(SYMBOLS).toHaveLength(178);
    expect(SYMBOLS[0]).toBe("$");
    expect(SYMBOLS[END_TOKEN]).toBe("…");
    expect(SYMBOLS[16]).toBe(" ");
    expect(SYMBOLS[17]).toBe("A");
    expect(SYMBOLS[69]).toBe("ɑ");
    expect(SYMBOLS.at(-1)).toBe("ᵻ");
    expect(SYMBOLS.at(-3)).toBe("̩");
  });

  it("gibt bei doppelten Zeichen wie Python dem letzten den Vorrang", () => {
    expect(symbolsToIds('"')).toEqual([SYMBOLS.lastIndexOf('"')]);
    expect(symbolsToIds("'")).toEqual([SYMBOLS.lastIndexOf("'")]);
  });

  it("wandelt Lautschrift in IDs und lässt Unbekanntes weg", () => {
    expect(symbolsToIds("hˈaʊs")).toEqual([
      SYMBOLS.indexOf("h"),
      SYMBOLS.indexOf("ˈ"),
      SYMBOLS.indexOf("a"),
      SYMBOLS.indexOf("ʊ"),
      SYMBOLS.indexOf("s"),
    ]);
    expect(symbolsToIds("a€b")).toEqual([
      SYMBOLS.indexOf("a"),
      SYMBOLS.indexOf("b"),
    ]);
  });

  it("setzt die Rand-Token wie TextCleaner", () => {
    expect(tokenize("a")).toEqual([
      START_TOKEN,
      SYMBOLS.indexOf("a"),
      END_TOKEN,
      START_TOKEN,
    ]);
    expect(tokenize("")).toEqual([0, 10, 0]);
  });
});
