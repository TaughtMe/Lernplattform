import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import type { LearningEventV1 } from "../domain/learning-bundle";
import {
  createPersonalLearningEventRepository,
  createLearningWordProgressRepository,
  createTypingProgressRepository,
  PersonalLearningDatabase,
} from "./personal-learning-events";

const databases: PersonalLearningDatabase[] = [];

function createDatabase(): PersonalLearningDatabase {
  const database = new PersonalLearningDatabase(`test-${crypto.randomUUID()}`);
  databases.push(database);
  return database;
}

function event(id: string, occurredAt: string): LearningEventV1 {
  return {
    id,
    learningObjectId: "library",
    occurredAt,
    source: "learning-box",
    roundId: "round-1",
    direction: "prompt-to-answer",
    answerMode: "typed",
    help: "none",
    assessment: {
      knowledge: "correct",
      writing: "correct",
      selfCorrected: false,
    },
  };
}

afterEach(async () => {
  await Promise.all(
    databases.splice(0).map(async (database) => {
      database.close();
      await database.delete();
    }),
  );
});

describe("personal learning event repository", () => {
  it("retries an identical event but rejects changes and corrupt stored data", async () => {
    const db = createDatabase();
    const repository = createPersonalLearningEventRepository(db);
    const original = event("immutable", "2026-08-12T09:00:00.000Z");
    await Promise.all([repository.put(original), repository.put(original)]);
    expect(await repository.list()).toHaveLength(1);
    await expect(
      repository.put({ ...original, roundId: "changed" }),
    ).rejects.toThrow("nicht verändert");
    expect(await repository.get(original.id)).toEqual(original);
    await db.learningEvents.put({ ...original, occurredAt: "invalid" });
    await expect(repository.get(original.id)).rejects.toThrow();
    await expect(repository.list()).rejects.toThrow();
  });

  it("counts different word attempts but processes a retry only once", async () => {
    const db = createDatabase();
    const repository = createLearningWordProgressRepository(db);
    const attempt = {
      words: ["Haus"],
      correct: false,
      usedHelp: false,
      selfCorrected: false,
      stage: 2 as const,
      roundId: "round",
      attemptId: "1",
      now: "2026-09-08T09:00:00.000Z",
    };
    await Promise.all([
      repository.recordAttempt(attempt),
      repository.recordAttempt(attempt),
    ]);
    await repository.recordAttempt({ ...attempt, attemptId: "2" });
    await repository.recordAttempt({
      ...attempt,
      attemptId: "3",
      correct: true,
      selfCorrected: true,
    });
    expect(await repository.list()).toMatchObject([
      { attempts: 3, incorrectAttempts: 2, box: 1 },
    ]);
    expect(await db.learningEvents.count()).toBe(3);
  });

  it("keeps concurrent typing rounds and deduplicates a repeated completion", async () => {
    const db = createDatabase();
    const repository = createTypingProgressRepository(db);
    const stats = {
      totalChars: 10,
      correctChars: 10,
      errorCount: 0,
      accuracy: 100,
      elapsedMs: 10000,
      cpm: 60,
      wpm: 12,
      corrections: 0,
      problemChars: [],
    };
    await Promise.all([
      repository.recordAttempt("lesson", stats, "round-1"),
      repository.recordAttempt("lesson", stats, "round-2"),
      repository.recordAttempt("lesson", stats, "round-1"),
    ]);
    expect(await repository.list()).toMatchObject([
      { attempts: 2, completed: true },
    ]);
    expect(await db.learningEvents.count()).toBe(2);
  });
  it("stores and reads learning events without exposing individual deletion", async () => {
    const repository = createPersonalLearningEventRepository(createDatabase());
    const first = event("first", "2026-08-12T09:00:00.000Z");
    const second = event("second", "2026-08-12T10:00:00.000Z");

    await repository.put(first);
    await repository.put(second);

    await expect(repository.get("first")).resolves.toEqual(first);
    await expect(repository.list()).resolves.toEqual([second, first]);

    expect(repository).not.toHaveProperty("remove");
    await expect(repository.get("missing")).resolves.toBeUndefined();
  });
});
