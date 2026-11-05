import { describe, expect, it } from "vitest";
import {
  LEARNING_WORD_COLLECTIONS,
  getLearningWordCollection,
} from "./german-learning-content";

describe("German learning content", () => {
  it("keeps every collection addressable and tagged with a strategy", () => {
    expect(new Set(LEARNING_WORD_COLLECTIONS.map(({ id }) => id)).size).toBe(
      LEARNING_WORD_COLLECTIONS.length,
    );
    expect(
      LEARNING_WORD_COLLECTIONS.every(
        ({ strategy, words }) => Boolean(strategy) && words.length >= 100,
      ),
    ).toBe(true);
    for (const collection of LEARNING_WORD_COLLECTIONS) {
      expect(
        new Set(collection.words.map((word) => word.toLocaleLowerCase("de-DE")))
          .size,
      ).toBe(collection.words.length);
      expect(collection.words.every((word) => !word.includes("?"))).toBe(true);
    }
  });

  it("finds a collection without inventing an unknown one", () => {
    expect(getLearningWordCollection("umlaut")?.strategy).toBe("Ableiten");
    expect(getLearningWordCollection("memory-words")).toMatchObject({
      title: "Merkwörter & Fremdwörter",
      strategy: "Merkwort",
    });
    expect(getLearningWordCollection("unknown")).toBeUndefined();
  });

  it("keeps war, violence and death words out of the primary-school word boxes", () => {
    // Bewusst kleine Ausschlussliste (Befund E-005); Wortanfänge, klein geschrieben.
    const blocked = [
      "krieg",
      "kriegs",
      "waffe",
      "bombe",
      "töte",
      "tötet",
      "panzer",
      "gewehr",
      "pistole",
      "soldat",
      "schwert",
      "mord",
      "mörder",
      "leiche",
      "friedhof",
      "sterb",
      "stirb",
      "feind",
      "gespenst",
      "quäl",
      "lähm",
      "droh",
      "räuber",
      "räuberisch",
      "raub",
      "dieb",
      "grab",
    ];
    const exact = new Set(["tod", "tot", "tote", "toter", "blut", "grab"]);
    for (const collection of LEARNING_WORD_COLLECTIONS) {
      const hits = collection.words.filter((word) => {
        const lower = word.toLocaleLowerCase("de-DE");
        return (
          exact.has(lower) || blocked.some((part) => lower.startsWith(part))
        );
      });
      expect(hits, collection.id).toEqual([]);
    }
  });

  it("keeps -ng words out of the final-devoicing box", () => {
    const words = getLearningWordCollection("final-devoicing")?.words ?? [];
    expect(words.filter((word) => /ng$/iu.test(word))).toEqual([]);
  });

  it("keeps the s, ss and ß rule consistent with its box", () => {
    const box = getLearningWordCollection("s-ss-sz");
    expect(box?.detail).toContain("Summt das s");
    expect(box?.strategy).toBe("Verlängern");
    expect(box?.words).not.toContain("das");
    expect(box?.words).not.toContain("dass");
  });

  it("keeps silent-h words (se-hen, Schu-he) out of the Dehnungs-h box", () => {
    const words = getLearningWordCollection("silent-h")?.words ?? [];
    // Silbentrennendes h: zwischen zwei Vokalen oder nach Vokal am Wortende.
    const separating = words.filter((word) =>
      /[aeiouäöüy]h(?:[aeiouäöüy]|$)/iu.test(word),
    );
    expect(separating).toEqual([]);
  });

  it("hat über alle Wortboxen keine Wörter, die sich nur in der Groß-/Kleinschreibung unterscheiden", () => {
    // Sonst teilten sich z. B. „essen“ und „Essen“ einen Lernstand (G-012, C2-5).
    const spellings = new Map<string, Set<string>>();
    for (const word of LEARNING_WORD_COLLECTIONS.flatMap((c) => c.words)) {
      const key = word.normalize("NFC").toLocaleLowerCase("de-DE");
      spellings.set(key, (spellings.get(key) ?? new Set()).add(word));
    }
    const pairs = [...spellings.values()]
      .filter((variants) => variants.size > 1)
      .map((variants) => [...variants]);
    expect(pairs).toEqual([]);
  });
});
