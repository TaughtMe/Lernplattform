import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";
import {
  LEARNING_BUNDLE_VERSION,
  parseLearningBundleV1,
} from "../domain/learning-bundle";
import {
  createLearningWordProgressRepository,
  createLearningBoxRepository,
  createTypingProgressRepository,
  migrateLegacyLearningBox,
  PersonalLearningDatabase,
} from "./personal-learning-events";

const databases: PersonalLearningDatabase[] = [];

afterEach(async () => {
  await Promise.all(databases.map((database) => database.delete()));
  await Dexie.delete("LernBoxDB");
  databases.length = 0;
});

describe("learning box repository", () => {
  it("manages decks, cards and backups in the shared personal database", async () => {
    const database = new PersonalLearningDatabase(
      `learning-box-${crypto.randomUUID()}`,
    );
    databases.push(database);
    const repository = createLearningBoxRepository(database);
    const deck = await repository.createDeck({ title: "Französisch" });
    expect(await repository.getDeck(deck.id)).toEqual(deck);

    await repository.putDeck({ ...deck, title: "Französisch 7" });
    const first = await repository.addCard({
      deckId: deck.id,
      question: "bonjour",
      answer: "Guten Tag",
    });
    const duplicate = await repository.addCard({
      deckId: deck.id,
      question: " BONJOUR ",
      answer: "guten tag",
    });
    expect(first.added).toBe(true);
    expect(duplicate.added).toBe(false);
    expect(await repository.getCard(first.card.id)).toEqual(first.card);

    const updated = { ...first.card, box: 2 as const, level: 2 as const };
    await repository.putCard(updated);
    expect(await repository.exportBackup()).toMatchObject({
      decks: [{ title: "Französisch 7" }],
      cards: [{ box: 2 }],
    });

    const secondDatabase = new PersonalLearningDatabase(
      `learning-box-${crypto.randomUUID()}`,
    );
    databases.push(secondDatabase);
    const secondRepository = createLearningBoxRepository(secondDatabase);
    const backup = await repository.exportBackup();
    await secondRepository.importBackup(backup);
    await secondRepository.importBackup(backup);
    expect(await secondRepository.listCards(deck.id)).toHaveLength(1);
    await secondRepository.deleteCard(first.card.id);
    expect(await secondRepository.listCards(deck.id)).toHaveLength(0);

    await repository.deleteDeck(deck.id);
    expect(await repository.getDeck(deck.id)).toBeUndefined();
    expect(await repository.listCards(deck.id)).toHaveLength(0);
  });

  it("imports running-dictation mistakes without duplicates and makes them due", async () => {
    const database = new PersonalLearningDatabase(
      `learning-box-${crypto.randomUUID()}`,
    );
    databases.push(database);
    const repository = createLearningBoxRepository(database);
    const bundle = parseLearningBundleV1({
      schemaVersion: LEARNING_BUNDLE_VERSION,
      id: "run-1",
      revision: 1,
      createdAt: "2026-08-13T08:00:00.000Z",
      source: { kind: "teacher", id: "class-7b" },
      vocabulary: [
        {
          kind: "vocabulary",
          id: "library",
          prompt: { text: "library", locale: "en" },
          answer: { text: "Bibliothek", locale: "de" },
          tagIds: ["school"],
          createdAt: "2026-08-13T08:00:00.000Z",
          updatedAt: "2026-08-13T08:00:00.000Z",
        },
      ],
      stacks: [
        {
          id: "mistakes",
          title: "Fehler",
          itemIds: ["library"],
          tagIds: ["school"],
        },
      ],
    });
    const input = {
      bundle,
      title: "Fehler aus Laufdiktat",
      source: {
        kind: "running-dictation" as const,
        sourceId: "run-1",
        classId: "class-7b",
      },
    };

    await expect(repository.ingestBundle(input)).resolves.toMatchObject({
      added: 1,
      reused: 0,
    });
    await expect(
      repository.ingestBundle({
        ...input,
        source: { ...input.source, sourceId: "run-2" },
      }),
    ).resolves.toMatchObject({
      added: 0,
      reused: 1,
    });
    const decks = await repository.listDecks();
    const cards = await repository.listCards(decks[0]!.id);
    expect(decks).toHaveLength(1);
    expect(cards).toHaveLength(1);
    expect(cards[0]?.source.kind).toBe("running-dictation");
  });

  it("migrates the former standalone LernBox database only once", async () => {
    const legacy = new Dexie("LernBoxDB");
    legacy.version(2).stores({
      decks: "++id, name, createdAt",
      cards: "++id, deckId, level, nextReview, createdAt, [deckId+nextReview]",
    });
    const deckId = await legacy.table("decks").add({
      name: "Altbestand",
      front_lang: "en-US",
      back_lang: "de-DE",
      createdAt: 100,
    });
    await legacy.table("cards").add({
      deckId,
      question: "library",
      answer: "Bibliothek",
      level: 3,
      box: 3,
      interval: 1,
      nextReview: 200,
      reverseBox: 2,
      reverseInterval: 1,
      reverseNextReview: 300,
      createdAt: 100,
    });
    legacy.close();

    const database = new PersonalLearningDatabase(
      `learning-box-${crypto.randomUUID()}`,
    );
    databases.push(database);
    await expect(migrateLegacyLearningBox(database)).resolves.toEqual({
      decks: 1,
      cards: 1,
    });
    await expect(migrateLegacyLearningBox(database)).resolves.toEqual({
      decks: 0,
      cards: 0,
    });

    const repository = createLearningBoxRepository(database);
    const decks = await repository.listDecks();
    const cards = await repository.listCards(decks[0]!.id);
    expect(decks[0]).toMatchObject({
      title: "Altbestand",
      frontLocale: "en-US",
      backLocale: "de-DE",
    });
    expect(cards[0]).toMatchObject({ box: 3, reverseBox: 2 });
  });

  it("stores learning-word and typing signals in the shared personal database", async () => {
    const database = new PersonalLearningDatabase(
      `adaptive-modules-${crypto.randomUUID()}`,
    );
    databases.push(database);
    const learningWords = createLearningWordProgressRepository(database);
    const typing = createTypingProgressRepository(database);

    await learningWords.recordAttempt({
      words: ["Schlüssel"],
      correct: false,
      usedHelp: false,
      selfCorrected: false,
      stage: 2,
      roundId: "word-round",
      now: "2026-08-24T10:00:00.000Z",
    });
    await typing.recordAttempt(
      "grundstellung-links",
      {
        totalChars: 20,
        correctChars: 19,
        errorCount: 1,
        accuracy: 95,
        elapsedMs: 20_000,
        cpm: 57,
        wpm: 11,
        corrections: 0,
        problemChars: [{ char: "f", errors: 1 }],
      },
      "typing-round",
      "2026-08-24T11:00:00.000Z",
    );

    expect(
      await learningWords.listDue("2026-08-24T10:00:00.000Z"),
    ).toHaveLength(1);
    expect(await typing.list()).toMatchObject([
      { id: "grundstellung-links", completed: true },
    ]);
    expect(await database.learningEvents.toArray()).toHaveLength(2);
  });

  it("stores a LernBox result and its shared learning signal atomically", async () => {
    const database = new PersonalLearningDatabase(
      `learning-box-events-${crypto.randomUUID()}`,
    );
    databases.push(database);
    const repository = createLearningBoxRepository(database);
    const deck = await repository.createDeck({ title: "Englisch" });
    const { card } = await repository.addCard({
      deckId: deck.id,
      question: "library",
      answer: "Bibliothek",
    });

    await repository.putCardAndEvent({
      card: { ...card, box: 1 },
      correct: false,
      direction: "forward",
      mode: "writing",
      roundId: "box-round",
      now: "2026-08-24T12:00:00.000Z",
    });

    expect(await database.learningEvents.toArray()).toMatchObject([
      {
        learningObjectId: card.id,
        learningArea: "vocabulary",
        source: "learning-box",
        assessment: { writing: "incorrect" },
      },
    ]);
  });
});
