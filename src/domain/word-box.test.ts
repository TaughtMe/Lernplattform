import { describe, expect, it } from "vitest";
import { LEARNING_WORD_COLLECTIONS } from "./german-learning-content";
import {
  WORD_BOX_LIMITS,
  addWords,
  allWordBoxViews,
  copyCollection,
  removeWord,
  renameWord,
  wordBoxSchema,
  wordKey,
  type WordBox,
} from "./word-box";

const NOW = "2026-10-09T08:00:00.000Z";
const LATER = "2026-10-09T09:00:00.000Z";
const uuid = (n: number) =>
  `eigen-${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;

function box(words: string[] = [], overrides: Partial<WordBox> = {}): WordBox {
  return {
    id: uuid(1),
    kind: "eigen",
    title: "Meine Wörter",
    words: words.map((text) => ({ text, addedAt: NOW, source: "eigen" })),
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe("wordKey", () => {
  it("normalises case, whitespace and unicode form", () => {
    expect(wordKey("  Straße ")).toBe("straße");
    expect(wordKey("Ä".normalize("NFD"))).toBe("ä");
  });
});

describe("wordBoxSchema", () => {
  it("accepts own and lesson boxes and rejects other ids", () => {
    expect(wordBoxSchema.safeParse(box(["Sonne"])).success).toBe(true);
    expect(
      wordBoxSchema.safeParse(box([], { id: "unterricht", kind: "unterricht" }))
        .success,
    ).toBe(true);
    expect(
      wordBoxSchema.safeParse(box([], { id: "double-consonants" })).success,
    ).toBe(false);
  });

  it("rejects mismatched id and kind", () => {
    expect(
      wordBoxSchema.safeParse(box([], { id: "unterricht", kind: "eigen" }))
        .success,
    ).toBe(false);
    expect(
      wordBoxSchema.safeParse(box([], { kind: "unterricht" })).success,
    ).toBe(false);
  });

  it("rejects markup and control characters in words", () => {
    expect(wordBoxSchema.safeParse(box(["<b>"])).success).toBe(false);
    expect(wordBoxSchema.safeParse(box(["a\u0007b"])).success).toBe(false);
  });

  it("limits titles and word counts", () => {
    expect(
      wordBoxSchema.safeParse(box([], { title: "x".repeat(61) })).success,
    ).toBe(false);
    const many = Array.from({ length: 501 }, (_, i) => `Wort${i}`);
    expect(wordBoxSchema.safeParse(box(many)).success).toBe(false);
  });
});

describe("addWords", () => {
  it("adds new words and merges duplicates without asking", () => {
    const result = addWords(
      box(["Sonne"]),
      ["sonne", "Mond", "MOND", " Stern "],
      "eigen",
      LATER,
    );
    expect(result.added).toEqual(["Mond", "Stern"]);
    expect(result.skipped).toEqual([]);
    expect(result.box.words.map((w) => w.text)).toEqual([
      "Sonne",
      "Mond",
      "Stern",
    ]);
    expect(result.box.updatedAt).toBe(LATER);
  });

  it("leaves the box untouched when nothing is new", () => {
    const original = box(["Sonne"]);
    const result = addWords(original, ["Sonne"], "eigen", LATER);
    expect(result.box).toBe(original);
  });

  it("reports invalid words as skipped", () => {
    const result = addWords(
      box(),
      ["gut", "<b>", "x".repeat(61), ""],
      "eigen",
      NOW,
    );
    expect(result.added).toEqual(["gut"]);
    expect(result.skipped).toEqual(["<b>", "x".repeat(61), ""]);
  });

  it("stops at the limit of 500 words and reports the rest", () => {
    const full = box(Array.from({ length: 499 }, (_, i) => `Wort${i}`));
    const result = addWords(full, ["Neu1", "Neu2"], "laufdiktat", NOW);
    expect(result.added).toEqual(["Neu1"]);
    expect(result.skipped).toEqual(["Neu2"]);
    expect(result.box.words).toHaveLength(WORD_BOX_LIMITS.wordsPerBox);
    expect(result.box.words.at(-1)?.source).toBe("laufdiktat");
  });
});

describe("renameWord", () => {
  it("changes a word in place", () => {
    const result = renameWord(box(["Sone", "Mond"]), "Sone", "Sonne", LATER);
    expect(result.words.map((w) => w.text)).toEqual(["Sonne", "Mond"]);
    expect(result.updatedAt).toBe(LATER);
  });

  it("merges when the new word already exists", () => {
    const result = renameWord(box(["Sone", "Sonne"]), "Sone", "sonne", LATER);
    expect(result.words.map((w) => w.text)).toEqual(["Sonne"]);
  });

  it("allows a pure case change", () => {
    const result = renameWord(box(["sonne"]), "sonne", "Sonne", LATER);
    expect(result.words.map((w) => w.text)).toEqual(["Sonne"]);
  });

  it("ignores unknown and unchanged words and rejects invalid ones", () => {
    const original = box(["Sonne"]);
    expect(renameWord(original, "Mond", "Stern", LATER)).toBe(original);
    expect(renameWord(original, "Sonne", "Sonne", LATER)).toBe(original);
    expect(() => renameWord(original, "Sonne", "<b>", LATER)).toThrow();
  });
});

describe("removeWord", () => {
  it("removes a word regardless of case", () => {
    const result = removeWord(box(["Sonne", "Mond"]), "SONNE", LATER);
    expect(result.words.map((w) => w.text)).toEqual(["Mond"]);
  });

  it("returns the same box for an unknown word", () => {
    const original = box(["Sonne"]);
    expect(removeWord(original, "Mond", LATER)).toBe(original);
  });
});

describe("copyCollection", () => {
  it("copies all words of a fixed collection into an own box", () => {
    const collection = LEARNING_WORD_COLLECTIONS[0]!;
    const copy = copyCollection(collection, uuid(2), NOW);
    expect(copy.title).toBe(`${collection.title} (Kopie)`);
    expect(copy.kind).toBe("eigen");
    expect(copy.words.map((w) => w.text)).toEqual([...collection.words]);
    expect(copy.words.every((w) => w.source === "kopie")).toBe(true);
    expect(wordBoxSchema.safeParse(copy).success).toBe(true);
  });

  it("keeps the title within the limit", () => {
    const copy = copyCollection(
      { ...LEARNING_WORD_COLLECTIONS[0]!, title: "T".repeat(60) },
      uuid(2),
      NOW,
    );
    expect(copy.title).toHaveLength(60);
    expect(copy.title.endsWith(" (Kopie)")).toBe(true);
  });

  it("fits every fixed collection into the word limit", () => {
    for (const collection of LEARNING_WORD_COLLECTIONS) {
      expect(collection.words.length).toBeLessThanOrEqual(
        WORD_BOX_LIMITS.wordsPerBox,
      );
      expect(copyCollection(collection, uuid(3), NOW).words.length).toBe(
        collection.words.length,
      );
    }
  });
});

describe("allWordBoxViews", () => {
  it("orders lesson box, own boxes by recency, then fixed boxes", () => {
    const older = box(["A"], { id: uuid(1), title: "Alt", updatedAt: NOW });
    const newer = box(["B"], { id: uuid(2), title: "Neu", updatedAt: LATER });
    const lesson = box(["C"], {
      id: "unterricht",
      kind: "unterricht",
      title: "Aus dem Unterricht",
    });
    const views = allWordBoxViews(
      [older, newer, lesson],
      LEARNING_WORD_COLLECTIONS,
    );
    expect(views.slice(0, 3).map((v) => v.title)).toEqual([
      "Aus dem Unterricht",
      "Neu",
      "Alt",
    ]);
    expect(views.slice(3).map((v) => v.id)).toEqual(
      LEARNING_WORD_COLLECTIONS.map((c) => c.id),
    );
    expect(views[0]).toMatchObject({ kind: "unterricht", editable: true });
    expect(views[1]).toMatchObject({ kind: "eigen", editable: true });
    expect(views[3]).toMatchObject({ kind: "fest", editable: false });
    expect(views[3]!.strategy).toBeDefined();
  });

  it("works without own boxes", () => {
    expect(allWordBoxViews([], LEARNING_WORD_COLLECTIONS)).toHaveLength(
      LEARNING_WORD_COLLECTIONS.length,
    );
  });
});
