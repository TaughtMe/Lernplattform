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
    // Entscheidung vom 12.11.2026: zwei Schritte, keine Probe „summt das s?“
    // (in süddeutscher Aussprache gibt es kein stimmhaftes s, Bericht 20, F6).
    expect(box?.detail).toContain("Schritt 1");
    expect(box?.detail).toContain("ss (Wasser");
    expect(box?.detail).toContain("Fuß – Füße, Gras – Gräser");
    expect(box?.detail).not.toMatch(/summ|stimmhaft/iu);
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

  it("führt ie nicht als Merken und hält Ferien aus dem langen i (Bericht 20, F1, F2)", () => {
    const box = getLearningWordCollection("long-i");
    expect(box?.strategy).not.toBe("Merken");
    expect(box?.detail).toContain("ie");
    expect(box?.words).not.toContain("Ferien");
    expect(getLearningWordCollection("memory-words")?.words).toContain(
      "Ferien",
    );
  });

  it("enthält keine untauglichen Beispielwörter mehr (Bericht 20, F4)", () => {
    const removed: Record<string, readonly string[]> = {
      "final-devoicing": ["Club", "Job", "Zugweg"],
      "long-i": ["Zieltür"],
      "silent-h": ["Fehlwort"],
      "ck-tz": ["Becker"],
    };
    for (const [id, words] of Object.entries(removed)) {
      const box = getLearningWordCollection(id)?.words ?? [];
      for (const word of words)
        expect(box, `${id}: ${word}`).not.toContain(word);
    }
  });

  it("führt in der Ableiten-Box nur Wörter mit verwandtem a/au (Bericht 20, F5)", () => {
    const notDerivable = [
      "Mädchen",
      "Märchen",
      "Käfer",
      "Käfig",
      "Säge",
      "spät",
      "später",
      "zäh",
      "gähnen",
    ];
    const umlaut = getLearningWordCollection("umlaut")?.words ?? [];
    const memory = getLearningWordCollection("memory-words")?.words ?? [];
    for (const word of notDerivable) {
      expect(umlaut, word).not.toContain(word);
    }
    // Sie bleiben als Merkwörter erhalten (ohne „später“, das zu „spät“ gehört).
    for (const word of notDerivable.filter((entry) => entry !== "später")) {
      expect(memory, word).toContain(word);
    }
  });
});
