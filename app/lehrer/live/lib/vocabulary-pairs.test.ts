import { describe, expect, it } from "vitest";
import {
  emptyVocabularyPair,
  emptyVocabularySide,
  serializeVocabularyPairs,
} from "./vocabulary-pairs";

describe("vocabulary-pairs", () => {
  it("liefert leere Seiten und Paare mit eigener Kennung", () => {
    expect(emptyVocabularySide()).toEqual({ primary: "", alternatives: [] });
    const first = emptyVocabularyPair();
    const second = emptyVocabularyPair();
    expect(first.left).toEqual(emptyVocabularySide());
    expect(first.right).toEqual(emptyVocabularySide());
    expect(first.id).not.toBe(second.id);
  });

  it("schreibt Paare mit Alternativen und Tag in Zeilen", () => {
    const pairs = [
      {
        id: "a",
        left: { primary: "dog", alternatives: ["hound"] },
        right: { primary: "Hund", alternatives: [] },
        tag: " Tiere ",
      },
      {
        id: "b",
        left: { primary: "cat", alternatives: [] },
        right: { primary: "Katze", alternatives: ["Kater", ""] },
      },
    ];
    expect(serializeVocabularyPairs(pairs)).toBe(
      "dog|hound;Hund;Tiere\ncat;Katze|Kater",
    );
  });

  it("lässt leere Seiten leer und ein leerer Tag fällt weg", () => {
    expect(
      serializeVocabularyPairs([
        { ...emptyVocabularyPair(), tag: "   " },
        emptyVocabularyPair(),
      ]),
    ).toBe(";\n;");
    expect(serializeVocabularyPairs([])).toBe("");
  });
});
