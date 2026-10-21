import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";
import { createLearningBoxCard } from "../domain/learning-box";
import { hasPersonalLearningState } from "./learning-state";
import { PersonalLearningDatabase } from "./personal-learning-events";

const databases: PersonalLearningDatabase[] = [];

function open() {
  const database = new PersonalLearningDatabase(
    `lernstand-${databases.length}`,
  );
  databases.push(database);
  return database;
}

afterEach(async () => {
  for (const database of databases.splice(0)) {
    database.close();
    await Dexie.delete(database.name);
  }
});

describe("hasPersonalLearningState", () => {
  it("ist auf einem leeren Gerät falsch", async () => {
    expect(await hasPersonalLearningState(open())).toBe(false);
  });

  it("zählt LernBox-Karten", async () => {
    const database = open();
    await database.learningBoxCards.put(
      createLearningBoxCard({
        deckId: "stapel",
        question: "Frage",
        answer: "Antwort",
        now: 1,
      }),
    );
    expect(await hasPersonalLearningState(database)).toBe(true);
  });

  it("zählt Lernwörter, Runden und Lernereignisse, ohne sie zu prüfen", async () => {
    // Beschädigte Datensätze sind trotzdem Lernstand.
    for (const table of [
      "learningWordProgress",
      "wordRounds",
      "learningEvents",
      "typingProgress",
      "textboxSessions",
      "wordBoxes",
      "learningBoxDecks",
      "learningBoxFolders",
    ] as const) {
      const database = open();
      await database[table].put({ id: "kaputt" } as never);
      expect(await hasPersonalLearningState(database), table).toBe(true);
    }
  });

  it("zählt die kurzlebige Tagesportion nicht", async () => {
    const database = open();
    await database.dailyPlans.put({ day: "2026-10-21" } as never);
    expect(await hasPersonalLearningState(database)).toBe(false);
  });
});
