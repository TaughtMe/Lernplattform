import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import {
  createLearningBoxCard,
  createLearningBoxDeck,
  createLearningBoxFolder,
} from "../domain/learning-box";
import {
  createPersonalLearningBackup,
  personalBackupCardSchema,
  personalBackupDeckSchema,
  personalBackupFolderSchema,
  personalBackupTableSchemas,
  personalLearningBackupSchema,
  PERSONAL_BACKUP_KIND,
  parsePersonalLearningBackup,
} from "../domain/personal-backup";
import type { WordRoundRecord } from "../domain/word-store-progress";
import {
  exportPersonalLearningBackup,
  restorePersonalLearningBackup,
  restorePersonalLearningBackupText,
  serializePersonalLearningBackupFromDatabase,
} from "./personal-backup";
import {
  createLearningBoxRepository,
  createLearningWordProgressRepository,
  createPersonalLearningEventRepository,
  createWordBoxRepository,
  createWordRoundRepository,
  PersonalLearningDatabase,
} from "./personal-learning-events";

const databases: PersonalLearningDatabase[] = [];

function createDatabase() {
  const database = new PersonalLearningDatabase(
    `struktur-${crypto.randomUUID()}`,
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

/**
 * Tabellen der Datenbank, die bewusst nicht in der Sicherung stehen. Wer eine
 * neue Tabelle anlegt, muss sie ins Sicherungsschema aufnehmen oder hier mit
 * Begründung ausnehmen (Regel S-3).
 */
const NOT_IN_BACKUP: Readonly<Record<string, string>> = {
  dailyPlans:
    "Tagesportion je lokalem Tag: kurzlebig und wird jederzeit aus dem Lernstand neu berechnet.",
};

const NOW = "2026-10-09T09:00:00.000Z";

describe("Sicherung: Struktur", () => {
  it("deckt jede Tabelle der Datenbank ab oder nennt eine Begründung", () => {
    const database = createDatabase();
    const tables = database.tables.map((table) => table.name).sort();
    const inBackup = Object.keys(personalBackupTableSchemas);
    const backupData = Object.keys(
      personalLearningBackupSchema.shape.data.shape,
    );

    // Jede Tabelle steht im Schema oder in der Ausnahmeliste, nicht in beidem.
    for (const table of tables) {
      const covered = inBackup.includes(table);
      const excepted = table in NOT_IN_BACKUP;
      expect(
        covered !== excepted,
        `Tabelle „${table}“ fehlt im Sicherungsschema und in der Ausnahmeliste (oder steht in beiden).`,
      ).toBe(true);
    }
    // Keine Ausnahme und kein Schema für Tabellen, die es nicht mehr gibt.
    expect(inBackup.every((table) => tables.includes(table))).toBe(true);
    expect(Object.keys(NOT_IN_BACKUP).every((t) => tables.includes(t))).toBe(
      true,
    );
    expect(Object.values(NOT_IN_BACKUP).every((reason) => reason)).toBe(true);
    // Lese- und Schreibschema der Sicherung nennen dieselben Tabellen.
    expect(backupData.sort()).toEqual([...inBackup].sort());
  });

  it("kennt jedes Feld von Ordnern, Stapeln und Karten", () => {
    const folder = createLearningBoxFolder({ title: "Buch" });
    const deck = createLearningBoxDeck({
      title: "Unit 1",
      folderId: folder.id,
    });
    const card = {
      ...createLearningBoxCard({
        deckId: deck.id,
        question: "a",
        answer: "b",
        tag: "t",
      }),
      sourceLinks: [],
    };
    expect(personalBackupFolderSchema.safeParse(folder).success).toBe(true);
    expect(personalBackupDeckSchema.safeParse(deck).success).toBe(true);
    expect(personalBackupCardSchema.safeParse(card).success).toBe(true);
    expect(Object.keys(deck).sort()).toEqual(
      expect.arrayContaining(["folderId"]),
    );
  });
});

function round(boxId: string): WordRoundRecord {
  return {
    id: "runde-1",
    boxId,
    boxTitle: "Eigene Wörter",
    stage: 1,
    startedAt: "2026-10-09T08:00:00.000Z",
    completedAt: NOW,
    words: [
      {
        word: "Sonne",
        firstTry: true,
        attempts: 1,
        usedHelp: false,
        firstResult: "richtig",
      },
    ],
    percent: 100,
  };
}

async function snapshot(database: PersonalLearningDatabase) {
  const byId = <T extends { id: string }>(rows: T[]) =>
    rows.sort((a, b) => a.id.localeCompare(b.id));
  return {
    learningEvents: byId(await database.learningEvents.toArray()),
    learningBoxDecks: byId(await database.learningBoxDecks.toArray()),
    learningBoxFolders: byId(await database.learningBoxFolders.toArray()),
    learningBoxCards: byId(await database.learningBoxCards.toArray()),
    learningWordProgress: byId(await database.learningWordProgress.toArray()),
    typingProgress: byId(await database.typingProgress.toArray()),
    textboxSessions: byId(await database.textboxSessions.toArray()),
    wordBoxes: byId(await database.wordBoxes.toArray()),
    wordRounds: byId(await database.wordRounds.toArray()),
  };
}

async function seed(database: PersonalLearningDatabase) {
  const box = createLearningBoxRepository(database);
  const folder = await box.createFolder("Buch Klasse 5");
  const inFolder = await box.createDeck({
    title: "Unit 1",
    folderId: folder.id,
  });
  const loose = await box.createDeck({ title: "Lose Karten" });
  await box.addCard({
    deckId: inFolder.id,
    question: "library",
    answer: "Bibliothek",
  });
  await box.addCard({ deckId: loose.id, question: "school", answer: "Schule" });
  const words = createLearningWordProgressRepository(database);
  await words.recordAttempt({
    words: ["Sonne"],
    correct: false,
    usedHelp: false,
    selfCorrected: false,
    stage: 1,
    roundId: "r1",
    attemptId: "a1",
    now: NOW,
  });
  const boxes = createWordBoxRepository(database);
  const wordBox = await boxes.create("Eigene Wörter", ["Sonne", "Mond"]);
  await createWordRoundRepository(database).save(round(wordBox.id));
  await database.typingProgress.add({
    id: "lektion-1",
    completed: true,
    bestWpm: 20,
    bestAccuracy: 95,
    attempts: 2,
    lastPracticedAt: NOW,
    problemChars: [{ char: "ß", errors: 2 }],
  });
  return { folder, inFolder, loose };
}

describe("Sicherung mit LernBox-Ordnern", () => {
  it("sichert und stellt Ordner, Stapel, Lernwörter und Runden wieder her", async () => {
    const source = createDatabase();
    const { folder, inFolder } = await seed(source);

    const text = await serializePersonalLearningBackupFromDatabase(source, NOW);
    const target = createDatabase();
    const result = await restorePersonalLearningBackupText(text, target);

    expect(result.conflicts).toEqual([]);
    expect(result.skipped).toEqual([]);
    expect(await snapshot(target)).toEqual(await snapshot(source));
    expect((await target.learningBoxFolders.get(folder.id))?.title).toBe(
      "Buch Klasse 5",
    );
    expect((await target.learningBoxDecks.get(inFolder.id))?.folderId).toBe(
      folder.id,
    );
    // Zweites Einspielen ändert nichts.
    expect(await restorePersonalLearningBackupText(text, target)).toMatchObject(
      { added: 0, updated: 0, conflicts: [] },
    );
  });

  it("entfernt beim Einspielen eine folderId ohne Ordner", async () => {
    const orphan = createLearningBoxDeck({ title: "Waise", folderId: "weg" });
    const backup = createPersonalLearningBackup({
      learningEvents: [],
      learningBoxDecks: [orphan],
      learningBoxCards: [],
      learningWordProgress: [],
      typingProgress: [],
    });
    const target = createDatabase();
    await restorePersonalLearningBackup(backup, target);
    const stored = await target.learningBoxDecks.get(orphan.id);
    expect(stored).toBeDefined();
    expect(stored).not.toHaveProperty("folderId");
  });

  it("behält eine folderId, wenn der Ordner schon auf dem Gerät liegt", async () => {
    const target = createDatabase();
    const folder = await createLearningBoxRepository(target).createFolder("A");
    const deck = createLearningBoxDeck({ title: "B", folderId: folder.id });
    await restorePersonalLearningBackup(
      createPersonalLearningBackup({
        learningEvents: [],
        learningBoxDecks: [deck],
        learningBoxCards: [],
        learningWordProgress: [],
        typingProgress: [],
      }),
      target,
    );
    expect((await target.learningBoxDecks.get(deck.id))?.folderId).toBe(
      folder.id,
    );
  });

  it("liest ältere Sicherungen ohne Ordner", async () => {
    const source = createDatabase();
    await seed(source);
    const current = await exportPersonalLearningBackup(source, NOW);
    const old = JSON.parse(JSON.stringify(current)) as {
      data: Record<string, unknown>;
    };
    delete old.data["learningBoxFolders"];
    const parsed = parsePersonalLearningBackup(old);
    expect(parsed.data.learningBoxFolders).toEqual([]);
  });
});

describe("Sicherung aus einer neueren App-Version", () => {
  async function newerBackup() {
    const source = createDatabase();
    await seed(source);
    await createPersonalLearningEventRepository(source).put({
      id: "e1",
      learningObjectId: "library",
      occurredAt: NOW,
      source: "learning-box",
      roundId: "r",
      direction: "prompt-to-answer",
      answerMode: "typed",
      help: "none",
      assessment: {
        knowledge: "correct",
        writing: "correct",
        selfCorrected: false,
      },
    });
    const backup = JSON.parse(
      JSON.stringify(await exportPersonalLearningBackup(source, NOW)),
    ) as {
      data: {
        learningEvents: Record<string, unknown>[];
        learningBoxDecks: Record<string, unknown>[];
        wordRounds: Record<string, unknown>[];
      };
    };
    return backup;
  }

  it("spielt Datensätze mit Zusatzfeldern ein und entfernt die Felder", async () => {
    const backup = await newerBackup();
    backup.data.learningEvents[0]!["confidence"] = 0.4;
    backup.data.learningBoxDecks[0]!["farbe"] = "blau";
    const target = createDatabase();

    const result = await restorePersonalLearningBackup(backup, target);

    expect(result.skipped).toEqual([]);
    expect(await target.learningEvents.get("e1")).not.toHaveProperty(
      "confidence",
    );
    expect(await target.learningBoxDecks.count()).toBe(2);
    expect(
      await target.learningBoxDecks
        .toArray()
        .then((decks) => decks.some((deck) => "farbe" in deck)),
    ).toBe(false);
  });

  it("überspringt einzelne ungültige Datensätze und zählt sie", async () => {
    const backup = await newerBackup();
    backup.data.learningEvents.push({
      ...backup.data.learningEvents[0]!,
      id: "e2",
      source: "future-module",
    });
    const target = createDatabase();

    const result = await restorePersonalLearningBackup(backup, target);

    expect(result.skipped).toEqual([{ table: "learningEvents", id: "e2" }]);
    // Ereignis „e1“ und der Versuch aus `seed`; „e2“ fehlt.
    expect(await target.learningEvents.count()).toBe(2);
    expect(await target.learningEvents.get("e2")).toBeUndefined();
    expect(await target.wordRounds.count()).toBe(1);
  });

  it("lehnt eine höhere schemaVersion mit klarer Meldung ab", async () => {
    const backup = (await newerBackup()) as unknown as Record<string, unknown>;
    backup["schemaVersion"] = 2;
    backup["kind"] = PERSONAL_BACKUP_KIND;
    const target = createDatabase();
    await expect(restorePersonalLearningBackup(backup, target)).rejects.toThrow(
      "Diese Sicherung stammt aus einer neueren App-Version. Bitte zuerst die App aktualisieren.",
    );
    expect(await target.learningEvents.count()).toBe(0);
  });

  it("lehnt unbekannte Tabellen weiterhin ab", async () => {
    const backup = await newerBackup();
    (backup.data as Record<string, unknown>)["classMemberships"] = [];
    await expect(
      restorePersonalLearningBackup(backup, createDatabase()),
    ).rejects.toThrow();
  });

  it("sichert trotz Zusatzfeld im Speicher und lässt Unlesbares in der Datenbank", async () => {
    const source = createDatabase();
    await seed(source);
    const [deck] = await source.learningBoxDecks.toArray();
    await source.learningBoxDecks.put({ ...deck!, farbe: "blau" } as never);
    await source.learningEvents.add({
      id: "neu",
      source: "future-module",
    } as never);

    const backup = await exportPersonalLearningBackup(source, NOW);

    expect(backup.data.learningBoxDecks).toHaveLength(2);
    expect(backup.data.learningEvents).toHaveLength(1);
    expect(await source.learningEvents.count()).toBe(2);
  });
});
