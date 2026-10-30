import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";
import { LEARNING_WORD_COLLECTIONS } from "../domain/german-learning-content";
import {
  createPersonalLearningBackup,
  parsePersonalLearningBackup,
} from "../domain/personal-backup";
import {
  WORD_BOX_LIMITS,
  wordListBoxId,
  type WordBox,
} from "../domain/word-box";
import type { WordRoundRecord } from "../domain/word-store-progress";
import {
  exportPersonalLearningBackup,
  restorePersonalLearningBackup,
  serializePersonalLearningBackupFromDatabase,
} from "./personal-backup";
import {
  PersonalLearningDatabase,
  createLearningWordProgressRepository,
  createWordBoxRepository,
  createWordRoundRepository,
} from "./personal-learning-events";

const databases: PersonalLearningDatabase[] = [];

function createDatabase() {
  const database = new PersonalLearningDatabase(
    `wortspeicher-${crypto.randomUUID()}`,
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

const t0 = new Date("2026-10-09T08:00:00.000Z");
const t1 = new Date("2026-10-09T09:00:00.000Z");

function roundRecord(
  id: string,
  overrides: Partial<WordRoundRecord> = {},
): WordRoundRecord {
  return {
    id,
    boxId: "double-consonants",
    boxTitle: "Doppelkonsonanten",
    stage: 1,
    startedAt: t0.toISOString(),
    completedAt: t1.toISOString(),
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
    ...overrides,
  };
}

describe("Migration auf Version 6", () => {
  it("behält alle bisherigen Daten, auch die Textbox", async () => {
    const name = `migration-${crypto.randomUUID()}`;
    const old = new Dexie(name);
    old.version(5).stores({
      learningEvents: "id, learningObjectId, occurredAt, roundId",
      learningBoxDecks:
        "id, title, createdAt, folderId, source.kind, source.sourceId",
      learningBoxCards:
        "id, deckId, fingerprint, [deckId+fingerprint], nextReview, reverseNextReview, createdAt, source.kind, source.sourceId",
      learningBoxFolders: "id, title, createdAt",
      learningWordProgress: "id, dueAt, stage, box, lastPracticedAt",
      typingProgress: "id, completed, lastPracticedAt",
      textboxSessions: "id, textId, status, completedAt",
    });
    await old.table("learningWordProgress").add({
      id: "learning-word:haus",
      word: "Haus",
      stage: 2,
      box: 2,
      dueAt: t0.toISOString(),
      attempts: 3,
      incorrectAttempts: 1,
      helpUses: 0,
      lastPracticedAt: t0.toISOString(),
    });
    await old
      .table("textboxSessions")
      .add({ id: "alt", textId: "TXT-001", status: "laufend" });
    old.close();

    const database = new PersonalLearningDatabase(name);
    databases.push(database);
    expect(
      await database.learningWordProgress.get("learning-word:haus"),
    ).toMatchObject({
      attempts: 3,
    });
    expect(await database.textboxSessions.get("alt")).toBeDefined();
    expect(await database.wordBoxes.count()).toBe(0);
    expect(await database.wordRounds.count()).toBe(0);
  });
});

describe("Wortbox-Repository", () => {
  it("legt Wortboxen an, benennt sie um und löscht sie", async () => {
    const repository = createWordBoxRepository(createDatabase());
    const box = await repository.create(
      "Meine Wörter",
      ["Sonne", "Mond", "sonne"],
      "eigen",
      t0,
    );
    expect(box.id).toMatch(/^eigen-[0-9a-f-]{36}$/);
    expect(box.words.map((w) => w.text)).toEqual(["Sonne", "Mond"]);
    await repository.rename(box.id, "  Neuer Titel ", t1);
    expect((await repository.list())[0]).toMatchObject({
      title: "Neuer Titel",
      updatedAt: t1.toISOString(),
    });
    await repository.remove(box.id);
    expect(await repository.list()).toEqual([]);
  });

  it("prüft Titel und unbekannte Wortboxen", async () => {
    const repository = createWordBoxRepository(createDatabase());
    await expect(repository.create("   ")).rejects.toThrow();
    await expect(repository.create("x".repeat(61))).rejects.toThrow();
    await expect(
      repository.rename("eigen-00000000-0000-4000-8000-000000000000", "A"),
    ).rejects.toThrow(/nicht mehr/);
  });

  it("fügt Wörter hinzu, ändert und löscht sie", async () => {
    const repository = createWordBoxRepository(createDatabase());
    const box = await repository.create("Box");
    const result = await repository.addWords(
      box.id,
      ["Haus", "haus", "<b>", "Baum"],
      "eigen",
      t0,
    );
    expect(result).toEqual({ added: ["Haus", "Baum"], skipped: ["<b>"] });
    await repository.renameWord(box.id, "Baum", "Bäume", t1);
    await repository.removeWord(box.id, "Haus", t1);
    const [stored] = await repository.list();
    expect(stored!.words.map((w) => w.text)).toEqual(["Bäume"]);
  });

  it("hält die Grenze von 500 Wörtern ein", async () => {
    const repository = createWordBoxRepository(createDatabase());
    const box = await repository.create("Groß");
    const many = Array.from({ length: 502 }, (_, i) => `Wort${i}`);
    const result = await repository.addWords(box.id, many, "eigen");
    expect(result.added).toHaveLength(WORD_BOX_LIMITS.wordsPerBox);
    expect(result.skipped).toHaveLength(2);
  });

  it("erlaubt höchstens 50 eigene Wortboxen", async () => {
    const repository = createWordBoxRepository(createDatabase());
    for (let i = 0; i < WORD_BOX_LIMITS.ownBoxes; i += 1) {
      await repository.create(`Box ${i}`);
    }
    await expect(repository.create("Zu viel")).rejects.toThrow(/höchstens 50/);
    await expect(repository.copyCollection("umlaut")).rejects.toThrow(
      /höchstens 50/,
    );
  });

  it("kopiert eine feste Wortbox als eigene", async () => {
    const repository = createWordBoxRepository(createDatabase());
    const collection = LEARNING_WORD_COLLECTIONS[0]!;
    const copy = await repository.copyCollection(collection.id, t0);
    expect(copy).toMatchObject({
      title: `${collection.title} (Kopie)`,
      kind: "eigen",
    });
    expect(copy.words).toHaveLength(collection.words.length);
    expect(await repository.list()).toHaveLength(1);
    await expect(repository.copyCollection("gibt-es-nicht")).rejects.toThrow();
  });

  it("überspringt ungültige gespeicherte Wortboxen, ohne sie zu löschen", async () => {
    const database = createDatabase();
    await database.wordBoxes.add({ id: "kaputt" } as unknown as WordBox);
    expect(await createWordBoxRepository(database).list()).toEqual([]);
    expect(await database.wordBoxes.count()).toBe(1);
  });

  it("lässt den Lernstand eines Wortes beim Löschen aus der Wortbox bestehen", async () => {
    const database = createDatabase();
    const repository = createWordBoxRepository(database);
    const box = await repository.create("Box", ["Haus"]);
    await createLearningWordProgressRepository(database).recordAttempt({
      words: ["Haus"],
      correct: true,
      usedHelp: false,
      selfCorrected: false,
      stage: 6,
      roundId: "r",
      attemptId: "0:1",
    });
    await repository.removeWord(box.id, "Haus");
    await repository.remove(box.id);
    expect(await database.learningWordProgress.count()).toBe(1);
  });
});

describe("Lernwortliste der Lehrkraft (D4)", () => {
  const list = {
    packageId: "teacher-package-wl",
    title: "Wörter mit ie",
    words: ["Brief", "Sieb"],
    now: t0,
  };

  it("legt eine eigene Wortbox mit dem Titel als Namen an", async () => {
    const repository = createWordBoxRepository(createDatabase());
    const result = await repository.importWordList(list);
    expect(result).toMatchObject({ existed: false, added: 2, skipped: 0 });
    const boxes = await repository.list();
    expect(boxes).toHaveLength(1);
    expect(boxes[0]).toMatchObject({
      id: wordListBoxId("teacher-package-wl"),
      kind: "eigen",
      title: "Wörter mit ie",
    });
    expect(boxes[0]?.words.map((word) => word.text)).toEqual(["Brief", "Sieb"]);
  });

  it("legt dieselbe Liste beim zweiten Übernehmen nicht doppelt an", async () => {
    const database = createDatabase();
    const repository = createWordBoxRepository(database);
    await repository.importWordList(list);
    const again = await repository.importWordList({ ...list, now: t1 });
    expect(again).toMatchObject({ existed: true, added: 0 });
    expect(await database.wordBoxes.count()).toBe(1);
    // Nichts wurde verändert, auch nicht der Zeitstempel.
    expect((await repository.list())[0]?.updatedAt).toBe(t0.toISOString());
  });

  it("ergänzt nur neue Wörter und lässt den Namen einer vorhandenen Wortbox", async () => {
    const database = createDatabase();
    const repository = createWordBoxRepository(database);
    const first = await repository.importWordList(list);
    await repository.rename(first.box.id, "Meine ie-Wörter", t1);
    const again = await repository.importWordList({
      ...list,
      words: ["Brief", "Tiger"],
      now: t1,
    });
    expect(again).toMatchObject({ existed: true, added: 1 });
    const [box] = await repository.list();
    expect(box?.title).toBe("Meine ie-Wörter");
    expect(box?.words.map((word) => word.text)).toEqual([
      "Brief",
      "Sieb",
      "Tiger",
    ]);
  });

  it("legt für ein anderes Paket eine eigene Wortbox an", async () => {
    const repository = createWordBoxRepository(createDatabase());
    await repository.importWordList(list);
    await repository.importWordList({
      ...list,
      packageId: "teacher-package-2",
    });
    expect(await repository.list()).toHaveLength(2);
  });

  it("hält die Grenze von 50 eigenen Wortboxen ein, auch für Lernwortlisten", async () => {
    const repository = createWordBoxRepository(createDatabase());
    await repository.importWordList(list);
    for (let i = 1; i < WORD_BOX_LIMITS.ownBoxes; i += 1) {
      await repository.create(`Box ${i}`);
    }
    await expect(
      repository.importWordList({ ...list, packageId: "teacher-package-2" }),
    ).rejects.toThrow(/höchstens 50/);
    // Eine schon übernommene Liste lässt sich trotzdem erneut übernehmen.
    await expect(repository.importWordList(list)).resolves.toMatchObject({
      existed: true,
    });
  });

  it("meldet ungültige Wörter als übersprungen und prüft den Titel", async () => {
    const repository = createWordBoxRepository(createDatabase());
    const result = await repository.importWordList({
      ...list,
      words: ["Brief", "Ka\u0000tze"],
    });
    expect(result).toMatchObject({ added: 1, skipped: 1 });
    await expect(
      repository.importWordList({ ...list, title: "  " }),
    ).rejects.toThrow(/Titel/);
  });

  it("bleibt in der Sicherung und beim Wiederherstellen eine normale Wortbox", async () => {
    const database = createDatabase();
    await createWordBoxRepository(database).importWordList(list);
    const text = await serializePersonalLearningBackupFromDatabase(database);
    const target = createDatabase();
    await restorePersonalLearningBackup(JSON.parse(text), target);
    expect(
      await target.wordBoxes.get(wordListBoxId("teacher-package-wl")),
    ).toMatchObject({ title: "Wörter mit ie" });
    // Eine Übernahme nach der Wiederherstellung findet die Wortbox wieder.
    await createWordBoxRepository(target).importWordList(list);
    expect(await target.wordBoxes.count()).toBe(1);
  });
});

describe("Übernahme aus dem Unterricht", () => {
  it("legt die Wortbox an und setzt falsch geschriebene Wörter fällig", async () => {
    const database = createDatabase();
    const repository = createWordBoxRepository(database);
    const result = await repository.importFromLesson({
      words: ["Hund", "schnell", "Katze"],
      errorWords: ["Hund", "schnell"],
      sourceId: "s-1",
      now: t0,
    });
    expect(result).toEqual({
      added: ["Hund", "schnell", "Katze"],
      full: false,
    });
    const [box] = await repository.list();
    expect(box).toMatchObject({
      id: "unterricht",
      kind: "unterricht",
      title: "Aus dem Unterricht",
    });
    expect(box!.words.map((w) => [w.text, w.source])).toEqual([
      ["Hund", "laufdiktat"],
      ["schnell", "laufdiktat"],
      ["Katze", "laufdiktat"],
    ]);
    const progress =
      await createLearningWordProgressRepository(database).list();
    expect(progress.map((p) => p.word).sort()).toEqual(["Hund", "schnell"]);
    expect(progress[0]).toMatchObject({
      stage: 1,
      box: 1,
      dueAt: t0.toISOString(),
      attempts: 0,
    });
    expect(
      await createLearningWordProgressRepository(database).listDue(
        t0.toISOString(),
      ),
    ).toHaveLength(2);
    expect(await database.learningEvents.count()).toBe(0);
  });

  it("ergänzt eine vorhandene Wortbox und stellt bestehenden Lernstand auf Box 1", async () => {
    const database = createDatabase();
    const repository = createWordBoxRepository(database);
    const progressRepository = createLearningWordProgressRepository(database);
    await progressRepository.recordAttempt({
      words: ["Hund"],
      correct: true,
      usedHelp: false,
      selfCorrected: false,
      stage: 3,
      roundId: "r",
      attemptId: "0:1",
      now: "2026-10-01T08:00:00.000Z",
    });
    await repository.importFromLesson({
      words: ["Katze"],
      errorWords: [],
      sourceId: "a",
      now: t0,
    });
    const second = await repository.importFromLesson({
      words: ["Hund", "Katze"],
      errorWords: ["Hund"],
      sourceId: "b",
      now: t1,
    });
    expect(second).toEqual({ added: ["Hund", "Katze"], full: false });
    const [box] = await repository.list();
    expect(box!.words.map((w) => w.text)).toEqual(["Katze", "Hund"]);
    const hund = (await progressRepository.list()).find(
      (p) => p.word === "Hund",
    )!;
    expect(hund).toMatchObject({
      box: 1,
      dueAt: t1.toISOString(),
      stage: 3,
      attempts: 1,
    });
  });

  it("nimmt bei voller Wortbox zuerst die Fehlerwörter und meldet, dass sie voll ist", async () => {
    const database = createDatabase();
    const repository = createWordBoxRepository(database);
    const fill = Array.from({ length: 499 }, (_, i) => `Wort${i}`);
    await repository.importFromLesson({
      words: fill,
      errorWords: [],
      sourceId: "a",
      now: t0,
    });
    const result = await repository.importFromLesson({
      words: ["Alpha", "Beta", "Fehler"],
      errorWords: ["Fehler"],
      sourceId: "b",
      now: t1,
    });
    expect(result).toEqual({ added: ["Fehler"], full: true });
    const progress =
      await createLearningWordProgressRepository(database).list();
    expect(progress.map((p) => p.word)).toEqual(["Fehler"]);
    const [box] = await repository.list();
    expect(box!.words).toHaveLength(500);
  });

  it("kann die Wortbox löschen, und die nächste Übernahme legt sie neu an", async () => {
    const repository = createWordBoxRepository(createDatabase());
    await repository.importFromLesson({
      words: ["Hund"],
      errorWords: [],
      sourceId: "a",
      now: t0,
    });
    await repository.remove("unterricht");
    expect(await repository.list()).toEqual([]);
    await repository.importFromLesson({
      words: ["Katze"],
      errorWords: [],
      sourceId: "b",
      now: t1,
    });
    expect((await repository.list())[0]!.words.map((w) => w.text)).toEqual([
      "Katze",
    ]);
  });
});

describe("Lernstand: Modus und erster Versuch", () => {
  const now = "2026-10-21T12:00:00.000Z";
  const attempt = {
    correct: true,
    usedHelp: false,
    selfCorrected: false,
    stage: 4 as const,
    roundId: "r",
  };

  async function seeded(dueAt: string) {
    const database = createDatabase();
    const repository = createLearningWordProgressRepository(database);
    await database.learningWordProgress.put({
      id: "learning-word:hund",
      word: "Hund",
      stage: 4,
      box: 2,
      dueAt,
      attempts: 3,
      incorrectAttempts: 0,
      helpUses: 0,
      lastPracticedAt: "2026-10-01T08:00:00.000Z",
    });
    return { database, repository };
  }

  it("hebt die Box nur in der fälligen Wiederholung und nur beim ersten Versuch", async () => {
    const { repository } = await seeded("2026-10-20T08:00:00.000Z");
    await repository.recordAttempt({
      ...attempt,
      words: ["Hund"],
      attemptId: "0:1",
      mode: "due",
      firstAttempt: true,
      now,
    });
    const [after] = await repository.list();
    expect(after).toMatchObject({ box: 3, stage: 4, attempts: 4 });
    expect(after!.dueAt).toBe("2026-10-28T12:00:00.000Z");
  });

  it("behandelt ein nicht fälliges Wort in der Wiederholung wie freies Üben", async () => {
    const { repository } = await seeded("2026-11-01T08:00:00.000Z");
    await repository.recordAttempt({
      ...attempt,
      words: ["Hund"],
      attemptId: "0:1",
      mode: "due",
      firstAttempt: true,
      now,
    });
    expect((await repository.list())[0]).toMatchObject({
      box: 2,
      dueAt: "2026-11-01T08:00:00.000Z",
    });
  });

  it("ändert beim freien Üben die Box nie, auch ohne Angabe von Modus und erstem Versuch", async () => {
    const { repository } = await seeded("2026-10-20T08:00:00.000Z");
    await repository.recordAttempt({
      ...attempt,
      words: ["Hund"],
      attemptId: "0:1",
      now,
    });
    expect((await repository.list())[0]).toMatchObject({
      box: 2,
      dueAt: "2026-10-20T08:00:00.000Z",
    });
  });

  it("setzt in der Wiederholung bei „Wort zeigen“ die Box auf 1 und lässt spätere Versuche unverändert", async () => {
    const { repository } = await seeded("2026-10-20T08:00:00.000Z");
    await repository.recordAttempt({
      ...attempt,
      usedHelp: true,
      words: ["Hund"],
      attemptId: "0:1",
      mode: "due",
      firstAttempt: true,
      now,
    });
    const [helped] = await repository.list();
    expect(helped).toMatchObject({ box: 1, helpUses: 1 });
    await repository.recordAttempt({
      ...attempt,
      selfCorrected: true,
      words: ["Hund"],
      attemptId: "0:2",
      mode: "due",
      firstAttempt: false,
      now: "2026-10-21T12:01:00.000Z",
    });
    expect((await repository.list())[0]).toMatchObject({
      box: 1,
      dueAt: helped!.dueAt,
    });
  });

  it("schreibt unverändert ein Lernereignis je Versuch und keine zusätzlichen Felder", async () => {
    const { database, repository } = await seeded("2026-10-20T08:00:00.000Z");
    await repository.recordAttempt({
      ...attempt,
      words: ["Hund"],
      attemptId: "0:1",
      mode: "due",
      firstAttempt: true,
      now,
    });
    const [event] = await database.learningEvents.toArray();
    expect(Object.keys(event!).sort()).toEqual([
      "answerMode",
      "assessment",
      "direction",
      "help",
      "id",
      "learningArea",
      "learningObjectId",
      "occurredAt",
      "roundId",
      "source",
    ]);
  });
});

describe("Runden-Repository", () => {
  it("speichert eine Runde und ignoriert doppeltes Speichern", async () => {
    const database = createDatabase();
    const repository = createWordRoundRepository(database);
    await repository.save(roundRecord("r1"));
    await repository.save(roundRecord("r1"));
    expect(await repository.list()).toHaveLength(1);
    expect(await database.learningEvents.count()).toBe(0);
  });

  it("macht abgeschlossene Runden unveränderlich", async () => {
    const repository = createWordRoundRepository(createDatabase());
    await repository.save(roundRecord("r1"));
    await expect(
      repository.save(roundRecord("r1", { percent: 50 })),
    ).rejects.toThrow(/unveränderlich/);
  });

  it("liefert die Runden einer Wortbox", async () => {
    const repository = createWordRoundRepository(createDatabase());
    await repository.save(roundRecord("r1"));
    await repository.save(
      roundRecord("r2", {
        boxId: "eigen-00000000-0000-4000-8000-000000000001",
      }),
    );
    expect(
      (await repository.listByBox("double-consonants")).map((r) => r.id),
    ).toEqual(["r1"]);
  });

  it("lehnt ungültige Runden ab", async () => {
    const repository = createWordRoundRepository(createDatabase());
    await expect(
      repository.save(roundRecord("r1", { percent: 120 })),
    ).rejects.toThrow();
  });
});

describe("Backup mit Wortboxen und Runden", () => {
  async function seeded() {
    const database = createDatabase();
    const boxes = createWordBoxRepository(database);
    const box = await boxes.create(
      "Meine Wörter",
      ["Sonne", "Mond"],
      "eigen",
      t0,
    );
    await boxes.importFromLesson({
      words: ["Hund"],
      errorWords: ["Hund"],
      sourceId: "s",
      now: t0,
    });
    await createWordRoundRepository(database).save(
      roundRecord("r1", { boxId: box.id }),
    );
    return { database, box };
  }

  it("sichert und stellt beide Tabellen wieder her", async () => {
    const { database } = await seeded();
    const text = await serializePersonalLearningBackupFromDatabase(database);
    const target = createDatabase();
    const result = await restorePersonalLearningBackup(
      JSON.parse(text),
      target,
    );
    expect(result.conflicts).toEqual([]);
    expect(await target.wordBoxes.count()).toBe(2);
    expect(await target.wordRounds.count()).toBe(1);
    expect(await target.learningWordProgress.count()).toBe(1);
    const again = await restorePersonalLearningBackup(JSON.parse(text), target);
    expect(again).toMatchObject({ added: 0, updated: 0, conflicts: [] });
  });

  it("lädt ältere Sicherungen ohne die neuen Felder", async () => {
    const database = createDatabase();
    const old = createPersonalLearningBackup({
      learningEvents: [],
      learningBoxDecks: [],
      learningBoxCards: [],
      learningWordProgress: [],
      typingProgress: [],
    });
    const raw = JSON.parse(JSON.stringify(old)) as {
      data: Record<string, unknown>;
    };
    delete raw.data["wordBoxes"];
    delete raw.data["wordRounds"];
    expect(parsePersonalLearningBackup(raw).data).toMatchObject({
      wordBoxes: [],
      wordRounds: [],
    });
    await expect(
      restorePersonalLearningBackup(raw, database),
    ).resolves.toMatchObject({
      conflicts: [],
    });
    const legacy = parsePersonalLearningBackup({ decks: [], cards: [] });
    expect(legacy.data).toMatchObject({ wordBoxes: [], wordRounds: [] });
  });

  it("nimmt auch eine Sicherung mit Merkstufe 6 an und ältere mit Stufe 1 bis 5", async () => {
    const database = createDatabase();
    await createLearningWordProgressRepository(database).recordAttempt({
      words: ["Rad"],
      correct: true,
      usedHelp: false,
      selfCorrected: false,
      stage: 6,
      roundId: "r",
      attemptId: "0:1",
    });
    const backup = await exportPersonalLearningBackup(database);
    expect(backup.data.learningWordProgress[0]!.stage).toBe(6);
    expect(() => parsePersonalLearningBackup(backup)).not.toThrow();
  });

  it("vereinigt die Wörter gleicher Wortboxen und nimmt Titel vom neueren Stand", async () => {
    const { database, box } = await seeded();
    const backup = await exportPersonalLearningBackup(database);
    const incoming = backup.data.wordBoxes.find((b) => b.id === box.id)!;
    const changed: WordBox = {
      ...incoming,
      title: "Titel vom anderen Gerät",
      updatedAt: t1.toISOString(),
      words: [
        ...incoming.words,
        { text: "Stern", addedAt: t1.toISOString(), source: "eigen" },
        { text: "sonne", addedAt: t1.toISOString(), source: "eigen" },
      ],
    };
    const result = await restorePersonalLearningBackup(
      {
        ...backup,
        data: {
          ...backup.data,
          wordBoxes: [changed],
          wordRounds: [],
          learningEvents: [],
        },
      },
      database,
    );
    expect(result).toMatchObject({ updated: 1, conflicts: [] });
    const stored = (await database.wordBoxes.get(box.id))!;
    expect(stored.title).toBe("Titel vom anderen Gerät");
    expect(stored.words.map((w) => w.text)).toEqual(["Sonne", "Mond", "Stern"]);
  });

  it("meldet einen Konflikt, wenn die Vereinigung über 500 Wörter käme", async () => {
    const database = createDatabase();
    const repository = createWordBoxRepository(database);
    const box = await repository.create(
      "Groß",
      Array.from({ length: 300 }, (_, i) => `A${i}`),
    );
    const backup = await exportPersonalLearningBackup(database);
    const incoming: WordBox = {
      ...box,
      words: Array.from({ length: 300 }, (_, i) => ({
        text: `B${i}`,
        addedAt: t0.toISOString(),
        source: "eigen" as const,
      })),
    };
    const result = await restorePersonalLearningBackup(
      { ...backup, data: { ...backup.data, wordBoxes: [incoming] } },
      database,
    );
    expect(result.conflicts).toEqual([{ collection: "wordBoxes", id: box.id }]);
    expect((await database.wordBoxes.get(box.id))!.words).toHaveLength(300);
  });

  it("meldet einen Konflikt bei gleicher Runden-Id mit anderem Inhalt", async () => {
    const { database, box } = await seeded();
    const backup = await exportPersonalLearningBackup(database);
    const result = await restorePersonalLearningBackup(
      {
        ...backup,
        data: {
          ...backup.data,
          wordBoxes: [],
          wordRounds: [roundRecord("r1", { boxId: box.id, percent: 40 })],
        },
      },
      database,
    );
    expect(result.conflicts).toEqual([{ collection: "wordRounds", id: "r1" }]);
    expect((await database.wordRounds.get("r1"))!.percent).toBe(100);
  });
});
