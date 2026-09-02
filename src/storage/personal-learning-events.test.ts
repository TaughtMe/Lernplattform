import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import type { LearningEventV1 } from "../domain/learning-bundle";
import {
  createPersonalLearningEventRepository,
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
  it("stores, reads and removes learning events", async () => {
    const repository = createPersonalLearningEventRepository(createDatabase());
    const first = event("first", "2026-08-12T09:00:00.000Z");
    const second = event("second", "2026-08-12T10:00:00.000Z");

    await repository.put(first);
    await repository.put(second);

    await expect(repository.get("first")).resolves.toEqual(first);
    await expect(repository.list()).resolves.toEqual([second, first]);

    await repository.remove("first");
    await expect(repository.get("first")).resolves.toBeUndefined();
  });
});
