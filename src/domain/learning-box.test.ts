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
import { LEITNER_INTERVAL_DAYS } from "./leitner-schedule";

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

describe("processLearningBoxResult: Abstände und Fälligkeit", () => {
  const DAY = 24 * 60 * 60 * 1000;
  const HOUR = 60 * 60 * 1000;
  const T0 = 1_000 * DAY;
  const fresh = createLearningBoxCard({
    deckId: "deck",
    question: "library",
    answer: "Bibliothek",
    now: T0,
  });
  type Box = 1 | 2 | 3 | 4 | 5;
  /** Karte in Vorwärtsrichtung in Box `box`, geübt und zur Zeit `due` fällig. */
  function practiced(box: Box, due: number) {
    return {
      ...fresh,
      box,
      level: box,
      interval: LEITNER_INTERVAL_DAYS[box],
      nextReview: due,
    };
  }
  const right = { correct: true, direction: "forward", mode: "oral" } as const;

  it("nutzt je Box die Abstände 1/3/7/14/30 aus dem Leitner-Plan", () => {
    const expected = { 1: 3, 2: 7, 3: 14, 4: 30, 5: 30 } as const;
    for (const box of [1, 2, 3, 4, 5] as const) {
      const card = practiced(box, T0);
      const updated = processLearningBoxResult(card, { ...right, now: T0 });
      expect(updated.interval).toBe(expected[box]);
      expect(updated.nextReview).toBe(T0 + expected[box] * DAY);
      expect(updated.box).toBe(Math.min(box + 1, 5));
      expect(updated.level).toBe(updated.box);
    }
  });

  it("hebt eine neue Karte (Abstand 0) bei richtiger Antwort in Box 2, 3 Tage", () => {
    const updated = processLearningBoxResult(fresh, { ...right, now: T0 });
    expect(updated.box).toBe(2);
    expect(updated.interval).toBe(3);
    expect(updated.nextReview).toBe(T0 + 3 * DAY);
  });

  it("bleibt in Box 5 bei 30 Tagen", () => {
    const updated = processLearningBoxResult(practiced(5, T0), {
      ...right,
      now: T0,
    });
    expect(updated.box).toBe(5);
    expect(updated.interval).toBe(30);
    expect(updated.nextReview).toBe(T0 + 30 * DAY);
  });

  it("steigt richtig vor der Fälligkeit nicht auf, Termin bleibt", () => {
    const card = practiced(3, T0 + 5 * DAY);
    const updated = processLearningBoxResult(card, {
      correct: true,
      direction: "forward",
      mode: "writing",
      now: T0,
    });
    expect(updated.box).toBe(3);
    expect(updated.level).toBe(3);
    expect(updated.interval).toBe(7);
    expect(updated.nextReview).toBe(T0 + 5 * DAY);
    expect(updated.writingStreak).toBe(1);
    expect(updated.lastReviewed).toBe(T0);
    expect(updated.updatedAt).toBe(T0);
  });

  it("setzt falsch vor der Fälligkeit auf Box 1, sofort fällig", () => {
    const updated = processLearningBoxResult(practiced(4, T0 + 10 * DAY), {
      correct: false,
      direction: "forward",
      mode: "oral",
      now: T0,
    });
    expect(updated.box).toBe(1);
    expect(updated.interval).toBe(1);
    expect(updated.nextReview).toBe(T0);
    expect(isLearningBoxCardDue(updated, "forward", T0)).toBe(true);
  });

  it("behandelt beide Richtungen unabhängig", () => {
    const card = {
      ...practiced(3, T0 + 5 * DAY),
      reverseBox: 2 as const,
      reverseInterval: 3,
      reverseNextReview: T0,
    };
    const reverse = processLearningBoxResult(card, {
      ...right,
      direction: "reverse",
      now: T0,
    });
    expect(reverse.reverseBox).toBe(3);
    expect(reverse.reverseInterval).toBe(7);
    expect(reverse.reverseNextReview).toBe(T0 + 7 * DAY);
    expect(reverse.box).toBe(3);
    expect(reverse.nextReview).toBe(T0 + 5 * DAY);

    const early = processLearningBoxResult(
      { ...card, nextReview: T0, reverseNextReview: T0 + 5 * DAY },
      { ...right, direction: "reverse", now: T0 },
    );
    expect(early.reverseBox).toBe(2);
    expect(early.reverseNextReview).toBe(T0 + 5 * DAY);
  });

  it("hebt die nie geübte Rückrichtung bei richtiger Antwort in Box 2", () => {
    const updated = processLearningBoxResult(fresh, {
      ...right,
      direction: "reverse",
      now: T0,
    });
    expect(updated.reverseBox).toBe(2);
    expect(updated.reverseInterval).toBe(3);
    expect(updated.reverseNextReview).toBe(T0 + 3 * DAY);
    expect(updated.box).toBe(1);
  });

  it("lässt bei geschaffter zweiter Chance die Box, Abstand aus der Tabelle", () => {
    const updated = processLearningBoxResult(practiced(3, T0 + 5 * DAY), {
      ...right,
      secondChance: "recovered",
      now: T0,
    });
    expect(updated.box).toBe(3);
    expect(updated.interval).toBe(7);
    expect(updated.nextReview).toBe(T0 + 7 * DAY);
  });

  it("setzt bei verfehlter zweiter Chance auf Box 1, auch wenn richtig gemeldet", () => {
    const updated = processLearningBoxResult(practiced(3, T0 + 5 * DAY), {
      ...right,
      secondChance: "failed",
      now: T0,
    });
    expect(updated.box).toBe(1);
    expect(updated.interval).toBe(1);
    expect(updated.nextReview).toBe(T0);
  });

  it.each([
    ["Abstand 1 (Puffer 4 Stunden)", 1 as Box, 4 * HOUR],
    ["Abstand 3 (Puffer 12 Stunden)", 2 as Box, 12 * HOUR],
  ])("Grenzfall am Fälligkeitspuffer: %s", (_name, box, buffer) => {
    const due = T0 + 2 * DAY;
    const card = practiced(box, due);
    const atBuffer = processLearningBoxResult(card, {
      ...right,
      now: due - buffer,
    });
    expect(atBuffer.box).toBe(box + 1);
    const beforeBuffer = processLearningBoxResult(card, {
      ...right,
      now: due - buffer - 1,
    });
    expect(beforeBuffer.box).toBe(box);
    expect(beforeBuffer.nextReview).toBe(due);
  });
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

  it("spielt eine bestehende Historie nach: Aufstieg nur einmal je Fälligkeit", () => {
    const day = 24 * 60 * 60 * 1000;
    const hour = 60 * 60 * 1000;
    const start = 1_000 * day;
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
    const card = createLearningBoxCard({
      deckId: "deck",
      question: "library",
      answer: "Bibliothek",
      now: start,
    });
    const history = (events: LearningEventV1[]) =>
      replayLearningBoxCard({ ...card, id: base.id }, events);

    // Neue Karte, am selben Tag dreimal richtig: nur ein Aufstieg.
    const sameDay = history([
      eventFor("a", start, right),
      eventFor("b", start + hour, right),
      eventFor("c", start + 2 * hour, right),
    ]);
    expect(sameDay.box).toBe(2);
    expect(sameDay.interval).toBe(3);
    expect(sameDay.nextReview).toBe(start + 3 * day);

    // Fehler am Folgetag: zurück auf Box 1, wieder fällig.
    const failed = history([
      eventFor("a", start, right),
      eventFor("b", start + hour, right),
      eventFor("c", start + 2 * hour, right),
      eventFor("d", start + day, wrong),
    ]);
    expect(failed.box).toBe(1);
    expect(failed.interval).toBe(1);
    expect(failed.nextReview).toBe(start + day);

    // Richtig nach Fälligkeit: wieder eine Box höher, 3 Tage.
    const later = history([
      eventFor("a", start, right),
      eventFor("b", start + hour, right),
      eventFor("c", start + 2 * hour, right),
      eventFor("d", start + day, wrong),
      eventFor("e", start + 2 * day, right),
      eventFor("f", start + 2 * day + hour, right),
    ]);
    expect(later.box).toBe(2);
    expect(later.interval).toBe(3);
    expect(later.nextReview).toBe(start + 5 * day);
  });
});
