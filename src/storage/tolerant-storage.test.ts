import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { parseMentalMathTask } from "../domain/mental-math";
import { createDailyPlanRepository } from "./daily-plan";
import { createLearningRecommendationRepository } from "./learning-recommendations";
import {
  createMathAttempt,
  createMathPracticeRepository,
} from "./math-practice";
import {
  createPersonalLearningEventRepository,
  createWordBoxRepository,
  PersonalLearningDatabase,
} from "./personal-learning-events";
import {
  countUnreadableRecords,
  listUnreadableRecords,
} from "./unreadable-records";

const databases: PersonalLearningDatabase[] = [];

afterEach(async () => {
  await Promise.all(
    databases.splice(0).map(async (database) => {
      database.close();
      await database.delete();
    }),
  );
});

const NOW = "2026-08-24T12:00:00.000Z";

async function mathError(source: string, attemptId: string) {
  return createMathAttempt({
    task: parseMentalMathTask(source)!,
    answer: "0",
    roundId: "runde",
    attemptId,
    selfCorrected: false,
    usedHelp: false,
    now: "2026-08-24T10:00:00.000Z",
  });
}

/** Zwei Ereignisse aus „Version n+1“ neben einem gültigen (Audit A-001). */
async function seedFutureEvents() {
  const database = new PersonalLearningDatabase(
    `tolerant-${crypto.randomUUID()}`,
  );
  databases.push(database);
  const valid = await mathError("7 * 7", "1");
  const withExtraField = await mathError("7 * 8", "2");
  const withUnknownSource = await mathError("7 * 9", "3");
  await database.learningEvents.bulkPut([
    valid,
    // Neues Feld, auch verschachtelt: wird gelesen, das Feld entfällt.
    {
      ...withExtraField,
      confidence: 0.5,
      assessment: { ...withExtraField.assessment, confidence: "high" },
    },
    // Neue Quelle: für diese Version nicht lesbar, bleibt aber gespeichert.
    { ...withUnknownSource, source: "future-module" },
  ] as never);
  return { database, valid, withExtraField, withUnknownSource };
}

describe("Ereignis aus Version n+1 (tolerantes Lesen)", () => {
  it("liest Ereignisse mit Zusatzfeld und überspringt unbekannte Quellen, ohne zu löschen", async () => {
    const { database, withExtraField, withUnknownSource } =
      await seedFutureEvents();

    const events = await createPersonalLearningEventRepository(database).list();
    expect(events.map((event) => event.id).sort()).toEqual(
      [(await mathError("7 * 7", "1")).id, withExtraField.id].sort(),
    );
    expect(events.find((event) => event.id === withExtraField.id)).toEqual(
      withExtraField,
    );

    expect(await database.learningEvents.count()).toBe(3);
    expect(await countUnreadableRecords(database)).toBe(1);
    expect(await listUnreadableRecords(database)).toEqual([
      { table: "learningEvents", id: withUnknownSource.id },
    ]);
  });

  it("liefert Tagesportion, Empfehlungen und Mathe-Wiederholung weiter", async () => {
    const { database } = await seedFutureEvents();

    const reviews = await createMathPracticeRepository(database).reviews();
    expect(reviews).toHaveLength(2);

    const recommendations = await createLearningRecommendationRepository(
      database,
    ).list({ enabledModules: ["mathematics"], now: NOW });
    expect(recommendations).toMatchObject([
      { id: "math-reviews", reason: "error", amount: 1 },
    ]);

    const progress = await createDailyPlanRepository(database).progress(NOW);
    expect(progress.total).toBeGreaterThan(0);
    expect(
      progress.plan.items.find((item) => item.module === "mathematics")
        ?.objectIds,
    ).toHaveLength(2);
  });

  it("schreibt weiterhin streng", async () => {
    const { database, valid } = await seedFutureEvents();
    await expect(
      createPersonalLearningEventRepository(database).put({
        ...valid,
        id: "neu",
        confidence: 1,
      } as never),
    ).rejects.toThrow();
  });
});

describe("unlesbare Datensätze in anderen Tabellen", () => {
  it("überspringt und zählt sie, ohne sie zu löschen", async () => {
    const database = new PersonalLearningDatabase(
      `tolerant-${crypto.randomUUID()}`,
    );
    databases.push(database);
    await database.wordBoxes.add({ id: "kaputt" } as never);
    await database.learningWordProgress.add({
      id: "Haus",
      word: "Haus",
      stage: 9,
    } as never);
    await database.typingProgress.add({
      id: "lektion",
      completed: false,
      bestWpm: 1,
      bestAccuracy: 1,
      attempts: 1,
      lastPracticedAt: "2026-08-24T10:00:00.000Z",
      problemChars: [],
      neuesFeld: true,
    } as never);

    expect(await createWordBoxRepository(database).list()).toEqual([]);
    expect(await listUnreadableRecords(database)).toEqual([
      { table: "learningWordProgress", id: "Haus" },
      { table: "wordBoxes", id: "kaputt" },
    ]);
    expect(await database.wordBoxes.count()).toBe(1);
    expect(await database.learningWordProgress.count()).toBe(1);
  });
});
