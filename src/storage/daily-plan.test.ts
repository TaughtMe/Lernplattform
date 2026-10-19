import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { DAILY_PLAN_SIZE, type DailyPlan } from "../domain/daily-plan";
import type { LearningEventV1 } from "../domain/learning-bundle";
import {
  createLearningBoxCard,
  createLearningBoxDeck,
  processLearningBoxResult,
  type LearningBoxCard,
} from "../domain/learning-box";
import {
  learningWordId,
  type LearningWordProgress,
} from "../domain/learning-word-progress";
import { parseMentalMathTask } from "../domain/mental-math";
import {
  createDailyPlanRepository,
  dailyPlanCandidates,
  DAILY_PLAN_KEEP_DAYS,
} from "./daily-plan";
import { createMathAttempt } from "./math-practice";
import { exportPersonalLearningBackup } from "./personal-backup";
import {
  createLearningBoxRepository,
  PersonalLearningDatabase,
} from "./personal-learning-events";

const databases: PersonalLearningDatabase[] = [];

function createDatabase() {
  const database = new PersonalLearningDatabase(`plan-${crypto.randomUUID()}`);
  databases.push(database);
  return database;
}

afterEach(async () => {
  await Promise.all(
    databases.splice(0).map(async (database) => {
      database.close();
      await database.delete();
    }),
  );
});

// Lokale Zeiten, damit die Tests in jeder Zeitzone denselben Tag meinen.
const local = (day: number, hour = 8, minute = 0) =>
  new Date(2026, 9, day, hour, minute);
const NOW = local(19).toISOString();
const NOW_MS = local(19).getTime();
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

function card(
  deckId: string,
  index: number,
  patch: Partial<LearningBoxCard> = {},
): LearningBoxCard {
  return {
    ...createLearningBoxCard({
      deckId,
      question: `Frage ${index}`,
      answer: `Antwort ${index}`,
      now: NOW_MS - 30 * DAY + index,
    }),
    ...patch,
  };
}

function wordProgress(
  word: string,
  patch: Partial<LearningWordProgress> = {},
): LearningWordProgress {
  return {
    id: learningWordId(word),
    word,
    stage: 2,
    box: 3,
    dueAt: new Date(NOW_MS - DAY).toISOString(),
    attempts: 3,
    incorrectAttempts: 0,
    helpUses: 0,
    lastPracticedAt: new Date(NOW_MS - 4 * DAY).toISOString(),
    ...patch,
  };
}

async function mathError(table: number, factor: number, occurredAt: string) {
  return createMathAttempt({
    task: parseMentalMathTask(`${table} * ${factor}`)!,
    answer: "0",
    roundId: `runde-${table}-${factor}`,
    attemptId: `${table}-${factor}`,
    selfCorrected: false,
    usedHelp: false,
    now: occurredAt,
  });
}

function vocabularyEvent(
  objectId: string,
  occurredAt: string,
  correct: boolean,
  source: LearningEventV1["source"] = "running-dictation",
  practice?: LearningEventV1["practice"],
): LearningEventV1 {
  return {
    id: `${objectId}-${occurredAt}`,
    learningObjectId: objectId,
    occurredAt,
    source,
    learningArea: "vocabulary",
    roundId: `runde-${objectId}`,
    direction: "prompt-to-answer",
    answerMode: "typed",
    help: "none",
    ...(practice ? { practice } : {}),
    assessment: {
      knowledge: correct ? "correct" : "incorrect",
      writing: correct ? "correct" : "incorrect",
      selfCorrected: false,
    },
  };
}

describe("Kandidaten der Tagesportion", () => {
  it("macht aus neuen Karten nur die Vorwärtsrichtung zu einem neuen Kandidaten", () => {
    const fresh = card("deck", 1);
    expect(
      dailyPlanCandidates({ events: [], cards: [fresh], words: [] }, NOW),
    ).toEqual([
      {
        key: `vocabulary:${fresh.id}:forward`,
        module: "vocabulary",
        kind: "new",
        objectIds: [fresh.id],
        direction: "forward",
        dueAt: new Date(fresh.createdAt).toISOString(),
      },
    ]);
  });

  it("bietet die Rückrichtung erst ab Box 2 vorwärts als neu an", () => {
    const base = card("deck", 1, {
      interval: 3,
      nextReview: NOW_MS + 5 * DAY,
    });
    const keys = (value: LearningBoxCard) =>
      dailyPlanCandidates({ events: [], cards: [value], words: [] }, NOW).map(
        (item) => item.key,
      );
    expect(keys({ ...base, box: 1 })).toEqual([]);
    expect(keys({ ...base, box: 2 })).toEqual([
      `vocabulary:${base.id}:reverse`,
    ]);
  });

  it("zählt geübte, fällige Richtungen: Box 1 als Fehler, sonst als Wiederholung", () => {
    const error = card("deck", 1, {
      interval: 1,
      box: 1,
      nextReview: NOW_MS - 2 * HOUR,
      lastReviewed: NOW_MS - DAY,
      reverseInterval: 3,
      reverseBox: 3,
      reverseNextReview: NOW_MS - 2 * DAY,
    });
    const candidates = dailyPlanCandidates(
      { events: [], cards: [error], words: [] },
      NOW,
    );
    expect(candidates).toEqual([
      expect.objectContaining({
        key: `vocabulary:${error.id}:forward`,
        kind: "error",
        direction: "forward",
        dueAt: new Date(NOW_MS - 2 * HOUR).toISOString(),
        occurredAt: new Date(NOW_MS - DAY).toISOString(),
      }),
      expect.objectContaining({
        key: `vocabulary:${error.id}:reverse`,
        kind: "review",
        direction: "reverse",
      }),
    ]);
    expect(candidates[1]).not.toHaveProperty("occurredAt");
  });

  it("lässt noch nicht fällige Karten aus", () => {
    const later = card("deck", 1, {
      interval: 7,
      box: 3,
      nextReview: NOW_MS + 6 * DAY,
      reverseInterval: 7,
      reverseBox: 3,
      reverseNextReview: NOW_MS + 6 * DAY,
    });
    expect(
      dailyPlanCandidates({ events: [], cards: [later], words: [] }, NOW),
    ).toEqual([]);
  });

  it("nimmt Vokabel-Ereignisse ohne Karte wie die Empfehlungen und ignoriert Antworten zu vorhandenen Karten", () => {
    const owned = card("deck", 1, {
      interval: 7,
      nextReview: NOW_MS + 5 * DAY,
    });
    const events = [
      vocabularyEvent(
        "wort-falsch",
        new Date(NOW_MS - DAY).toISOString(),
        false,
        "lesson",
        { title: "Klassenaufgabe", route: "/klasse/7b/aufgaben/vokabeln" },
      ),
      vocabularyEvent(
        "wort-faellig",
        new Date(NOW_MS - 20 * DAY).toISOString(),
        true,
        "lesson",
        { title: "Klassenaufgabe", route: "/klasse/7b/aufgaben/vokabeln" },
      ),
      vocabularyEvent(
        "wort-ohne-route",
        new Date(NOW_MS - 2 * DAY).toISOString(),
        false,
      ),
      vocabularyEvent(
        "wort-frisch",
        new Date(NOW_MS - HOUR).toISOString(),
        true,
      ),
      vocabularyEvent(
        owned.id,
        new Date(NOW_MS - DAY).toISOString(),
        false,
        "learning-box",
      ),
    ];
    expect(
      dailyPlanCandidates({ events, cards: [owned], words: [] }, NOW),
    ).toEqual([
      expect.objectContaining({
        key: "vocabulary:event:wort-falsch",
        kind: "error",
        objectIds: ["wort-falsch"],
        occurredAt: new Date(NOW_MS - DAY).toISOString(),
        route: "/klasse/7b/aufgaben/vokabeln",
      }),
      expect.objectContaining({
        key: "vocabulary:event:wort-faellig",
        kind: "review",
        objectIds: ["wort-faellig"],
        route: "/klasse/7b/aufgaben/vokabeln",
      }),
    ]);
    // Ohne Übungsroute ließe sich „wort-ohne-route“ nirgends üben: nicht in
    // der Portion.
  });

  it("nimmt fällige Lernwörter: Box 1 mit Fehlern als Fehler, sonst als Wiederholung", () => {
    const words = [
      wordProgress("Schlüssel", { box: 1, incorrectAttempts: 2 }),
      wordProgress("Fahrrad"),
      wordProgress("Morgen", { box: 1 }),
      wordProgress("Später", { dueAt: new Date(NOW_MS + DAY).toISOString() }),
    ];
    expect(
      dailyPlanCandidates({ events: [], cards: [], words }, NOW).map((item) => [
        item.key,
        item.kind,
        item.occurredAt !== undefined,
      ]),
    ).toEqual([
      [`german:${learningWordId("Schlüssel")}`, "error", true],
      [`german:${learningWordId("Fahrrad")}`, "review", false],
      [`german:${learningWordId("Morgen")}`, "review", false],
    ]);
  });

  it("fasst Mathe-Posten zu Familien zusammen und trennt Fehler von Wiederholungen", async () => {
    const yesterday = new Date(NOW_MS - DAY).toISOString();
    const events = [
      await mathError(7, 11, yesterday),
      await mathError(7, 12, new Date(NOW_MS - 2 * DAY).toISOString()),
      await mathError(4, 11, yesterday),
    ];
    const candidates = dailyPlanCandidates(
      { events, cards: [], words: [] },
      NOW,
    );
    expect(candidates.map((item) => [item.key, item.kind])).toEqual([
      ["mathematics:multiply:normal:reihe-7", "error"],
      ["mathematics:multiply:normal:reihe-4", "error"],
    ]);
    expect(candidates[0]!.objectIds).toHaveLength(2);
    // Die Familie zeigt den jüngsten Fehler, die Fälligkeit den ältesten Posten.
    expect(candidates[0]).toMatchObject({
      dueAt: new Date(NOW_MS - 2 * DAY).toISOString(),
      occurredAt: yesterday,
    });
  });

  it("zählt einen Mathe-Posten ohne Fehlerstufe als Wiederholung und lässt Nichtfälliges aus", async () => {
    const error = await mathError(
      6,
      11,
      new Date(NOW_MS - 10 * DAY).toISOString(),
    );
    const clean = await createMathAttempt({
      task: parseMentalMathTask("6 * 11")!,
      answer: "66",
      roundId: "spaeter",
      attemptId: "sauber-1",
      selfCorrected: false,
      usedHelp: false,
      now: new Date(NOW_MS - 5 * DAY).toISOString(),
    });
    const clean2 = await createMathAttempt({
      task: parseMentalMathTask("6 * 11")!,
      answer: "66",
      roundId: "noch-spaeter",
      attemptId: "sauber-2",
      selfCorrected: false,
      usedHelp: false,
      now: new Date(NOW_MS - 3.5 * DAY).toISOString(),
    });
    // Zwei saubere Runden: Stufe 2 (3 Tage Abstand), seit 0,5 Tagen fällig.
    const review = dailyPlanCandidates(
      { events: [error, clean, clean2], cards: [], words: [] },
      NOW,
    );
    expect(review).toEqual([
      expect.objectContaining({
        key: "mathematics:multiply:normal:reihe-6",
        kind: "review",
      }),
    ]);
    expect(review[0]).not.toHaveProperty("occurredAt");
    expect(
      dailyPlanCandidates(
        { events: [error, clean, clean2], cards: [], words: [] },
        new Date(NOW_MS - 4 * DAY).toISOString(),
      ),
    ).toEqual([]);
  });
});

describe("Tagesportion im Speicher", () => {
  it("erzeugt den Plan eines Tages genau einmal, auch bei gleichzeitigen Aufrufen", async () => {
    const database = createDatabase();
    const repository = createDailyPlanRepository(database);
    const deck = createLearningBoxDeck({ title: "Englisch", now: NOW_MS });
    await database.learningBoxDecks.put(deck);
    await database.learningBoxCards.put(card(deck.id, 1));

    const [first, second] = await Promise.all([
      repository.today(NOW),
      repository.today(local(19, 9).toISOString()),
    ]);
    expect(first.items).toHaveLength(1);
    expect(second).toEqual(first);
    expect(await database.dailyPlans.count()).toBe(1);

    // Was im Laufe des Tages neu hinzukommt, steht erst morgen im Plan.
    await database.learningBoxCards.put(card(deck.id, 2));
    expect(await repository.today(local(19, 18).toISOString())).toEqual(first);
    expect(first.createdAt).toBe(NOW);
    expect(first.day).toBe("2026-10-19");
  });

  it("erzeugt nach Mitternacht einen neuen Plan", async () => {
    const database = createDatabase();
    const repository = createDailyPlanRepository(database);
    const deck = createLearningBoxDeck({ title: "Englisch", now: NOW_MS });
    await database.learningBoxDecks.put(deck);
    await database.learningBoxCards.put(card(deck.id, 1));
    const monday = await repository.today(local(19, 23, 59).toISOString());
    await database.learningBoxCards.put(card(deck.id, 2));
    const tuesday = await repository.today(local(20, 0, 1).toISOString());
    expect(monday.day).toBe("2026-10-19");
    expect(tuesday.day).toBe("2026-10-20");
    expect(monday.items).toHaveLength(1);
    expect(tuesday.items).toHaveLength(2);
    expect(await database.dailyPlans.count()).toBe(2);
  });

  it("löscht Pläne, die älter als sieben Tage sind, beim Erzeugen eines neuen", async () => {
    const database = createDatabase();
    const repository = createDailyPlanRepository(database);
    const dayOf = (offset: number) =>
      `2026-10-${String(19 - offset).padStart(2, "0")}`;
    const stub = (offset: number): DailyPlan => ({
      day: dayOf(offset),
      createdAt: local(19 - offset).toISOString(),
      size: DAILY_PLAN_SIZE,
      items: [],
    });
    await database.dailyPlans.bulkPut(
      [8, DAILY_PLAN_KEEP_DAYS, 3, 1].map(stub),
    );
    await repository.today(NOW);
    expect((await database.dailyPlans.orderBy("day").keys()).sort()).toEqual([
      dayOf(DAILY_PLAN_KEEP_DAYS),
      dayOf(3),
      dayOf(1),
      "2026-10-19",
    ]);
    // Ein vorhandener Plan löst kein Aufräumen aus.
    await database.dailyPlans.put(stub(20));
    await repository.today(NOW);
    expect(await database.dailyPlans.get(dayOf(20))).toBeDefined();
  });

  it("verwirft einen ungültigen Plan und erzeugt ihn neu", async () => {
    const database = createDatabase();
    const repository = createDailyPlanRepository(database);
    await database.dailyPlans.put({
      day: "2026-10-19",
      createdAt: "kaputt",
      items: "nichts",
    } as never);
    const plan = await repository.today(NOW);
    expect(plan).toMatchObject({
      day: "2026-10-19",
      createdAt: NOW,
      items: [],
    });
    expect(await database.dailyPlans.get("2026-10-19")).toEqual(plan);
  });

  it("zeigt den Fortschritt nur für Ereignisse nach dem Erzeugen des Plans", async () => {
    const database = createDatabase();
    const repository = createDailyPlanRepository(database);
    const deck = createLearningBoxDeck({ title: "Englisch", now: NOW_MS });
    await database.learningBoxDecks.put(deck);
    const due = card(deck.id, 1, {
      interval: 1,
      box: 2,
      nextReview: NOW_MS - HOUR,
      lastReviewed: NOW_MS - DAY,
      // Rückrichtung schon geübt und noch nicht dran.
      reverseInterval: 3,
      reverseNextReview: NOW_MS + 2 * DAY,
    });
    const other = card(deck.id, 2, {
      interval: 1,
      box: 2,
      nextReview: NOW_MS - HOUR,
      lastReviewed: NOW_MS - DAY,
      // Rückrichtung schon geübt und noch nicht dran.
      reverseInterval: 3,
      reverseNextReview: NOW_MS + 2 * DAY,
    });
    await database.learningBoxCards.bulkPut([due, other]);
    await database.learningWordProgress.put(wordProgress("Fahrrad"));

    const start = await repository.progress(NOW);
    expect(start).toMatchObject({
      done: 0,
      total: 3,
      openByModule: { vocabulary: 2, german: 1, mathematics: 0 },
    });

    const boxes = createLearningBoxRepository(database);
    const answeredAt = NOW_MS + HOUR;
    await boxes.putCardAndEvent({
      card: processLearningBoxResult(due, {
        correct: true,
        direction: "forward",
        mode: "writing",
        now: answeredAt,
      }),
      correct: true,
      direction: "forward",
      mode: "writing",
      roundId: "freie-runde",
      now: new Date(answeredAt).toISOString(),
    });
    const later = await repository.progress(
      new Date(answeredAt + HOUR).toISOString(),
    );
    expect(later.done).toBe(1);
    expect(later.total).toBe(3);
    expect(later.openItems.map((item) => item.module).sort()).toEqual([
      "german",
      "vocabulary",
    ]);
    expect(later.openItems.map((item) => item.key)).not.toContain(
      `vocabulary:${due.id}:forward`,
    );
  });

  it("legt die Tabelle mit Version 7 an und nimmt sie nicht in die Sicherung auf", async () => {
    const database = createDatabase();
    await database.open();
    expect(database.verno).toBe(7);
    expect(database.tables.map((table) => table.name)).toContain("dailyPlans");
    await createDailyPlanRepository(database).today(NOW);
    const backup = await exportPersonalLearningBackup(database, NOW);
    expect(Object.keys(backup.data)).not.toContain("dailyPlans");
  });

  it("wählt aus der Praxis (200 Karten, 60 Mathe-Fehler, 10 Lernwörter) genau 20 Elemente", async () => {
    const database = createDatabase();
    const repository = createDailyPlanRepository(database);
    const deck = createLearningBoxDeck({ title: "Buch", now: NOW_MS });
    await database.learningBoxDecks.put(deck);
    const cards = Array.from({ length: 200 }, (_, index) => {
      // 150 neue; von den übrigen 50 sind 10 Fehler (Box 1) und 40 geübt (Box 2).
      if (index < 150) return card(deck.id, index);
      const error = index < 160;
      return card(deck.id, index, {
        interval: error ? 1 : 3,
        box: error ? 1 : 2,
        nextReview: NOW_MS - (index - 149) * HOUR,
        lastReviewed: NOW_MS - DAY,
      });
    });
    await database.learningBoxCards.bulkPut(cards);

    // 60 Mathe-Fehlerposten in 4 Familien (Reihen 3, 4, 6 und 7).
    const yesterday = new Date(NOW_MS - DAY).toISOString();
    const mathEvents = await Promise.all(
      [3, 4, 6, 7].flatMap((table) =>
        Array.from({ length: 15 }, (_, index) =>
          mathError(table, 11 + index, yesterday),
        ),
      ),
    );
    await database.learningEvents.bulkPut(mathEvents);

    // 10 Lernwörter: 5 mit Fehlern, 5 einfach fällig.
    await database.learningWordProgress.bulkPut(
      Array.from({ length: 10 }, (_, index) =>
        wordProgress(`Wort${index}`, {
          box: index < 5 ? 1 : 3,
          incorrectAttempts: index < 5 ? 2 : 0,
        }),
      ),
    );

    const plan = await repository.today(NOW);
    const count = (predicate: (item: DailyPlan["items"][number]) => boolean) =>
      plan.items.filter(predicate).length;
    expect(plan.items).toHaveLength(20);
    expect(count((item) => item.kind === "new")).toBe(4);
    expect(count((item) => item.module === "mathematics")).toBeLessThanOrEqual(
      4,
    );
    expect(new Set(plan.items.map((item) => item.key)).size).toBe(20);
    // 6 Fehler (je 2 aus Wortschatz, Deutsch, Mathe), 10 Wiederholungen
    // (5 Wortschatz, 5 Lernwörter) und 4 neue Karten.
    const breakdown = (module: string) =>
      ["error", "review", "new"].map((kind) =>
        count((item) => item.module === module && item.kind === kind),
      );
    expect(breakdown("vocabulary")).toEqual([2, 5, 4]);
    expect(breakdown("german")).toEqual([2, 5, 0]);
    expect(breakdown("mathematics")).toEqual([2, 0, 0]);
    // Ein Mathe-Element steht für die ganze Familie (15 Posten).
    expect(
      plan.items.find((item) => item.module === "mathematics")!.objectIds,
    ).toHaveLength(15);
    expect((await repository.candidates(NOW)).length).toBeGreaterThan(150);
  });
});
