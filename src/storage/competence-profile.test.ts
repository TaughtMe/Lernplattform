import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { learningWordId } from "../domain/learning-word-progress";
import { createCompetenceProfileRepository } from "./competence-profile";
import {
  PersonalLearningDatabase,
  createLearningBoxRepository,
  createLearningWordProgressRepository,
  createWordBoxRepository,
} from "./personal-learning-events";

const databases: PersonalLearningDatabase[] = [];

function createDatabase() {
  const database = new PersonalLearningDatabase(
    `profile-${crypto.randomUUID()}`,
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

const local = (day: number, hour = 9) => new Date(2026, 9, day, hour);

describe("Kompetenzprofil aus dem Speicher", () => {
  it("liefert alle festen Wortboxen als „neu“, ohne etwas zu schreiben", async () => {
    const database = createDatabase();
    const profile = await createCompetenceProfileRepository(database).load(
      local(25).getTime(),
    );
    const boxes = profile.entries.filter((entry) => entry.kind === "wortbox");
    expect(boxes).toHaveLength(8);
    expect(boxes.every((entry) => entry.level === "neu")).toBe(true);
    expect(await database.learningEvents.count()).toBe(0);
    expect(await database.dailyPlans.count()).toBe(0);
  });

  it("zeigt ein geübtes Wort als begonnen und ordnet es seiner Wortbox zu", async () => {
    const database = createDatabase();
    await createLearningWordProgressRepository(database).recordAttempt({
      words: ["Hund"],
      correct: true,
      usedHelp: false,
      selfCorrected: false,
      stage: 6,
      roundId: "r1",
      attemptId: "a1",
      mode: "due",
      now: local(20).toISOString(),
    });
    const profile = await createCompetenceProfileRepository(database).load(
      local(25).getTime(),
    );
    const box = profile.entries.find(
      (entry) => entry.id === "wortbox:final-devoicing",
    );
    expect(box).toMatchObject({ level: "im-aufbau", started: 1, safe: 0 });
    expect(profile.objectAreas.get(learningWordId("Hund"))).toContain(
      "wortbox:final-devoicing",
    );
  });

  it("nimmt eigene Wortboxen und Vokabelstapel mit", async () => {
    const database = createDatabase();
    const own = await createWordBoxRepository(database).create("Meine Wörter", [
      "Haus",
    ]);
    const cards = createLearningBoxRepository(database);
    const deck = await cards.createDeck({ title: "Unit 3" });
    await cards.addCard({ deckId: deck.id, question: "dog", answer: "Hund" });
    const profile = await createCompetenceProfileRepository(database).load(
      local(25).getTime(),
    );
    const ids = profile.entries.map((entry) => entry.id);
    expect(ids).toContain(`wortbox:${own.id}`);
    expect(ids).toContain(`vokabelstapel:${deck.id}`);
  });
});
