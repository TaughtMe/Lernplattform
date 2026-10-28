import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { learningWordId } from "../domain/learning-word-progress";
import { parseMentalMathTask } from "../domain/mental-math";
import { mathReviews } from "../domain/math-practice";
import { dailyPlanCandidates } from "./daily-plan";
import { createStartPointRepository } from "./start-point";
import { PersonalLearningDatabase } from "./personal-learning-events";

const databases: PersonalLearningDatabase[] = [];

function createDatabase() {
  const database = new PersonalLearningDatabase(
    `startpunkt-${crypto.randomUUID()}`,
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

const NOW = new Date(2026, 9, 20, 9, 0);
const LATER = new Date(2026, 9, 22, 9, 0).toISOString();

describe("Startpunkt: Antworten als Lernereignisse", () => {
  it("speichert eine falsche Rechtschreib-Antwort als Ereignis und macht das Wort fällig", async () => {
    const database = createDatabase();
    const repository = createStartPointRepository(database);
    const correct = await repository.recordSpelling({
      word: "Hund",
      answer: "Hunt",
      stage: 6,
      roundId: "startpunkt-1",
      attemptId: "spelling:3:0",
      now: NOW.toISOString(),
    });
    expect(correct).toBe(false);

    const events = await database.learningEvents.toArray();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      learningObjectId: learningWordId("Hund"),
      learningArea: "german",
      source: "learning-word",
      assessment: { knowledge: "incorrect", writing: "incorrect" },
    });
    // Kein Klassenbezug: Der Startpunkt kommt in keinen Leistungsbrief.
    expect(events[0]).not.toHaveProperty("classContext");

    const words = await database.learningWordProgress.toArray();
    expect(words[0]).toMatchObject({
      word: "Hund",
      box: 1,
      incorrectAttempts: 1,
    });
    const candidates = dailyPlanCandidates(
      {
        events,
        cards: [],
        words,
      },
      LATER,
    );
    expect(candidates).toEqual([
      expect.objectContaining({ module: "german", kind: "error" }),
    ]);
  });

  it("nimmt eine richtige Antwort ohne Hilfe als gewöhnlichen Versuch", async () => {
    const database = createDatabase();
    const correct = await createStartPointRepository(database).recordSpelling({
      word: "Biene",
      answer: "Biene",
      stage: 3,
      roundId: "startpunkt-1",
      attemptId: "spelling:0:0",
      now: NOW.toISOString(),
    });
    expect(correct).toBe(true);
    expect((await database.learningEvents.toArray())[0]).toMatchObject({
      assessment: { knowledge: "correct" },
      help: "none",
    });
  });

  it("zählt Groß- und Kleinschreibung als Fehler", async () => {
    const database = createDatabase();
    const correct = await createStartPointRepository(database).recordSpelling({
      word: "Hund",
      answer: "hund",
      stage: 6,
      roundId: "startpunkt-1",
      attemptId: "spelling:3:0",
    });
    expect(correct).toBe(false);
  });

  it("speichert eine falsche Rechen-Antwort als Posten, der sofort fällig ist", async () => {
    const database = createDatabase();
    const repository = createStartPointRepository(database);
    const task = parseMentalMathTask("7 * 8")!;
    expect(
      await repository.recordMath({
        task,
        answer: "54",
        roundId: "startpunkt-2",
        attemptId: "math:3:0",
        now: NOW.toISOString(),
      }),
    ).toBe(false);
    expect(
      await repository.recordMath({
        task: parseMentalMathTask("3 + 4")!,
        answer: "7",
        roundId: "startpunkt-2",
        attemptId: "math:0:0",
        now: NOW.toISOString(),
      }),
    ).toBe(true);

    const events = await database.learningEvents.toArray();
    expect(events).toHaveLength(2);
    expect(events.every((event) => event.classContext === undefined)).toBe(
      true,
    );
    const reviews = mathReviews(events);
    // Nur der Fehler wird zum Wiederholungsposten.
    expect(reviews).toHaveLength(1);
    expect(reviews[0]).toMatchObject({ step: 0, errors: 1 });
  });

  it("speichert dieselbe Antwort nicht doppelt", async () => {
    const database = createDatabase();
    const repository = createStartPointRepository(database);
    const input = {
      word: "Hund",
      answer: "Hunt",
      stage: 6 as const,
      roundId: "startpunkt-1",
      attemptId: "spelling:3:0",
      now: NOW.toISOString(),
    };
    await repository.recordSpelling(input);
    await repository.recordSpelling(input);
    expect(await database.learningEvents.count()).toBe(1);
  });
});
