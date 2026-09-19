import "fake-indexeddb/auto";
import { afterEach, expect, it } from "vitest";
import { PersonalLearningDatabase } from "./personal-learning-events";
import {
  createMathAttempt,
  createMathPracticeRepository,
} from "./math-practice";
import { createLearningRecommendationRepository } from "./learning-recommendations";
import { parseMentalMathTask } from "../domain/mental-math";

const databases: PersonalLearningDatabase[] = [];
afterEach(async () => {
  for (const db of databases.splice(0)) await db.delete();
});
const attempt = () =>
  createMathAttempt({
    task: parseMentalMathTask("7 * 8")!,
    answer: "54",
    roundId: "lesson",
    attemptId: "1",
    source: "running-dictation",
    selfCorrected: false,
    usedHelp: false,
    now: "2026-09-18T10:00:00.000Z",
  });

it("stores attempts once, survives reopening and rejects changed or corrupt data", async () => {
  const name = `math-${crypto.randomUUID()}`;
  const db = new PersonalLearningDatabase(name);
  databases.push(db);
  const repo = createMathPracticeRepository(db);
  const event = await attempt();
  await Promise.all([repo.put(event), repo.put(event)]);
  expect(await repo.list()).toHaveLength(1);
  await expect(
    repo.put({ ...event, math: { ...event.math!, answer: "55" } }),
  ).rejects.toThrow("nicht verändert");
  db.close();
  const reopened = new PersonalLearningDatabase(name);
  databases.push(reopened);
  const next = createMathPracticeRepository(reopened);
  expect((await next.reviews())[0]).toMatchObject({
    errors: 1,
    task: { answer: 56 },
  });
  expect((await next.list())[0]!.math!.answer).toBe("54");
  await reopened.learningEvents.put({
    ...event,
    math: { ...event.math!, answer: 42 },
  } as never);
  await expect(next.list()).rejects.toThrow();
  reopened.close();
});

it("deduplicates repeated task errors and supplies today's actual practice route", async () => {
  const db = new PersonalLearningDatabase(`math-${crypto.randomUUID()}`);
  databases.push(db);
  const repo = createMathPracticeRepository(db);
  const event = await attempt();
  await repo.put(event);
  await repo.put({
    ...event,
    id: "second",
    occurredAt: "2026-09-18T11:00:00.000Z",
  });
  expect(await repo.reviews()).toHaveLength(1);
  expect((await repo.reviews())[0]!.errors).toBe(2);
  const recommendations = createLearningRecommendationRepository(db);
  expect(
    await recommendations.list({
      enabledModules: ["mathematics"],
      now: "2026-09-18T12:00:00.000Z",
    }),
  ).toEqual([
    expect.objectContaining({
      module: "mathematics",
      route: "/frei/mathematics",
      reason: "error",
      amount: 1,
    }),
  ]);
  expect(
    await recommendations.list({
      enabledModules: ["german"],
      now: "2026-09-18T12:00:00.000Z",
    }),
  ).toEqual([]);
});

it("validates attempts without opening storage", async () => {
  await expect(
    createMathAttempt({
      task: parseMentalMathTask("7 * 8")!,
      answer: "0",
      roundId: "r",
      attemptId: "1",
      selfCorrected: false,
      usedHelp: false,
      options: { operations: [], count: 5, maxValue: 20 },
    }),
  ).rejects.toThrow();
});
