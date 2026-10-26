import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import type { LearningEventV1 } from "../domain/learning-bundle";
import { learningWordId } from "../domain/learning-word-progress";
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
  it("retries an identical event but rejects changes and skips corrupt stored data", async () => {
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
    // Unlesbare Datensätze werden übersprungen, nicht gelöscht (Regel S-1).
    expect(await repository.get(original.id)).toBeUndefined();
    expect(await repository.list()).toEqual([]);
    expect(await db.learningEvents.count()).toBe(1);
    await expect(repository.put(original)).rejects.toThrow("nicht verändert");
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

  it("A-1/A-2: Box 5 → Lernarchiv nur auf Stufe 6; Archivwörter sind nicht fällig", async () => {
    const db = createDatabase();
    const repository = createLearningWordProgressRepository(db);
    const base = {
      correct: true,
      usedHelp: false,
      selfCorrected: false,
      mode: "due" as const,
      now: "2026-09-08T09:00:00.000Z",
    };
    const stored = (word: string) => ({
      id: learningWordId(word),
      word,
      stage: 6 as const,
      box: 5 as const,
      dueAt: "2026-09-07T09:00:00.000Z",
      attempts: 4,
      incorrectAttempts: 0,
      helpUses: 0,
      lastPracticedAt: "2026-08-08T09:00:00.000Z",
    });
    await db.learningWordProgress.bulkPut([stored("Haus"), stored("Baum")]);

    await repository.recordAttempt({
      ...base,
      words: ["Haus"],
      stage: 6,
      roundId: "r1",
      attemptId: "1",
    });
    await repository.recordAttempt({
      ...base,
      words: ["Baum"],
      stage: 5,
      roundId: "r2",
      attemptId: "1",
    });

    const byWord = Object.fromEntries(
      (await repository.list()).map((entry) => [entry.word, entry]),
    );
    expect(byWord["Haus"]).toMatchObject({
      box: 6,
      dueAt: "2026-10-08T09:00:00.000Z",
    });
    expect(byWord["Baum"]).toMatchObject({ box: 5 });

    // Auch nach Ablauf der 30 Tage ist das Archivwort nie regulär fällig.
    const later = "2026-11-01T09:00:00.000Z";
    expect((await repository.listDue(later)).map((e) => e.word)).toEqual([
      "Baum",
    ]);
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
