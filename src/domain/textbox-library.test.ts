import { describe, expect, it } from "vitest";
import { tokenizeText } from "./text-compare";
import { TEXTBOX_TEXTS, getTextboxText } from "./textbox-library";
import {
  TEXTBOX_WORD_COUNT_RANGES,
  countWords,
  textboxTextSchema,
  type TextboxPhenomenon,
} from "./textbox-text";

/**
 * Grobe Prüfung, ob ein Zielwort ein echtes Beispiel für den Schwerpunkt ist.
 * Das ist eine Plausibilitätsprüfung; die fachliche Prüfung macht die Lehrkraft.
 */
const BEISPIELE: Record<
  Exclude<TextboxPhenomenon, "gemischt">,
  (word: string) => boolean
> = {
  doppelkonsonanten: (w) => /([bdfgklmnprstz])\1/i.test(w),
  "dehnungs-h": (w) => /[aeiouäöü]h(?:[lmnr]|$)/i.test(w),
  ie: (w) => /ie/i.test(w) && !/^reptilien/i.test(w),
  "s-ss-sz": (w) => /ß|ss/i.test(w),
  "gross-klein": (w) => /^\p{Lu}/u.test(w),
  auslautverhaertung: (w) => /[bdg]$/i.test(w) && !/ig$/i.test(w),
  vokallaenge: (w) =>
    /aa|ee|oo|ie|[aeiouäöü]h(?:[lmnr]|$)|([bdfgklmnprstz])\1/i.test(w),
  wortbausteine: (w) =>
    /^(ver|vor|er|be|ent|zer|ge|ab|un)\p{L}{3,}/iu.test(w) ||
    /\p{L}{3,}(ung|heit|keit|lich|nis|schaft|los|bar)$/iu.test(w),
  zusammensetzungen: (w) => /^\p{Lu}/u.test(w) && w.length >= 8,
};

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
      expect(share).toBeGreaterThanOrEqual(0.1);
      expect(share).toBeLessThanOrEqual(0.25);

      // Zielwörter sind echte Beispiele für einen Schwerpunkt des Textes.
      const focus = text.phenomena.filter((p) => p !== "gemischt");
      expect(focus.length).toBeGreaterThan(0);
      if (text.phenomena.includes("gemischt")) {
        expect(focus.length).toBeGreaterThanOrEqual(2);
      }
      for (const target of text.targetWords) {
        expect(
          focus.some((phenomenon) => BEISPIELE[phenomenon](target)),
          `„${target}“ passt zu keinem Schwerpunkt von ${text.id}`,
        ).toBe(true);
      }
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
