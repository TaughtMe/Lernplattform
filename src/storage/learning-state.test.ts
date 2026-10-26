import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";
import { createLearningBoxCard } from "../domain/learning-box";
import {
  hasDeviceLearningState,
  hasPersonalLearningState,
} from "./learning-state";
import { PersonalLearningDatabase } from "./personal-learning-events";
import { StudentClassesDatabase } from "./student-classes";

const databases: PersonalLearningDatabase[] = [];
const classDatabases: StudentClassesDatabase[] = [];

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
  for (const database of classDatabases.splice(0)) {
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

describe("hasDeviceLearningState", () => {
  function openClasses() {
    const database = new StudentClassesDatabase(
      `klassen-${databases.length}-${Math.random()}`,
    );
    classDatabases.push(database);
    return database;
  }

  it("ist auf einem leeren Gerät falsch, auch mit zufälligem Tier", async () => {
    const parts = { personal: open(), classes: openClasses() };
    expect(await hasDeviceLearningState({ ...parts, profile: null })).toBe(
      false,
    );
    expect(
      await hasDeviceLearningState({
        ...parts,
        profile: { figure: null, figuresUnlocked: undefined },
      }),
    ).toBe(false);
  });

  it("zählt persönlichen Lernstand, Klassen, Aufgaben und eine gewählte Figur", async () => {
    const personal = open();
    await personal.wordBoxes.put({ id: "wort" } as never);
    expect(
      await hasDeviceLearningState({
        personal,
        classes: openClasses(),
        profile: null,
      }),
    ).toBe(true);

    for (const table of ["memberships", "assignments"] as const) {
      const classes = openClasses();
      await classes[table].put({ id: "x", membershipId: "x" } as never);
      expect(
        await hasDeviceLearningState({
          personal: open(),
          classes,
          profile: null,
        }),
        table,
      ).toBe(true);
    }

    expect(
      await hasDeviceLearningState({
        personal: open(),
        classes: openClasses(),
        profile: { figure: "marie", figuresUnlocked: true } as never,
      }),
    ).toBe(true);
  });
});
