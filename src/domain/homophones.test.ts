import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LEARNING_WORD_COLLECTIONS } from "./german-learning-content";
import { HOMOPHONE_GROUPS, homophoneHint, isHomophoneOf } from "./homophones";
import { wordKey } from "./word-box";

describe("homophone groups", () => {
  it("has at least two words and a hint for each", () => {
    for (const group of HOMOPHONE_GROUPS) {
      const entries = Object.entries(group.words);
      expect(entries.length).toBeGreaterThanOrEqual(2);
      expect(entries.every(([, hint]) => hint.length > 0)).toBe(true);
    }
  });

  it("uses every word key in only one group", () => {
    const seen = new Map<string, number>();
    HOMOPHONE_GROUPS.forEach((group, index) => {
      for (const word of Object.keys(group.words)) {
        const key = wordKey(word);
        const previous = seen.get(key);
        expect(previous === undefined || previous === index).toBe(true);
        seen.set(key, index);
      }
    });
  });

  it("covers the fixed word boxes that contain a homophone", () => {
    const fixed = new Set(
      LEARNING_WORD_COLLECTIONS.flatMap((collection) =>
        collection.words.map((word) => wordKey(word)),
      ),
    );
    const mustBeCovered = [
      "Rad",
      "Feld",
      "fällt",
      "Lied",
      "Weg",
      "wieder",
      "Wahl",
      "Mahl",
      "Sohle",
      "Leib",
      "lehren",
    ];
    for (const word of mustBeCovered) {
      expect(fixed.has(wordKey(word))).toBe(true);
      expect(homophoneHint(word), word).toBeTruthy();
    }
    // Jedes Wort einer festen Wortbox, das in einer Gruppe steht, hat eine Hilfe.
    for (const group of HOMOPHONE_GROUPS) {
      for (const word of Object.keys(group.words)) {
        if (fixed.has(wordKey(word))) expect(homophoneHint(word)).toBeTruthy();
      }
    }
  });
});

describe("homophoneHint", () => {
  it("returns the meaning help", () => {
    expect(homophoneHint("Rad")).toBe("zum Fahren");
    expect(homophoneHint("Rat")).toBe("ein guter Tipp");
  });

  it("tells Weg and weg apart but still answers for other capitalisation", () => {
    expect(homophoneHint("Weg")).toBe("eine Straße oder ein Pfad");
    expect(homophoneHint("weg")).toBe("nicht mehr da");
    expect(homophoneHint("RAD")).toBe("zum Fahren");
  });

  it("has no hint for ordinary words", () => {
    expect(homophoneHint("Sonne")).toBeUndefined();
  });
});

describe("isHomophoneOf", () => {
  it("works in both directions", () => {
    expect(isHomophoneOf("Rad", "Rat")).toBe(true);
    expect(isHomophoneOf("Rat", "Rad")).toBe(true);
    expect(isHomophoneOf("Meer", "mehr")).toBe(true);
    expect(isHomophoneOf("mehr", "Meer")).toBe(true);
  });

  it("ignores capitalisation of the typed word", () => {
    expect(isHomophoneOf("Rad", "rat")).toBe(true);
  });

  it("does not treat the same word or a case slip as a homophone", () => {
    expect(isHomophoneOf("Rad", "Rad")).toBe(false);
    expect(isHomophoneOf("Weg", "weg")).toBe(false);
  });

  it("rejects unrelated and unknown words", () => {
    expect(isHomophoneOf("Rad", "Rot")).toBe(false);
    expect(isHomophoneOf("Sonne", "Sonne")).toBe(false);
    expect(isHomophoneOf("Sonne", "Rad")).toBe(false);
  });
});

describe("Prüfliste für die Lehrkraft", () => {
  it("nennt jedes Wort und jede Hilfe in docs/inhalte/wortspeicher.md", () => {
    // Prettier richtet die Tabellenspalten mit Leerzeichen aus.
    const doc = readFileSync("docs/inhalte/wortspeicher.md", "utf8").replace(
      / +/g,
      " ",
    );
    for (const group of HOMOPHONE_GROUPS) {
      for (const [word, hint] of Object.entries(group.words)) {
        expect(doc, word).toContain(`| ${word} | ${hint} |`);
      }
    }
  });
});

/** Buchstabenform ohne Umlaute, damit „wählt“ und „Wahl“ vergleichbar sind. */
function fold(text: string): string {
  return text
    .toLocaleLowerCase("de-DE")
    .replaceAll("ä", "a")
    .replaceAll("ö", "o")
    .replaceAll("ü", "u")
    .replaceAll("ß", "ss");
}

/** Wort und einfacher Wortstamm (ohne -en, -n, -e, -t, -s am Ende). */
function stemsOf(word: string): string[] {
  const full = fold(word);
  const stems = [full];
  const cut = full.replace(/(en|n|e|t|s)$/u, "");
  if (cut.length >= 3 && cut !== full) stems.push(cut);
  return stems;
}

/** Das Wort der Hilfe, das Zielwort oder dessen Wortstamm ist (sonst `undefined`). */
function revealingToken(word: string, hint: string): string | undefined {
  const stems = stemsOf(word);
  return (hint.match(/\p{L}+/gu) ?? []).find((token) => {
    const folded = fold(token);
    return stems.some(
      (stem) =>
        folded === stem || (stem.length >= 3 && folded.startsWith(stem)),
    );
  });
}

describe("Bedeutungshilfen verraten das Zielwort nicht", () => {
  it("nennt in keiner Hilfe das Zielwort oder seinen Wortstamm", () => {
    const verstoesse: string[] = [];
    for (const group of HOMOPHONE_GROUPS) {
      for (const [word, hint] of Object.entries(group.words)) {
        const token = revealingToken(word, hint);
        if (token) verstoesse.push(`${word}: „${hint}“ enthält „${token}“`);
      }
    }
    expect(verstoesse).toEqual([]);
  });

  it("erkennt Zielwort, Wortstamm und Umlautformen in einer Hilfe", () => {
    expect(revealingToken("Mal", "das erste Mal")).toBe("Mal");
    expect(revealingToken("Laib", "ein Laib Brot")).toBe("Laib");
    expect(revealingToken("Wahl", "man wählt jemanden")).toBe("wählt");
    expect(revealingToken("fällt", "von fallen")).toBe("fallen");
    expect(revealingToken("Rad", "zum Fahren")).toBeUndefined();
  });
});
