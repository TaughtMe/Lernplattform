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
  isLearningBoxCardScheduledDue,
  learningBoxDirectionAt,
  parseLearningBoxImport,
  placeLiveVocabularyCard,
  processLearningBoxResult,
  sortLearningBoxCards,
} from "./learning-box";
import {
  learningBoxEventFields,
  learningBoxProgress,
  learningBoxResultFromEvent,
  replayLearningBoxCard,
} from "./learning-box-replay";
import type { LearningEventV1 } from "./learning-bundle";

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

describe("isLearningBoxCardScheduledDue", () => {
  const DAY = 86_400_000;
  const base = createLearningBoxCard({
    deckId: "deck",
    question: "library",
    answer: "Bibliothek",
    now: 10 * DAY,
  });

  it("zählt eine fällige Vorwärtsrichtung", () => {
    expect(isLearningBoxCardScheduledDue(base, 10 * DAY)).toBe(true);
  });

  it("zählt die nie geübte Rückrichtung nicht als fällig", () => {
    const card = { ...base, nextReview: 20 * DAY, interval: 7 };
    expect(card.reverseInterval).toBe(0);
    expect(isLearningBoxCardScheduledDue(card, 10 * DAY)).toBe(false);
  });

  it("zählt eine geübte und fällige Rückrichtung", () => {
    const card = {
      ...base,
      nextReview: 20 * DAY,
      interval: 7,
      reverseInterval: 1,
      reverseNextReview: 10 * DAY,
    };
    expect(isLearningBoxCardScheduledDue(card, 10 * DAY)).toBe(true);
  });
});

describe("placeLiveVocabularyCard", () => {
  const now = 1_000_000;
  const advanced = {
    ...createLearningBoxCard({ deckId: "d", question: "a", answer: "b" }),
    box: 4 as const,
    level: 4 as const,
    interval: 1,
    nextReview: now + 5 * 86_400_000,
  };

  it("legt neue sicher gewusste Vokabeln in Box 2, morgen fällig", () => {
    expect(placeLiveVocabularyCard(undefined, "known", now)).toEqual({
      box: 2,
      level: 2,
      interval: 1,
      nextReview: now + 86_400_000,
    });
  });

  it.each(["practice", "reset", "unseen"] as const)(
    "legt neue Vokabeln mit Ergebnis %s in Box 1, sofort fällig",
    (outcome) => {
      expect(placeLiveVocabularyCard(undefined, outcome, now)).toEqual({
        box: 1,
        level: 1,
        interval: 1,
        nextReview: now,
      });
    },
  );

  it("setzt vorhandene Karten bei reset in Box 1 zurück", () => {
    expect(placeLiveVocabularyCard(advanced, "reset", now)).toEqual({
      box: 1,
      level: 1,
      interval: 1,
      nextReview: now,
    });
  });

  it("macht vorhandene Karten bei practice nur sofort fällig", () => {
    expect(placeLiveVocabularyCard(advanced, "practice", now)).toEqual({
      box: 4,
      level: 4,
      interval: 1,
      nextReview: now,
    });
  });

  it.each(["known", "unseen"] as const)(
    "lässt vorhandene Karten bei %s unverändert",
    (outcome) => {
      expect(placeLiveVocabularyCard(advanced, outcome, now)).toBeUndefined();
    },
  );
});

describe("replaying LernBox events", () => {
  const base = createLearningBoxCard({
    deckId: "deck",
    question: "library",
    answer: "Bibliothek",
    now: 1_000,
  });

  function eventFor(
    id: string,
    at: number,
    result: {
      correct: boolean;
      direction: "forward" | "reverse";
      mode: "oral" | "writing";
    },
    overrides: Partial<LearningEventV1> = {},
  ): LearningEventV1 {
    return {
      id,
      learningObjectId: base.id,
      occurredAt: new Date(at).toISOString(),
      source: "learning-box",
      learningArea: "vocabulary",
      roundId: `round-${id}`,
      ...learningBoxEventFields(result),
      ...overrides,
    };
  }

  it("returns the base card without events", () => {
    expect(replayLearningBoxCard(base, [])).toEqual(base);
  });

  it.each([
    ["forward", "writing"],
    ["forward", "oral"],
    ["reverse", "writing"],
    ["reverse", "oral"],
  ] as const)("replays one %s %s event", (direction, mode) => {
    const at = 5_000;
    const replayed = replayLearningBoxCard(base, [
      eventFor("a", at, { correct: true, direction, mode }),
    ]);
    expect(learningBoxProgress(replayed)).toEqual(
      learningBoxProgress(
        processLearningBoxResult(base, {
          correct: true,
          direction,
          mode,
          now: at,
        }),
      ),
    );
  });

  it("ignores foreign objects and sources", () => {
    const result = {
      correct: true,
      direction: "forward",
      mode: "oral",
    } as const;
    const replayed = replayLearningBoxCard(base, [
      eventFor("a", 5_000, result, { learningObjectId: "other" }),
      eventFor("b", 6_000, result, { source: "learning-word" }),
    ]);
    expect(replayed).toEqual(base);
  });

  it("orders by time and then id, whatever the input order", () => {
    const right = {
      correct: true,
      direction: "forward",
      mode: "oral",
    } as const;
    const wrong = {
      correct: false,
      direction: "forward",
      mode: "oral",
    } as const;
    const events = [
      eventFor("c", 3_000, right),
      eventFor("a", 1_500, right),
      eventFor("b", 2_000, wrong),
    ];
    const sorted = [events[1]!, events[2]!, events[0]!];
    expect(replayLearningBoxCard(base, events)).toEqual(
      replayLearningBoxCard(base, sorted),
    );
    expect(replayLearningBoxCard(base, events).box).toBe(2);

    const tieB = eventFor("b", 2_000, wrong);
    const tieA = eventFor("a", 2_000, right);
    expect(replayLearningBoxCard(base, [tieB, tieA]).box).toBe(1);
  });

  it("skips events that cannot be mapped", () => {
    const choice = eventFor(
      "a",
      5_000,
      { correct: true, direction: "forward", mode: "oral" },
      { answerMode: "choice" },
    );
    expect(learningBoxResultFromEvent(choice)).toBeUndefined();
    expect(replayLearningBoxCard(base, [choice])).toEqual(base);
  });
});
