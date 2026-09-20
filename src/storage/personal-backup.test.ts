import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import {
  createLearningBoxCard,
  createLearningBoxDeck,
} from "../domain/learning-box";
import { createPersonalLearningBackup } from "../domain/personal-backup";
import {
  exportPersonalLearningBackup,
  restorePersonalLearningBackup,
  serializePersonalLearningBackupFromDatabase,
} from "./personal-backup";
import { PersonalLearningDatabase } from "./personal-learning-events";

const databases: PersonalLearningDatabase[] = [];

afterEach(async () => {
  await Promise.all(databases.map((database) => database.delete()));
  databases.length = 0;
});

describe("personal backup storage", () => {
  it("exports and restores only the personal learning area", async () => {
    const source = new PersonalLearningDatabase(
      `backup-${crypto.randomUUID()}`,
    );
    const target = new PersonalLearningDatabase(
      `backup-${crypto.randomUUID()}`,
    );
    databases.push(source, target);
    const deck = createLearningBoxDeck({ title: "Englisch", now: 1_000 });
    const card = createLearningBoxCard({
      deckId: deck.id,
      question: "library",
      answer: "Bibliothek",
      now: 1_000,
    });
    await source.learningBoxDecks.add(deck);
    await source.learningBoxCards.add({
      ...card,
      box: 4,
      level: 4,
      lastReviewed: 2_000,
      updatedAt: 2_000,
      sourceLinks: [
        {
          source: {
            kind: "teacher",
            sourceId: "package-1",
            classId: "class-1",
          },
          itemId: "package-1:item-1",
          revision: 2,
          promptLocale: "en",
          answerLocale: "de",
        },
      ],
    });

    const backup = await exportPersonalLearningBackup(
      source,
      "2026-09-20T10:00:00.000Z",
    );
    expect(backup.data.learningBoxCards[0]?.box).toBe(4);
    const result = await restorePersonalLearningBackup(backup, target);

    expect(result).toMatchObject({ added: 2, updated: 0, conflicts: [] });
    expect(await target.learningBoxCards.get(card.id)).toMatchObject({
      box: 4,
      sourceLinks: [{ itemId: "package-1:item-1", revision: 2 }],
    });
    expect(await serializePersonalLearningBackupFromDatabase(target)).toContain(
      '"dataArea": "personal"',
    );
  });

  it("does not overwrite newer local learning progress", async () => {
    const database = new PersonalLearningDatabase(
      `backup-${crypto.randomUUID()}`,
    );
    databases.push(database);
    const deck = createLearningBoxDeck({ title: "Englisch", now: 1_000 });
    const current = createLearningBoxCard({
      deckId: deck.id,
      question: "library",
      answer: "Bibliothek",
      now: 1_000,
    });
    await database.learningBoxDecks.add(deck);
    await database.learningBoxCards.add({
      ...current,
      box: 5,
      level: 5,
      lastReviewed: 5_000,
      updatedAt: 5_000,
    });
    const older = createPersonalLearningBackup({
      learningEvents: [],
      learningBoxDecks: [deck],
      learningBoxCards: [{ ...current, answer: "Bibliothek-alt" }],
      learningWordProgress: [],
      typingProgress: [],
    });

    const result = await restorePersonalLearningBackup(older, database);
    expect(result.conflicts).toEqual([
      { collection: "learningBoxCards", id: current.id },
    ]);
    expect((await database.learningBoxCards.get(current.id))?.answer).toBe(
      "Bibliothek",
    );
  });
});
