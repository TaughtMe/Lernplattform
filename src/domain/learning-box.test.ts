import { describe, expect, it, vi } from "vitest";
import {
  createLearningBoxCard,
  createLearningBoxDeck,
  createLearningBoxFolder,
  editLearningBoxCard,
  evaluateLearningBoxAnswer,
  filterLearningBoxCards,
  isLearningBoxCardDue,
  isLearningBoxCardDueFor,
  learningBoxDirectionAt,
  parseLearningBoxImport,
  processLearningBoxResult,
  sortLearningBoxCards,
} from "./learning-box";

vi.stubGlobal("crypto", { randomUUID: () => "fixed-id" });

describe("integrated learning box domain", () => {
  it("keeps both learning directions independent", () => {
    const card = createLearningBoxCard({
      deckId: "deck",
      question: "library",
      answer: "Bibliothek",
      now: 1_000,
    });
    const updated = processLearningBoxResult(card, {
      correct: true,
      direction: "reverse",
      mode: "writing",
      now: 2_000,
    });

    expect(updated.box).toBe(1);
    expect(updated.reverseBox).toBe(2);
    expect(updated.reverseWritingStreak).toBe(1);
  });

  it("uses the original LernBox interval and answer rules", () => {
    const card = createLearningBoxCard({
      deckId: "deck",
      question: "library",
      answer: "Bibliothek",
      now: 1_000,
    });
    expect(evaluateLearningBoxAnswer(card, " bibliothek ", "forward")).toEqual({
      accepted: true,
      expectedAnswer: "Bibliothek",
    });
    expect(isLearningBoxCardDue(card, "forward", 1_000)).toBe(true);
    expect(evaluateLearningBoxAnswer(card, "library", "reverse")).toEqual({
      accepted: true,
      expectedAnswer: "library",
    });
    expect(
      isLearningBoxCardDue(
        { ...card, interval: 2, nextReview: 20 * 60 * 60 * 1_000 },
        "forward",
        1_000,
      ),
    ).toBe(false);
  });

  it("keeps the level after a recovered second chance and resets after a failed one", () => {
    const card = {
      ...createLearningBoxCard({
        deckId: "deck",
        question: "library",
        answer: "Bibliothek",
        now: 100,
      }),
      box: 3 as const,
      level: 3 as const,
    };
    const recovered = processLearningBoxResult(card, {
      correct: true,
      direction: "forward",
      mode: "writing",
      secondChance: "recovered",
      now: 200,
    });
    const failed = processLearningBoxResult(card, {
      correct: false,
      direction: "forward",
      mode: "writing",
      secondChance: "failed",
      now: 200,
    });
    expect(recovered.box).toBe(3);
    expect(recovered.writingStreak).toBe(0);
    expect(failed.box).toBe(1);
  });
});

describe("LernBox extensions", () => {
  const card = (question: string, answer: string, extra = {}) => ({
    ...createLearningBoxCard({ deckId: "d", question, answer }),
    ...extra,
  });

  it("accepts every alternative separated by |", () => {
    const house = card("Haus", "home | house");
    expect(evaluateLearningBoxAnswer(house, "House", "forward").accepted).toBe(
      true,
    );
    expect(evaluateLearningBoxAnswer(house, "home", "forward").accepted).toBe(
      true,
    );
    expect(evaluateLearningBoxAnswer(house, "", "forward").accepted).toBe(
      false,
    );
    expect(evaluateLearningBoxAnswer(house, "flat", "forward").accepted).toBe(
      false,
    );
  });

  it("alternates directions in mixed rounds", () => {
    expect(
      [0, 1, 2].map((index) => learningBoxDirectionAt("mixed", index)),
    ).toEqual(["forward", "reverse", "forward"]);
    expect(learningBoxDirectionAt("reverse", 0)).toBe("reverse");
    const now = Date.now();
    const onlyReverseDue = card("a", "b", {
      nextReview: now + 86_400_000 * 3,
      interval: 3,
      reverseNextReview: now,
    });
    expect(isLearningBoxCardDueFor(onlyReverseDue, "forward", now)).toBe(false);
    expect(isLearningBoxCardDueFor(onlyReverseDue, "mixed", now)).toBe(true);
  });

  it("parses mass imports from spreadsheets and semicolon lists", () => {
    expect(
      parseLearningBoxImport(
        "Haus\thome | house\tUnit 1\r\nBaum;tree\n\nkaputt\nSonne ; sun ; ",
      ),
    ).toEqual({
      rows: [
        { question: "Haus", answer: "home | house", tag: "Unit 1" },
        { question: "Baum", answer: "tree" },
        { question: "Sonne", answer: "sun" },
      ],
      skipped: [4],
    });
  });

  it("sorts, searches and edits cards without losing progress", () => {
    const cards = [
      card("Zebra", "zebra", { box: 3, tag: "Tiere", createdAt: 1 }),
      card("Apfel", "apple", { box: 1, createdAt: 3 }),
      card("Baum", "tree", { box: 2, tag: "Natur", createdAt: 2 }),
    ];
    const names = (list: typeof cards) => list.map((entry) => entry.question);
    expect(names(sortLearningBoxCards(cards, "alphabet"))).toEqual([
      "Apfel",
      "Baum",
      "Zebra",
    ]);
    expect(names(sortLearningBoxCards(cards, "box"))).toEqual([
      "Apfel",
      "Baum",
      "Zebra",
    ]);
    expect(names(sortLearningBoxCards(cards, "tag"))).toEqual([
      "Baum",
      "Zebra",
      "Apfel",
    ]);
    expect(names(sortLearningBoxCards(cards, "date"))).toEqual([
      "Apfel",
      "Baum",
      "Zebra",
    ]);
    expect(names(filterLearningBoxCards(cards, "TRE"))).toEqual(["Baum"]);
    expect(names(filterLearningBoxCards(cards, "tiere"))).toEqual(["Zebra"]);
    expect(filterLearningBoxCards(cards, " ")).toHaveLength(3);

    const edited = editLearningBoxCard(cards[0]!, {
      question: " Zebra ",
      answer: "zebra | zebras",
      tag: null,
    });
    expect(edited).toMatchObject({ question: "Zebra", box: 3 });
    expect(edited.tag).toBeUndefined();
    expect(edited.fingerprint).not.toBe(cards[0]!.fingerprint);
  });

  it("creates folders and decks inside folders", () => {
    const folder = createLearningBoxFolder({ title: " Buch Klasse 5 " });
    expect(folder.title).toBe("Buch Klasse 5");
    expect(
      createLearningBoxDeck({ title: "Unit 1", folderId: folder.id }).folderId,
    ).toBe(folder.id);
    expect(createLearningBoxDeck({ title: "Lose" })).not.toHaveProperty(
      "folderId",
    );
  });
});
