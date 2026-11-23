import { describe, expect, it } from "vitest";
import {
  chunkText,
  ensureClosingPunctuation,
  phonemizeWithPunctuation,
  spaceTokens,
  splitPunctuation,
  stripLanguageFlags,
} from "./text";

describe("chunkText", () => {
  it("teilt in Sätze und ergänzt ein Komma ohne Satzende", () => {
    expect(chunkText("Das Haus ist groß. Wo ist der Hund?")).toEqual([
      "Das Haus ist groß,",
      "Wo ist der Hund,",
    ]);
    expect(chunkText("Rad")).toEqual(["Rad,"]);
    expect(chunkText("  ")).toEqual([]);
  });

  it("teilt lange Sätze an Wortgrenzen", () => {
    const chunks = chunkText("eins zwei drei vier fünf", 10);
    expect(chunks).toEqual(["eins zwei,", "drei vier,", "fünf,"]);
    for (const chunk of chunks) expect(chunk.length).toBeLessThanOrEqual(11);
  });

  it("behält ein vorhandenes Satzzeichen", () => {
    expect(ensureClosingPunctuation("Hallo;")).toBe("Hallo;");
    expect(ensureClosingPunctuation(" Hallo ")).toBe("Hallo,");
  });
});

describe("Satzzeichen und Lautschrift", () => {
  it("zerlegt in Wortteile und Satzzeichen", () => {
    expect(splitPunctuation("Ja, nein!")).toEqual([
      { punctuation: false, text: "Ja" },
      { punctuation: true, text: ", " },
      { punctuation: false, text: "nein" },
      { punctuation: true, text: "!" },
    ]);
  });

  it("entfernt Sprachwechsel-Marken von eSpeak", () => {
    expect(stripLanguageFlags("(en)hˈɛloʊ(de) vˈɛlt")).toBe("hˈɛloʊ vˈɛlt");
  });

  it("trennt Wörter und Satzzeichen wie Pythons \\w", () => {
    expect(spaceTokens("dˈiː ʃtɾˈɑːsə, das")).toBe("dˈiː ʃtɾˈɑːsə , das");
  });

  it("phonemisiert nur Wortteile und setzt Satzzeichen wieder ein", () => {
    const seen: string[] = [];
    const result = phonemizeWithPunctuation("Rad, Sonne!", (words) => {
      seen.push(words);
      return words === "Rad" ? "rˈɑːt" : "zˈɔnə";
    });
    expect(seen).toEqual(["Rad", "Sonne"]);
    expect(result).toBe("rˈɑːt , zˈɔnə !");
  });
});
