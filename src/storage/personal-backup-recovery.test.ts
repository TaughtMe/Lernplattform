import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import Dexie from "dexie";
import {
  createLearningBoxCard,
  createLearningBoxDeck,
  createLearningBoxFolder,
} from "../domain/learning-box";
import {
  readPersonalLearningBackup,
  serializePersonalLearningBackup,
} from "../domain/personal-backup";
import { PersonalLearningDatabase } from "./personal-learning-events";
import {
  exportPersonalLearningBackup,
  restorePersonalLearningBackup,
  restorePersonalLearningBackupText,
} from "./personal-backup";

const databases: PersonalLearningDatabase[] = [];
function database() {
  const db = new PersonalLearningDatabase(`recovery-${crypto.randomUUID()}`);
  databases.push(db);
  return db;
}
afterEach(async () => {
  await Promise.all(databases.splice(0).map((db) => db.delete()));
});

async function seed(db: PersonalLearningDatabase) {
  const folder = createLearningBoxFolder({ title: "Englisch" });
  const deck = createLearningBoxDeck({ title: "Unit 1", folderId: folder.id });
  const card = createLearningBoxCard({
    deckId: deck.id,
    question: "cat",
    answer: "Katze",
  });
  const futureDeck = {
    ...deck,
    future: { flags: ["one", "two"], score: 0.25 },
  };
  const unknownEvent = {
    id: "future-event",
    source: "future-module",
    evidence: { answer: "cat" },
  };
  await db.learningBoxFolders.add(folder);
  await db.learningBoxDecks.add(futureDeck);
  await db.learningBoxCards.add(card);
  await db.learningEvents.add(unknownEvent as never);
  return { folder, deck, card, futureDeck, unknownEvent };
}

describe("verlustfreie Sicherung unbekannter Originaldaten", () => {
  it("erweitert eine bestehende v7-Datenbank ohne vorhandene Daten zu verändern", async () => {
    const target = database();
    const previous = new Dexie(target.name);
    previous
      .version(7)
      .stores(
        Object.fromEntries(
          target.tables
            .filter((table) => table.name !== "backupRecovery")
            .map((table) => [
              table.name,
              [
                table.schema.primKey.src,
                ...table.schema.indexes.map((index) => index.src),
              ].join(","),
            ]),
        ),
      );
    const folder = createLearningBoxFolder({ title: "Vor Update" });
    try {
      await previous.table("learningBoxFolders").add(folder);
    } finally {
      previous.close();
    }
    expect(await target.learningBoxFolders.get(folder.id)).toEqual(folder);
    expect(await target.backupRecovery.count()).toBe(0);
    expect(target.verno).toBe(8);
  });

  it("bewahrt unbekannte lokale Felder vor dem Ersetzen durch einen neueren Import", async () => {
    const source = database();
    const target = database();
    const { futureDeck, deck } = await seed(target);
    const updated = {
      ...deck,
      title: "Neuer Titel",
      updatedAt: deck.updatedAt + 1000,
    };
    await source.learningBoxDecks.add(updated);
    const backup = await exportPersonalLearningBackup(source);
    const result = await restorePersonalLearningBackup(backup, target);
    expect(result.updated).toBe(1);
    expect(await target.learningBoxDecks.get(deck.id)).toEqual(updated);
    expect((await exportPersonalLearningBackup(target)).recovery).toEqual(
      expect.arrayContaining([
        { table: "learningBoxDecks", recordId: deck.id, raw: futureDeck },
      ]),
    );
  });

  it("erhält Zusatzfelder auch in verschachtelten Objekten mit tolerantem Schema", async () => {
    const source = database();
    const backup = await exportPersonalLearningBackup(source);
    const typing = {
      id: "typing",
      completed: true,
      bestWpm: 20,
      bestAccuracy: 95,
      attempts: 1,
      lastPracticedAt: "2026-10-22T10:00:00.000Z",
      problemChars: [{ char: "a", errors: 2, futureHint: "langsam" }],
    };
    const target = database();
    await restorePersonalLearningBackup(
      { ...backup, data: { ...backup.data, typingProgress: [typing] } },
      target,
    );
    expect((await exportPersonalLearningBackup(target)).recovery).toEqual([
      { table: "typingProgress", recordId: "typing", raw: typing },
    ]);
    expect(
      (await target.typingProgress.get("typing"))?.problemChars[0],
    ).not.toHaveProperty("futureHint");
  });

  it("erhält Zusatzfelder und unlesbare Originale über Datei, Restore und erneuten Export", async () => {
    const source = database();
    const { folder, deck, card, futureDeck, unknownEvent } = await seed(source);
    const backup = await exportPersonalLearningBackup(source);
    expect(backup.recovery).toHaveLength(2);
    expect(backup.recovery).toEqual(
      expect.arrayContaining([
        { table: "learningBoxDecks", recordId: deck.id, raw: futureDeck },
        {
          table: "learningEvents",
          recordId: unknownEvent.id,
          raw: unknownEvent,
        },
      ]),
    );
    expect(backup.data.learningEvents).toEqual([]);
    expect(backup.data.learningBoxDecks).toEqual([deck]);
    expect(await source.learningBoxDecks.get(deck.id)).toEqual(futureDeck);
    expect(await source.learningEvents.get(unknownEvent.id)).toEqual(
      unknownEvent,
    );

    const target = database();
    const text = serializePersonalLearningBackup(backup);
    const result = await restorePersonalLearningBackupText(text, target);
    expect(result).toMatchObject({
      added: 3,
      recoveryRetained: 2,
      conflicts: [],
    });
    expect(await target.learningBoxFolders.get(folder.id)).toEqual(folder);
    expect(await target.learningBoxDecks.get(deck.id)).toEqual(deck);
    expect(await target.learningBoxCards.get(card.id)).toEqual(card);
    expect(await target.learningEvents.get(unknownEvent.id)).toBeUndefined();
    expect((await exportPersonalLearningBackup(target)).recovery).toEqual(
      backup.recovery,
    );
    await restorePersonalLearningBackupText(text, target);
    expect(await target.backupRecovery.count()).toBe(2);
  });

  it("liest v1 und erhält auch dabei bisher unbekannte Felder separat", async () => {
    const source = database();
    const { deck, futureDeck } = await seed(source);
    const current = await exportPersonalLearningBackup(source);
    const legacy = {
      kind: current.kind,
      exportedAt: current.exportedAt,
      dataArea: current.dataArea,
      schemaVersion: 1,
      data: { ...current.data, learningBoxDecks: [futureDeck] },
    };
    const read = readPersonalLearningBackup(legacy);
    expect(read.backup.schemaVersion).toBe(2);
    expect(read.backup.data.learningBoxDecks).toEqual([deck]);
    expect(read.backup.recovery).toEqual([
      { table: "learningBoxDecks", recordId: deck.id, raw: futureDeck },
    ]);
    const target = database();
    await restorePersonalLearningBackup(legacy, target);
    expect((await exportPersonalLearningBackup(target)).recovery).toEqual(
      read.backup.recovery,
    );
  });

  it("bewahrt bei toleranter Dateiübernahme auch unbekannte ganze Datensätze auf", async () => {
    const source = database();
    const backup = await exportPersonalLearningBackup(source);
    const unknown = {
      id: "future",
      source: "not-supported",
      data: [1, false, null],
    };
    const target = database();
    const result = await restorePersonalLearningBackup(
      { ...backup, data: { ...backup.data, learningEvents: [unknown] } },
      target,
    );
    expect(result.skipped).toEqual([{ table: "learningEvents", id: "future" }]);
    expect(result.recoveryRetained).toBe(1);
    expect(await target.learningEvents.count()).toBe(0);
    expect(
      (await exportPersonalLearningBackup(target)).recovery[0]?.raw,
    ).toEqual(unknown);
  });

  it("schreibt Rettungsbereich und Lernstand gemeinsam oder gar nicht", async () => {
    const source = database();
    await seed(source);
    const backup = await exportPersonalLearningBackup(source);
    const target = database();
    target.learningBoxDecks.hook("creating", () => {
      throw new Error("Speicherfehler");
    });
    await expect(restorePersonalLearningBackup(backup, target)).rejects.toThrow(
      "Speicherfehler",
    );
    expect(await target.backupRecovery.count()).toBe(0);
    expect(await target.learningBoxFolders.count()).toBe(0);
    expect(await target.learningBoxCards.count()).toBe(0);
  });

  it("bricht ab, wenn ein Original nicht verlustfrei in JSON passt", async () => {
    const source = database();
    await source.learningEvents.add({
      id: "bigint",
      payload: BigInt(1),
    } as never);
    await expect(exportPersonalLearningBackup(source)).rejects.toThrow(
      "nicht verlustfrei sichern",
    );
    expect(await source.learningEvents.count()).toBe(1);
  });
});
