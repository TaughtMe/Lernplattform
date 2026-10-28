import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { planTraining, trainingSegments } from "../domain/daily-training";
import { parseMentalMathTask } from "../domain/mental-math";
import { createDailyTrainingRepository } from "./daily-training";
import { PersonalLearningDatabase } from "./personal-learning-events";
import { createStartPointRepository } from "./start-point";

const databases: PersonalLearningDatabase[] = [];

function createDatabase() {
  const database = new PersonalLearningDatabase(
    `training-${crypto.randomUUID()}`,
  );
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

describe("Tagestraining aus dem Speicher", () => {
  it("liefert ohne Lernstand keine offenen Elemente", async () => {
    const source = await createDailyTrainingRepository(createDatabase()).load(
      new Date(2026, 9, 21, 9),
    );
    expect(source.openItems).toEqual([]);
    expect(source.total).toBe(0);
  });

  it("plant Fehler aus dem Startpunkt am nächsten Tag zuerst, mit ihrem Teilbereich", async () => {
    const database = createDatabase();
    const start = createStartPointRepository(database);
    await start.recordSpelling({
      word: "Hund",
      answer: "Hunt",
      stage: 6,
      roundId: "startpunkt-1",
      attemptId: "spelling:3:0",
      now: new Date(2026, 9, 20, 9).toISOString(),
    });
    await start.recordMath({
      task: parseMentalMathTask("7 * 8")!,
      answer: "54",
      roundId: "startpunkt-2",
      attemptId: "math:3:0",
      now: new Date(2026, 9, 20, 9, 5).toISOString(),
    });

    const source = await createDailyTrainingRepository(database).load(
      new Date(2026, 9, 21, 9),
    );
    expect(source.total).toBe(2);
    expect(source.done).toBe(0);
    const plan = planTraining({
      items: source.openItems,
      minutes: 10,
      profile: source.profile,
    });
    expect(plan.steps).toHaveLength(2);
    expect(plan.steps.every((step) => step.item.kind === "error")).toBe(true);
    const labels = plan.steps.map((step) => step.area?.label);
    expect(labels).toContain("Auslautverhärtung");
    expect(labels).toContain("Mal: Reihe 7");
    expect(trainingSegments(plan.steps)).toHaveLength(2);
  });

  it("zählt Elemente, die heute schon beantwortet wurden, als erledigt", async () => {
    const database = createDatabase();
    const start = createStartPointRepository(database);
    await start.recordSpelling({
      word: "Hund",
      answer: "Hunt",
      stage: 6,
      roundId: "startpunkt-1",
      attemptId: "spelling:3:0",
      now: new Date(2026, 9, 20, 9).toISOString(),
    });
    const repository = createDailyTrainingRepository(database);
    await repository.load(new Date(2026, 9, 21, 9));
    await start.recordSpelling({
      word: "Hund",
      answer: "Hund",
      stage: 6,
      roundId: "heute-1",
      attemptId: "0",
      now: new Date(2026, 9, 21, 9, 30).toISOString(),
    });
    const source = await repository.load(new Date(2026, 9, 21, 10));
    expect(source.done).toBe(1);
    expect(source.openItems).toEqual([]);
  });
});
