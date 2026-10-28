import fc from "fast-check";
import { describe, expect, it, vi } from "vitest";
import {
  createLearningBoxCard,
  createLearningBoxDeck,
  createLearningBoxFolder,
  editLearningBoxCard,
  effectiveLearningBoxLevel,
  evaluateLearningBoxAnswer,
  filterLearningBoxCards,
  getLearningBoxLastReviewed,
  isFirstLearningBoxAttempt,
  isLearningBoxCardDue,
  isLearningBoxCardDueFor,
  isLearningBoxCardLongUnpracticed,
  isLearningBoxCardScheduledDue,
  isLearningBoxDirectionNew,
  isLearningBoxLongUnpracticed,
  LEARNING_BOX_RECOVERY_GAP_HOURS,
  LEARNING_BOX_SELF_CHECK_MAX_BOX,
  learningBoxAttemptKey,
  learningBoxDeckStatus,
  learningBoxDirectionAt,
  parseLearningBoxImport,
  placeLiveVocabularyCard,
  processLearningBoxResult,
  sortLearningBoxCards,
  type LearningBoxCard,
} from "./learning-box";
import {
  learningBoxEventFields,
  learningBoxProgress,
  learningBoxResultFromEvent,
  replayLearningBoxCard,
} from "./learning-box-replay";
import type { LearningEventV1 } from "./learning-bundle";
import { LEITNER_INTERVAL_DAYS } from "./leitner-schedule";
import { REPETITION_RULES } from "./spaced-repetition";
import {
  REPETITION_RULE_TABLE,
  type RuleTableModule,
} from "./testing/repetition-rule-table";

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

  it("zählt eine neue, nie geübte Karte nicht als fällig", () => {
    expect(base.interval).toBe(0);
    expect(isLearningBoxCardScheduledDue(base, 10 * DAY)).toBe(false);
  });

  it("zählt eine geübte und fällige Vorwärtsrichtung", () => {
    expect(
      isLearningBoxCardScheduledDue({ ...base, interval: 1 }, 10 * DAY),
    ).toBe(true);
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
      // G-011: Die Platzierung zählt als Abruf der Vorwärtsrichtung.
      forwardLastReviewed: now,
      lastReviewed: now,
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
        forwardLastReviewed: now,
        lastReviewed: now,
      });
    },
  );

  it("setzt vorhandene Karten bei reset in Box 1 zurück", () => {
    expect(placeLiveVocabularyCard(advanced, "reset", now)).toEqual({
      box: 1,
      level: 1,
      interval: 1,
      nextReview: now,
      forwardLastReviewed: now,
      lastReviewed: now,
      // Die Rückrichtung behält ihre bisherige Lesart (alter `lastReviewed`).
      reverseLastReviewed: advanced.lastReviewed,
    });
  });

  it("macht vorhandene Karten bei practice nur sofort fällig", () => {
    expect(placeLiveVocabularyCard(advanced, "practice", now)).toEqual({
      box: 4,
      level: 4,
      interval: 1,
      nextReview: now,
      forwardLastReviewed: now,
      lastReviewed: now,
      reverseLastReviewed: advanced.lastReviewed,
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
      // Zuletzt geübt genau einen Abstand vor dem Termin.
      lastReviewed: due - LEITNER_INTERVAL_DAYS[box] * DAY,
    };
  }
  const right = { correct: true, direction: "forward", mode: "oral" } as const;

  it("schließt einen Fehler bei sofortiger Verbesserung ohne Aufstieg", () => {
    const wrong = processLearningBoxResult(practiced(3, T0), {
      ...right,
      correct: false,
      now: T0,
    });
    expect(wrong.box).toBe(1);
    expect(wrong.nextReview).toBe(T0);
    // Eine Stunde später über „Meine Fehler“ richtig: Box 1, morgen wieder.
    const soon = processLearningBoxResult(wrong, {
      ...right,
      now: T0 + HOUR,
    });
    expect(soon.box).toBe(1);
    expect(soon.interval).toBe(1);
    expect(soon.nextReview).toBe(T0 + HOUR + DAY);
    // Am nächsten Tag selbstständig richtig: jetzt erst Box 2.
    const later = processLearningBoxResult(soon, {
      ...right,
      now: T0 + HOUR + DAY,
    });
    expect(later.box).toBe(2);
    expect(later.interval).toBe(3);
  });

  it("steigt nach einem Fehler auf, wenn der Abstand zum letzten Abruf reicht", () => {
    const wrong = processLearningBoxResult(practiced(2, T0), {
      ...right,
      correct: false,
      now: T0,
    });
    const gapEdge = T0 + LEARNING_BOX_RECOVERY_GAP_HOURS * HOUR;
    expect(
      processLearningBoxResult(wrong, { ...right, now: gapEdge - 1 }).box,
    ).toBe(1);
    expect(
      processLearningBoxResult(wrong, { ...right, now: gapEdge }).box,
    ).toBe(2);
  });

  it("nutzt je Box die Abstände 1/3/7/14/30 aus dem Leitner-Plan", () => {
    const expected = { 1: 3, 2: 7, 3: 14, 4: 30, 5: 30 } as const;
    for (const box of [1, 2, 3, 4, 5] as const) {
      const card = practiced(box, T0);
      // Schriftlich: Selbsteinschätzung (oral) hebt nur bis Box 3 (D-010).
      const updated = processLearningBoxResult(card, {
        ...right,
        mode: "writing",
        now: T0,
      });
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

describe("Abrufzeitpunkt je Richtung (G-005, G-011)", () => {
  const MINUTE = 60 * 1000;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;
  const T0 = Date.UTC(2026, 9, 18, 9);
  const fresh = createLearningBoxCard({
    deckId: "deck",
    question: "library",
    answer: "Bibliothek",
    now: T0 - 30 * DAY,
  });
  const write = (
    direction: "forward" | "reverse",
    correct: boolean,
    now: number,
  ) => ({ correct, direction, mode: "writing" as const, now });

  it("liest ohne Richtungsfeld den letzten Abruf irgendeiner Richtung", () => {
    const card = { ...fresh, lastReviewed: 5_000 };
    expect(getLearningBoxLastReviewed(card, "forward")).toBe(5_000);
    expect(getLearningBoxLastReviewed(card, "reverse")).toBe(5_000);
    const withForward = { ...card, forwardLastReviewed: 7_000 };
    expect(getLearningBoxLastReviewed(withForward, "forward")).toBe(7_000);
    expect(getLearningBoxLastReviewed(withForward, "reverse")).toBe(5_000);
  });

  it("setzt Richtungsfeld und lastReviewed; die andere Richtung behält ihre Lesart", () => {
    const card = { ...fresh, lastReviewed: T0 - 2 * DAY };
    const forward = processLearningBoxResult(card, write("forward", true, T0));
    expect(forward.forwardLastReviewed).toBe(T0);
    expect(forward.lastReviewed).toBe(T0);
    expect(getLearningBoxLastReviewed(forward, "reverse")).toBe(T0 - 2 * DAY);
    const reverse = processLearningBoxResult(
      forward,
      write("reverse", true, T0 + HOUR),
    );
    expect(reverse.reverseLastReviewed).toBe(T0 + HOUR);
    expect(reverse.forwardLastReviewed).toBe(T0);
    expect(reverse.lastReviewed).toBe(T0 + HOUR);
  });

  it("G-005: Beide Richtungen am 18.10. falsch, am 20.10. vorwärts, eine Minute später rückwärts richtig → beide Box 2", () => {
    let card = processLearningBoxResult(fresh, write("forward", false, T0));
    card = processLearningBoxResult(card, write("reverse", false, T0 + MINUTE));
    const day20 = T0 + 2 * DAY;
    card = processLearningBoxResult(card, write("forward", true, day20));
    expect(card.box).toBe(2);
    card = processLearningBoxResult(
      card,
      write("reverse", true, day20 + MINUTE),
    );
    expect(card.reverseBox).toBe(2);
    expect(card.reverseInterval).toBe(LEITNER_INTERVAL_DAYS[2]);
  });

  it("Eigenschaft: Abfragen der einen Richtung ändern das Ergebnis der anderen nicht", () => {
    const query = fc.record({
      direction: fc.constantFrom("forward" as const, "reverse" as const),
      correct: fc.boolean(),
      mode: fc.constantFrom("oral" as const, "writing" as const),
      gap: fc.integer({ min: 1, max: 20 * DAY }),
    });
    for (const other of ["forward", "reverse"] as const) {
      const project = (card: typeof fresh) =>
        other === "forward"
          ? [card.box, card.interval, card.nextReview]
          : [card.reverseBox, card.reverseInterval, card.reverseNextReview];
      fc.assert(
        fc.property(
          fc.array(query, { minLength: 1, maxLength: 12 }),
          (queries) => {
            let mixed = fresh;
            let only = fresh;
            let at = T0;
            for (const entry of queries) {
              at += entry.gap;
              const input = { ...entry, now: at };
              mixed = processLearningBoxResult(mixed, input);
              // Gegenprobe: nur die Abfragen der betrachteten Richtung abspielen.
              if (entry.direction === other) {
                only = processLearningBoxResult(only, input);
              }
            }
            expect(project(mixed)).toEqual(project(only));
          },
        ),
      );
    }
  });

  it("G-011: Karte Box 3, „practice“ im Unterricht, 10 Minuten später richtig → Box 3, morgen fällig", () => {
    const card = {
      ...fresh,
      box: 3 as const,
      level: 3 as const,
      interval: 7,
      nextReview: T0 + 3 * DAY,
      lastReviewed: T0 - 7 * DAY,
    };
    const placed = {
      ...card,
      ...placeLiveVocabularyCard(card, "practice", T0),
    };
    const soon = processLearningBoxResult(
      placed,
      write("forward", true, T0 + 10 * MINUTE),
    );
    expect(soon.box).toBe(3);
    expect(soon.interval).toBe(LEITNER_INTERVAL_DAYS[1]);
    expect(soon.nextReview).toBe(T0 + 10 * MINUTE + DAY);
    // Nach mindestens 8 Stunden: normaler Aufstieg.
    const later = processLearningBoxResult(
      placed,
      write("forward", true, T0 + LEARNING_BOX_RECOVERY_GAP_HOURS * HOUR),
    );
    expect(later.box).toBe(4);
  });

  it("G-011: „reset“, 10 Minuten später richtig → Box 1, morgen fällig", () => {
    const card = {
      ...fresh,
      box: 4 as const,
      level: 4 as const,
      interval: 14,
      nextReview: T0 + 3 * DAY,
      lastReviewed: T0 - 7 * DAY,
    };
    const placed = { ...card, ...placeLiveVocabularyCard(card, "reset", T0) };
    const soon = processLearningBoxResult(
      placed,
      write("forward", true, T0 + 10 * MINUTE),
    );
    expect(soon.box).toBe(1);
    expect(soon.interval).toBe(1);
    expect(soon.nextReview).toBe(T0 + 10 * MINUTE + DAY);
  });

  it("G-011: Die Platzierung berührt die Rückrichtung nicht", () => {
    const card = {
      ...fresh,
      reverseBox: 3 as const,
      reverseInterval: 7,
      reverseNextReview: T0 - HOUR,
      lastReviewed: T0 - 5 * DAY,
    };
    const placed = {
      ...card,
      ...placeLiveVocabularyCard(card, "practice", T0),
    };
    // Rückwärts richtig kurz nach dem Unterricht: der eigene Abruf liegt 5 Tage
    // zurück, also normaler Aufstieg.
    const reverse = processLearningBoxResult(
      placed,
      write("reverse", true, T0 + 10 * MINUTE),
    );
    expect(reverse.reverseBox).toBe(4);
  });

  it("liest ältere Karten ohne Richtungsfelder weiter (Rückfall auf lastReviewed)", () => {
    expect(fresh.forwardLastReviewed).toBeUndefined();
    const wrong = processLearningBoxResult(fresh, write("forward", false, T0));
    // Gleich nach dem Fehler ist es ein Erholungsfall, wie bisher.
    const soon = processLearningBoxResult(
      wrong,
      write("forward", true, T0 + HOUR),
    );
    expect(soon.box).toBe(1);
  });
});

describe("Selbsteinschätzung hebt höchstens bis Box 3 (D-010)", () => {
  const DAY = 24 * 60 * 60 * 1000;
  const T0 = Date.UTC(2026, 9, 18, 9);
  const fresh = createLearningBoxCard({
    deckId: "deck",
    question: "library",
    answer: "Bibliothek",
    now: T0,
  });

  it("endet nach fünfmal „Gewusst“ an fälligen Tagen in Box 3", () => {
    let card = fresh;
    let at = T0;
    for (let round = 0; round < 5; round += 1) {
      card = processLearningBoxResult(card, {
        correct: true,
        direction: "forward",
        mode: "oral",
        now: at,
      });
      at = card.nextReview;
    }
    expect(LEARNING_BOX_SELF_CHECK_MAX_BOX).toBe(3);
    expect(card.box).toBe(3);
    expect(card.interval).toBe(LEITNER_INTERVAL_DAYS[3]);
  });

  it("lässt Box 4 und 5 bei „Gewusst“ stehen und setzt Abstand und Termin neu", () => {
    for (const box of [4, 5] as const) {
      const card = {
        ...fresh,
        box,
        level: box,
        interval: 1,
        nextReview: T0,
        lastReviewed: T0 - 30 * DAY,
      };
      const updated = processLearningBoxResult(card, {
        correct: true,
        direction: "forward",
        mode: "oral",
        now: T0,
      });
      expect(updated.box).toBe(box);
      expect(updated.interval).toBe(LEITNER_INTERVAL_DAYS[box]);
      expect(updated.nextReview).toBe(T0 + LEITNER_INTERVAL_DAYS[box] * DAY);
    }
  });

  it("gilt in der Rückrichtung genauso; „Nicht gewusst“ bleibt Box 1", () => {
    const card = {
      ...fresh,
      reverseBox: 3 as const,
      reverseInterval: 7,
      reverseNextReview: T0,
      lastReviewed: T0 - 30 * DAY,
    };
    const known = processLearningBoxResult(card, {
      correct: true,
      direction: "reverse",
      mode: "oral",
      now: T0,
    });
    expect(known.reverseBox).toBe(3);
    expect(known.reverseNextReview).toBe(T0 + 7 * DAY);
    const unknown = processLearningBoxResult(
      { ...card, reverseBox: 5 },
      { correct: false, direction: "reverse", mode: "oral", now: T0 },
    );
    expect(unknown.reverseBox).toBe(1);
  });

  it("schriftlich geht es weiter bis Box 5", () => {
    const card = {
      ...fresh,
      box: 3 as const,
      level: 3 as const,
      interval: 7,
      nextReview: T0,
      lastReviewed: T0 - 30 * DAY,
    };
    const updated = processLearningBoxResult(card, {
      correct: true,
      direction: "forward",
      mode: "writing",
      now: T0,
    });
    expect(updated.box).toBe(4);
  });

  it("das Nachspielen von Selbsteinschätzungen liefert dieselbe Regel", () => {
    const events = [0, 1, 2, 3, 4].map((index): LearningEventV1 => ({
      id: `e${index}`,
      learningObjectId: fresh.id,
      occurredAt: new Date(T0 + index * 10 * DAY).toISOString(),
      source: "learning-box",
      learningArea: "vocabulary",
      roundId: `r${index}`,
      ...learningBoxEventFields({
        correct: true,
        direction: "forward",
        mode: "oral",
      }),
    }));
    expect(replayLearningBoxCard(fresh, events).box).toBe(3);
  });
});

describe("Erster Versuch zählt (C3-1)", () => {
  it("wertet je Karte und Richtung nur den ersten Versuch einer Runde", () => {
    const attempted = [learningBoxAttemptKey("card", "forward")];
    expect(isFirstLearningBoxAttempt([], "card", "forward")).toBe(true);
    expect(isFirstLearningBoxAttempt(attempted, "card", "forward")).toBe(false);
    // Die andere Richtung und andere Karten zählen für sich.
    expect(isFirstLearningBoxAttempt(attempted, "card", "reverse")).toBe(true);
    expect(isFirstLearningBoxAttempt(attempted, "other", "forward")).toBe(true);
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
      // Der richtige Abruf nach dem Fehler liegt einen Tag später.
      eventFor("c", 2_000 + 86_400_000, right),
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

describe("Schonfrist und Rückstufung nach Zeit", () => {
  const DAY = 24 * 60 * 60 * 1000;
  const NOW = Date.UTC(2026, 9, 22, 12);

  /** Karte, deren Richtung `overdueDays` Tage überfällig ist. */
  function overdueCard(
    direction: "forward" | "reverse",
    box: 1 | 2 | 3 | 4 | 5,
    overdueDays: number,
  ) {
    const card = createLearningBoxCard({
      deckId: "deck",
      question: "house",
      answer: "Haus",
      now: NOW - 200 * DAY,
    });
    const due = NOW - overdueDays * DAY;
    return direction === "forward"
      ? { ...card, box, level: box, interval: 7, nextReview: due }
      : {
          ...card,
          reverseBox: box,
          reverseInterval: 7,
          reverseNextReview: due,
        };
  }

  const days = [0, 13, 14, 27, 28, 42, 100];

  it("rechnet die wirksame Box je Box, Überfälligkeit und Richtung", () => {
    const boxes = [1, 2, 3, 4, 5] as const;
    for (const direction of ["forward", "reverse"] as const) {
      for (const box of boxes) {
        for (const overdue of days) {
          const card = overdueCard(direction, box, overdue);
          const demotions = Math.floor(overdue / 14);
          expect(
            effectiveLearningBoxLevel(card, direction, NOW),
            `${direction} Box ${box}, ${overdue} Tage`,
          ).toBe(Math.max(1, box - demotions));
          expect(
            isLearningBoxLongUnpracticed(card, direction, NOW),
            `${direction} Box ${box}, ${overdue} Tage`,
          ).toBe(overdue >= 14);
        }
      }
    }
  });

  it("folgt dem Beispiel Box 4: 13 Tage 4, 14 Tage 3, 28 Tage 2, 42 Tage 1", () => {
    const level = (overdue: number) =>
      effectiveLearningBoxLevel(
        overdueCard("forward", 4, overdue),
        "forward",
        NOW,
      );
    expect([level(13), level(14), level(28), level(42)]).toEqual([4, 3, 2, 1]);
  });

  it("stuft vor der Fälligkeit nicht zurück", () => {
    const card = overdueCard("forward", 3, -10);
    expect(effectiveLearningBoxLevel(card, "forward", NOW)).toBe(3);
    expect(isLearningBoxLongUnpracticed(card, "forward", NOW)).toBe(false);
  });

  it("kennzeichnet Box 1 ab 14 Tagen, ohne weiter zu fallen", () => {
    const card = overdueCard("forward", 1, 60);
    expect(effectiveLearningBoxLevel(card, "forward", NOW)).toBe(1);
    expect(isLearningBoxLongUnpracticed(card, "forward", NOW)).toBe(true);
  });

  it("lässt nie geübte Richtungen und neue Karten in Ruhe", () => {
    const fresh = createLearningBoxCard({
      deckId: "deck",
      question: "house",
      answer: "Haus",
      now: NOW - 300 * DAY,
    });
    expect(effectiveLearningBoxLevel(fresh, "forward", NOW)).toBe(1);
    expect(isLearningBoxLongUnpracticed(fresh, "forward", NOW)).toBe(false);
    expect(isLearningBoxLongUnpracticed(fresh, "reverse", NOW)).toBe(false);
    // Vorwärts geübt und lange überfällig, Rückrichtung nie geübt: bleibt Box 1.
    const half = overdueCard("forward", 4, 100);
    expect(effectiveLearningBoxLevel(half, "reverse", NOW)).toBe(1);
    expect(isLearningBoxLongUnpracticed(half, "reverse", NOW)).toBe(false);
  });

  it("wertet die Richtungen getrennt und zählt die Karte einmal", () => {
    const forwardOnly = overdueCard("forward", 4, 30);
    expect(isLearningBoxCardLongUnpracticed(forwardOnly, NOW)).toBe(true);
    expect(effectiveLearningBoxLevel(forwardOnly, "forward", NOW)).toBe(2);
    expect(forwardOnly.box).toBe(4);
    const both = {
      ...forwardOnly,
      reverseBox: 5 as const,
      reverseInterval: 14,
      reverseNextReview: NOW - 15 * DAY,
    };
    expect(effectiveLearningBoxLevel(both, "reverse", NOW)).toBe(4);
    expect(isLearningBoxCardLongUnpracticed(both, NOW)).toBe(true);
    const fine = overdueCard("forward", 4, 2);
    expect(isLearningBoxCardLongUnpracticed(fine, NOW)).toBe(false);
  });

  it("steigt nach Rückstufung von der wirksamen Box um eins auf", () => {
    // Box 4, 28 Tage überfällig: wirksam Box 2, richtig → Box 3.
    const card = overdueCard("forward", 4, 28);
    const updated = processLearningBoxResult(card, {
      correct: true,
      direction: "forward",
      mode: "writing",
      now: NOW,
    });
    expect(updated.box).toBe(3);
    expect(updated.interval).toBe(LEITNER_INTERVAL_DAYS[3]);
    expect(updated.nextReview).toBe(NOW + LEITNER_INTERVAL_DAYS[3] * DAY);
    // Rückrichtung bleibt unberührt.
    expect(updated.reverseBox).toBe(card.reverseBox);
  });

  it("steigt in der Rückrichtung genauso von der wirksamen Box auf", () => {
    // Box 5, 14 Tage überfällig: wirksam Box 4, richtig → Box 5.
    // Schriftlich: Selbsteinschätzung käme höchstens bis Box 3 (D-010).
    const card = overdueCard("reverse", 5, 14);
    const updated = processLearningBoxResult(card, {
      correct: true,
      direction: "reverse",
      mode: "writing",
      now: NOW,
    });
    expect(updated.reverseBox).toBe(5);
    expect(updated.box).toBe(card.box);
    const lower = processLearningBoxResult(overdueCard("reverse", 4, 42), {
      correct: true,
      direction: "reverse",
      mode: "writing",
      now: NOW,
    });
    expect(lower.reverseBox).toBe(2);
  });

  it("setzt falsch nach Rückstufung auf Box 1", () => {
    const updated = processLearningBoxResult(overdueCard("forward", 4, 28), {
      correct: false,
      direction: "forward",
      mode: "writing",
      now: NOW,
    });
    expect(updated.box).toBe(1);
    expect(updated.interval).toBe(1);
    expect(updated.nextReview).toBe(NOW);
  });

  it("lässt innerhalb der Schonfrist alles beim Alten", () => {
    const updated = processLearningBoxResult(overdueCard("forward", 4, 13), {
      correct: true,
      direction: "forward",
      mode: "writing",
      now: NOW,
    });
    expect(updated.box).toBe(5);
  });

  it("hält die Erholungsregel an der gespeicherten Box fest", () => {
    // Gespeichert Box 2, 14 Tage überfällig (wirksam 1). Die Gegenrichtung
    // wurde eben erst geübt (G-005), die eigene Richtung lange nicht: kein
    // Erholungsfall, also normaler Aufstieg von der wirksamen Box in Box 2.
    const card = {
      ...overdueCard("forward", 2, 14),
      forwardLastReviewed: NOW - 30 * DAY,
      lastReviewed: NOW - 60_000,
    };
    const updated = processLearningBoxResult(card, {
      correct: true,
      direction: "forward",
      mode: "oral",
      now: NOW,
    });
    expect(updated.box).toBe(2);
    expect(updated.interval).toBe(LEITNER_INTERVAL_DAYS[2]);
  });

  it("behält im Erholungsfall die gespeicherte Box, nicht die wirksame", () => {
    // Eigene Richtung eben erst geübt (Unterricht „practice“), Box 2 gespeichert,
    // 14 Tage überfällig: Box bleibt 2, morgen wieder.
    const card = {
      ...overdueCard("forward", 2, 14),
      forwardLastReviewed: NOW - 60_000,
    };
    const updated = processLearningBoxResult(card, {
      correct: true,
      direction: "forward",
      mode: "oral",
      now: NOW,
    });
    expect(updated.box).toBe(2);
    expect(updated.interval).toBe(LEITNER_INTERVAL_DAYS[1]);
    expect(updated.nextReview).toBe(NOW + DAY);
  });
});

/** Treiber der Regeltabelle: Antworten laufen durch `processLearningBoxResult`. */
const learningBoxModule: RuleTableModule = {
  name: "LernBox (processLearningBoxResult)",
  maxBox: 5,
  selfCheck: true,
  create(start) {
    let card = createLearningBoxCard({
      deckId: "deck",
      question: "library",
      answer: "Bibliothek",
      now: start,
    });
    const attempted = new Map<string, string[]>();
    return {
      answer(input) {
        // Je Runde zählt nur der erste Versuch (C3-1), wie in der Lernrunde.
        const inRound = attempted.get(input.roundId) ?? [];
        if (
          input.firstAttempt === false ||
          !isFirstLearningBoxAttempt(inRound, card.id, "forward")
        )
          return;
        attempted.set(input.roundId, [
          ...inRound,
          learningBoxAttemptKey(card.id, "forward"),
        ]);
        card = processLearningBoxResult(card, {
          correct: input.correct,
          direction: "forward",
          mode: input.selfCheck ? "oral" : "writing",
          ...(input.correct && input.usedHelp
            ? { secondChance: "recovered" as const }
            : {}),
          now: input.at,
        });
      },
      box: () => card.box,
      dueAt: () => card.nextReview,
    };
  },
};

describe("Regeltabelle Vault 06 an der LernBox", () => {
  for (const row of REPETITION_RULE_TABLE) {
    if (row.applies && !row.applies(learningBoxModule)) continue;
    it(row.rule, () => row.run(learningBoxModule));
  }

  it("teilt die Konstanten mit der Regelkonfiguration des Kerns", () => {
    expect(REPETITION_RULES.lernbox.selfCheckMaxBox).toBe(
      LEARNING_BOX_SELF_CHECK_MAX_BOX,
    );
    expect(REPETITION_RULES.lernbox.recovery.gapMs).toBe(
      LEARNING_BOX_RECOVERY_GAP_HOURS * 60 * 60 * 1000,
    );
  });
});

describe("learningBoxDeckStatus (was ist im Stapel heute offen)", () => {
  const DAY = 86_400_000;
  const NOW = 10 * DAY;
  const fresh = (question: string) =>
    createLearningBoxCard({
      deckId: "deck",
      question,
      answer: "Antwort",
      now: NOW,
    });
  /** Beide Richtungen geübt und erst in einer Woche wieder an der Reihe. */
  const rested = (question: string): LearningBoxCard => ({
    ...fresh(question),
    box: 3,
    interval: 7,
    nextReview: NOW + 7 * DAY,
    lastReviewed: NOW,
    reverseBox: 3,
    reverseInterval: 7,
    reverseNextReview: NOW + 7 * DAY,
  });

  it("nennt einen Stapel mit nie geübten Karten „neu“, nie „erledigt“", () => {
    const status = learningBoxDeckStatus(
      [fresh("a"), fresh("b"), fresh("c")],
      NOW,
    );
    expect(status).toEqual({ state: "new", due: 0, fresh: 3 });
  });

  it("nennt einen Stapel „fällig“, sobald eine geübte Karte dran ist; Fälliges geht vor Neuem", () => {
    const due: LearningBoxCard = { ...rested("a"), nextReview: NOW - DAY };
    const status = learningBoxDeckStatus([due, fresh("b")], NOW);
    expect(status).toEqual({ state: "due", due: 1, fresh: 1 });
  });

  it("nennt einen Stapel „erledigt“ nur, wenn nichts fällig und nichts neu ist", () => {
    expect(learningBoxDeckStatus([rested("a"), rested("b")], NOW)).toEqual({
      state: "done",
      due: 0,
      fresh: 0,
    });
    expect(learningBoxDeckStatus([], NOW).state).toBe("done");
  });

  it("zählt die nie geübte Rückrichtung erst als neu, wenn vorwärts Box 2 erreicht ist", () => {
    const base: LearningBoxCard = {
      ...rested("a"),
      reverseInterval: 0,
      reverseBox: 1,
    };
    expect(learningBoxDeckStatus([{ ...base, box: 1 }], NOW).state).toBe(
      "done",
    );
    expect(learningBoxDeckStatus([{ ...base, box: 2 }], NOW).state).toBe("new");
    expect(isLearningBoxDirectionNew({ ...base, box: 2 }, "reverse", NOW)).toBe(
      true,
    );
    expect(isLearningBoxDirectionNew(base, "forward", NOW)).toBe(false);
  });
});
