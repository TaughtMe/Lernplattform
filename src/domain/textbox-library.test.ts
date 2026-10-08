import { describe, expect, it } from "vitest";
import { tokenizeText } from "./text-compare";
import { TEXTBOX_TEXTS, getTextboxText } from "./textbox-library";
import {
  TEXTBOX_WORD_COUNT_RANGES,
  countWords,
  textboxTextSchema,
} from "./textbox-text";

describe("Textbibliothek", () => {
  it("hat eindeutige, fortlaufende Ids und 5 Texte je Schwierigkeit (Welle 1)", () => {
    TEXTBOX_TEXTS.forEach((text, index) => {
      expect(text.id).toBe(`TXT-${String(index + 1).padStart(3, "0")}`);
    });
    expect(new Set(TEXTBOX_TEXTS.map((t) => t.id)).size).toBe(
      TEXTBOX_TEXTS.length,
    );
    expect(TEXTBOX_TEXTS).toHaveLength(15);
    for (const difficulty of ["leicht", "mittel", "schwer"] as const) {
      expect(
        TEXTBOX_TEXTS.filter((t) => t.difficulty === difficulty),
      ).toHaveLength(5);
    }
  });

  it.each(TEXTBOX_TEXTS.map((t) => [t.id, t] as const))(
    "%s erfüllt die Regeln aus Plan 1.8",
    (_id, text) => {
      expect(textboxTextSchema.safeParse(text).success).toBe(true);
      const words = tokenizeText(text.text)
        .filter((t) => t.kind === "word")
        .map((t) => t.text);
      const range = TEXTBOX_WORD_COUNT_RANGES[text.difficulty];
      expect(words.length).toBe(countWords(text.text));
      expect(words.length).toBeGreaterThanOrEqual(range.min);
      expect(words.length).toBeLessThanOrEqual(range.max);
      for (const target of text.targetWords) {
        expect(words, `Zielwort „${target}“`).toContain(target);
      }
      expect(new Set(text.targetWords).size).toBe(text.targetWords.length);
      const targets = new Set(text.targetWords);
      const share = words.filter((w) => targets.has(w)).length / words.length;
      expect(share).toBeGreaterThanOrEqual(0.15);
      expect(share).toBeLessThanOrEqual(0.25);
    },
  );

  it("deckt mehrere Schwerpunkte und Textarten ab", () => {
    expect(
      new Set(TEXTBOX_TEXTS.flatMap((t) => t.phenomena)).size,
    ).toBeGreaterThanOrEqual(7);
    expect(new Set(TEXTBOX_TEXTS.map((t) => t.genre)).size).toBe(5);
  });

  it("findet Texte über die Id", () => {
    expect(getTextboxText("TXT-001")?.title).toBe("Der kleine Hund");
    expect(getTextboxText("TXT-999")).toBeUndefined();
  });
});
