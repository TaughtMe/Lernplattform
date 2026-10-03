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

  it("keeps personal progress unchanged across repeated teacher-package revisions", async () => {
    const database = new PersonalLearningDatabase(
      `learning-box-${crypto.randomUUID()}`,
    );
    databases.push(database);
    const repository = createLearningBoxRepository(database);
    const deck = await repository.createDeck({ title: "Eigene Vokabeln" });
    const { card } = await repository.addCard({
      deckId: deck.id,
      question: "library",
      answer: "Bibliothek",
    });
    const personalProgress = {
      ...card,
      level: 4 as const,
      box: 4 as const,
      interval: 7,
      nextReview: 2_000_000,
      writingStreak: 3,
      reverseBox: 3 as const,
      reverseInterval: 4,
      reverseNextReview: 3_000_000,
      reverseWritingStreak: 2,
      lastReviewed: 1_000_000,
      updatedAt: 1_000_000,
    };
    await repository.putCard(personalProgress);

    const teacherBundle = parseLearningBundleV1({
      schemaVersion: LEARNING_BUNDLE_VERSION,
      id: "teacher-package",
      revision: 2,
      createdAt: "2026-08-25T12:00:00.000Z",
      source: { kind: "teacher", id: "teacher-package" },
      vocabulary: [
        {
          kind: "vocabulary",
          id: "teacher-package:vocabulary:1",
          prompt: { text: "library", locale: "en" },
          answer: { text: "Bibliothek", locale: "de" },
          tagIds: ["unit-1"],
          createdAt: "2026-08-25T12:00:00.000Z",
          updatedAt: "2026-08-25T12:00:00.000Z",
        },
      ],
      stacks: [
        {
          id: "teacher-package:stack",
          title: "Unit 1",
          itemIds: ["teacher-package:vocabulary:1"],
          tagIds: ["unit-1"],
        },
      ],
    });
    const input = {
      bundle: teacherBundle,
      title: "Unit 1",
      source: {
        kind: "teacher" as const,
        sourceId: teacherBundle.id,
        classId: "class-7b",
      },
    };

    await expect(repository.ingestBundle(input)).resolves.toMatchObject({
      added: 0,
      reused: 1,
    });
    await expect(
      repository.ingestBundle({
        ...input,
        bundle: parseLearningBundleV1({ ...teacherBundle, revision: 3 }),
      }),
    ).resolves.toMatchObject({ added: 0, reused: 1 });
    const stored = await repository.getCard(card.id);
    expect(stored).toMatchObject({
      id: personalProgress.id,
      deckId: personalProgress.deckId,
      level: personalProgress.level,
      box: personalProgress.box,
      interval: personalProgress.interval,
      nextReview: personalProgress.nextReview,
      writingStreak: personalProgress.writingStreak,
      reverseBox: personalProgress.reverseBox,
      reverseInterval: personalProgress.reverseInterval,
      reverseNextReview: personalProgress.reverseNextReview,
      reverseWritingStreak: personalProgress.reverseWritingStreak,
      lastReviewed: personalProgress.lastReviewed,
      createdAt: personalProgress.createdAt,
      updatedAt: personalProgress.updatedAt,
      source: { kind: "self" },
      question: "library",
      answer: "Bibliothek",
    });
    expect(stored?.sourceLinks).toEqual([
      expect.objectContaining({
        itemId: "teacher-package:vocabulary:1",
        revision: 3,
        source: {
          kind: "teacher",
          sourceId: "teacher-package",
          classId: "class-7b",
        },
      }),
    ]);
    expect(await repository.listCards(deck.id)).toHaveLength(1);
  });

  it("updates a linked package item by stable id without resetting progress", async () => {
    const database = new PersonalLearningDatabase(
      `learning-box-${crypto.randomUUID()}`,
    );
    databases.push(database);
    const repository = createLearningBoxRepository(database);
    const source = {
      kind: "teacher" as const,
      sourceId: "package-1",
      classId: "class-7b",
    };
    const makeBundle = (revision: number, answer: string) =>
      parseLearningBundleV1({
        schemaVersion: LEARNING_BUNDLE_VERSION,
        id: "package-1",
        revision,
        createdAt: "2026-08-25T12:00:00.000Z",
        source: { kind: "teacher", id: "package-1" },
        vocabulary: [
          {
            kind: "vocabulary",
            id: "package-1:item-1",
            prompt: { text: "library", locale: "en" },
            answer: { text: answer, locale: "de" },
            tagIds: ["unit-1"],
            createdAt: "2026-08-25T12:00:00.000Z",
            updatedAt: "2026-08-25T12:00:00.000Z",
          },
        ],
        stacks: [],
      });

    await repository.ingestBundle({
      bundle: makeBundle(1, "Bibliothek"),
      title: "Unit 1",
      source,
    });
    const deck = (await repository.listDecks())[0]!;
    const initial = (await repository.listCards(deck.id))[0]!;
    await repository.putCard({
      ...initial,
      box: 4,
      level: 4,
      interval: 7,
      nextReview: 2_000_000,
      lastReviewed: 1_000_000,
      updatedAt: 1_000_000,
    });

    await expect(
      repository.ingestBundle({
        bundle: makeBundle(2, "Bibliotheken"),
        title: "Unit 1",
        source,
      }),
    ).resolves.toEqual({
      deckId: deck.id,
      added: 0,
      reused: 1,
      practiceAgain: 0,
    });

    const updated = (await repository.listCards(deck.id))[0]!;
    expect(updated).toMatchObject({
      id: initial.id,
      question: "library",
      answer: "Bibliotheken",
      box: 4,
      level: 4,
      interval: 7,
      nextReview: 2_000_000,
      lastReviewed: 1_000_000,
      updatedAt: 1_000_000,
    });

    await repository.ingestBundle({
      bundle: makeBundle(1, "Bibliothek-alt"),
      title: "Unit 1",
      source,
    });
    const afterOlderRevision = (await repository.listCards(deck.id))[0]!;
    expect(afterOlderRevision.answer).toBe("Bibliotheken");

    await repository.ingestBundle({
      bundle: parseLearningBundleV1({
        ...makeBundle(3, "Bibliotheken"),
        vocabulary: [],
        stacks: [],
      }),
      title: "Unit 1",
      source,
    });
    expect(await repository.listCards(deck.id)).toHaveLength(1);
  });

  it("merges equal vocabulary from multiple sources and keeps both links", async () => {
    const database = new PersonalLearningDatabase(
      `learning-box-${crypto.randomUUID()}`,
    );
    databases.push(database);
    const repository = createLearningBoxRepository(database);
    const bundle = (id: string) =>
      parseLearningBundleV1({
        schemaVersion: LEARNING_BUNDLE_VERSION,
        id,
        revision: 1,
        createdAt: "2026-08-25T12:00:00.000Z",
        source: { kind: "teacher", id },
        vocabulary: [
          {
            kind: "vocabulary",
            id: `${id}:item-1`,
            prompt: { text: "library", locale: "en" },
            answer: { text: "Bibliothek", locale: "de" },
            tagIds: [],
            createdAt: "2026-08-25T12:00:00.000Z",
            updatedAt: "2026-08-25T12:00:00.000Z",
          },
        ],
        stacks: [],
      });

    await repository.ingestBundle({
      bundle: bundle("package-a"),
      title: "Unit A",
      source: { kind: "teacher", sourceId: "package-a", classId: "class-1" },
    });
    await expect(
      repository.ingestBundle({
        bundle: bundle("package-b"),
        title: "Unit B",
        source: { kind: "teacher", sourceId: "package-b", classId: "class-1" },
      }),
    ).resolves.toMatchObject({ added: 0, reused: 1 });

    const decks = await repository.listDecks();
    const cards = (
      await Promise.all(decks.map((deck) => repository.listCards(deck.id)))
    ).flat();
    expect(cards).toHaveLength(1);
    expect(cards[0]?.sourceLinks).toHaveLength(2);
    expect(
      new Set(cards[0]?.sourceLinks?.map((link) => link.source.sourceId)),
    ).toEqual(new Set(["package-a", "package-b"]));
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
      attemptId: "attempt-1",
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

describe("learning box folders and bulk actions", () => {
  it("organizes decks in folders and edits many cards at once", async () => {
    const database = new PersonalLearningDatabase(
      `learning-box-${crypto.randomUUID()}`,
    );
    databases.push(database);
    const repository = createLearningBoxRepository(database);
    const folder = await repository.createFolder("Buch Klasse 5");
    const unit1 = await repository.createDeck({
      title: "Unit 1",
      folderId: folder.id,
    });
    const unit2 = await repository.createDeck({ title: "Unit 2" });
    expect(await repository.listFolders()).toHaveLength(1);

    const imported = await repository.importCards(unit1.id, [
      { question: "Haus", answer: "house", tag: "Unit 1" },
      { question: "Baum", answer: "tree" },
      { question: "Haus", answer: "house" },
    ]);
    expect(imported).toEqual({ added: 2, duplicates: 1 });

    const cards = await repository.listCards(unit1.id);
    const ids = cards.map((card) => card.id);
    await repository.setCardsTag(ids, "Klasse 5");
    expect(
      (await repository.listCards(unit1.id)).map((card) => card.tag),
    ).toEqual(["Klasse 5", "Klasse 5"]);
    await repository.setCardsTag(ids, " ");
    expect(
      (await repository.listCards(unit1.id)).every((card) => !card.tag),
    ).toBe(true);

    const edited = await repository.editCard(ids[0]!, {
      question: "Haus",
      answer: "house | home",
    });
    expect(edited?.answer).toBe("house | home");

    await repository.moveCards([ids[1]!], unit2.id);
    expect(await repository.listCards(unit2.id)).toHaveLength(1);

    await repository.moveDeck(unit2.id, folder.id);
    expect((await repository.getDeck(unit2.id))?.folderId).toBe(folder.id);
    await repository.renameFolder(folder.id, "Buch 5");
    await repository.deleteFolder(folder.id);
    expect(await repository.listFolders()).toHaveLength(0);
    expect((await repository.getDeck(unit1.id))?.folderId).toBeUndefined();

    const backup = await repository.exportBackup();
    expect(backup.folders).toEqual([]);
    await repository.deleteCards(ids);
    expect(await repository.listAllCards()).toHaveLength(0);
  });
});

describe("Vokabelübernahme aus Unterrichtsrunden", () => {
  const createdAt = "2026-10-02T08:00:00.000Z";
  function roundBundle(sessionId: string, words: [string, string, string][]) {
    return parseLearningBundleV1({
      schemaVersion: LEARNING_BUNDLE_VERSION,
      id: `live-transfer-${sessionId}`,
      revision: 1,
      createdAt,
      source: { kind: "teacher", id: sessionId },
      vocabulary: words.map(([id, prompt, answer]) => ({
        kind: "vocabulary",
        id: `live-${sessionId}-${id}`,
        prompt: { text: prompt, locale: "en" },
        answer: { text: answer, locale: "de" },
        tagIds: [],
        createdAt,
        updatedAt: createdAt,
      })),
      stacks: [
        {
          id: `stack-${sessionId}`,
          title: "Runde",
          itemIds: words.map(([id]) => `live-${sessionId}-${id}`),
          tagIds: [],
        },
      ],
    });
  }
  const words: [string, string, string][] = [
    ["a", "house", "Haus"],
    ["b", "tree", "Baum"],
  ];

  async function setup() {
    const database = new PersonalLearningDatabase(
      `learning-box-${crypto.randomUUID()}`,
    );
    databases.push(database);
    return createLearningBoxRepository(database);
  }
  const source = (sessionId: string) => ({
    kind: "running-dictation" as const,
    sourceId: sessionId,
  });

  it("legt neue Karten nach Ergebnis ab", async () => {
    const repository = await setup();
    const before = Date.now();
    const result = await repository.ingestBundle({
      bundle: roundBundle("r1", words),
      title: "Runde",
      source: source("r1"),
      placements: { "live-r1-a": "known", "live-r1-b": "unseen" },
    });
    expect(result).toMatchObject({ added: 2, reused: 0, practiceAgain: 0 });
    const cards = await repository.listCards(result.deckId);
    const known = cards.find((card) => card.question === "house")!;
    const unseen = cards.find((card) => card.question === "tree")!;
    expect(known).toMatchObject({ box: 2, level: 2, interval: 1 });
    expect(known.nextReview).toBeGreaterThanOrEqual(before + 86_400_000);
    expect(unseen).toMatchObject({ box: 1, level: 1, interval: 1 });
    expect(unseen.nextReview).toBeLessThanOrEqual(Date.now());
    // Rückrichtung startet immer in Box 1.
    expect(known.reverseBox).toBe(1);
  });

  async function existingAdvanced() {
    const repository = await setup();
    const deck = await repository.createDeck({ title: "Eigene" });
    const { card } = await repository.addCard({
      deckId: deck.id,
      question: "house",
      answer: "Haus",
    });
    const advanced = {
      ...card,
      box: 4 as const,
      level: 4 as const,
      interval: 1,
      nextReview: Date.now() + 5 * 86_400_000,
      reverseBox: 3 as const,
      reverseInterval: 1,
      reverseNextReview: Date.now() + 3 * 86_400_000,
    };
    await repository.putCard(advanced);
    return { repository, advanced };
  }

  it.each([
    ["known", { box: 4, same: true }],
    ["unseen", { box: 4, same: true }],
    ["practice", { box: 4, same: false }],
    ["reset", { box: 1, same: false }],
  ] as const)(
    "behandelt vorhandene Karte bei %s richtig und lässt die Rückrichtung",
    async (outcome, expected) => {
      const { repository, advanced } = await existingAdvanced();
      const result = await repository.ingestBundle({
        bundle: roundBundle("r2", [words[0]!]),
        title: "Runde",
        source: source("r2"),
        placements: { "live-r2-a": outcome },
      });
      expect(result.added).toBe(0);
      expect(result.reused).toBe(1);
      expect(result.practiceAgain).toBe(
        outcome === "practice" || outcome === "reset" ? 1 : 0,
      );
      const stored = (await repository.listCards(advanced.deckId))[0]!;
      expect(stored.box).toBe(expected.box);
      expect(stored.nextReview === advanced.nextReview).toBe(expected.same);
      expect(stored.reverseBox).toBe(3);
      expect(stored.reverseNextReview).toBe(advanced.reverseNextReview);
      // Der Quell-Link wird in jedem Fall ergänzt.
      expect(stored.sourceLinks).toHaveLength(1);
      if (!expected.same) {
        expect(stored.nextReview).toBeLessThanOrEqual(Date.now());
      }
    },
  );

  it("erkennt Dubletten über den Fingerprint ohne zweite Karte", async () => {
    const { repository, advanced } = await existingAdvanced();
    await repository.ingestBundle({
      bundle: roundBundle("r3", words),
      title: "Runde",
      source: source("r3"),
      placements: { "live-r3-a": "known", "live-r3-b": "known" },
    });
    const cards = await repository.listCards(advanced.deckId);
    expect(cards.filter((card) => card.question === "house")).toHaveLength(1);
  });

  it("ist bei doppelter Übernahme derselben Runde idempotent", async () => {
    const repository = await setup();
    const input = {
      bundle: roundBundle("r4", words),
      title: "Runde",
      source: source("r4"),
      placements: {
        "live-r4-a": "known",
        "live-r4-b": "reset",
      } as const,
    };
    const first = await repository.ingestBundle(input);
    const snapshot = (await repository.listCards(first.deckId)).map(
      ({ question, box, level, interval, reverseBox }) => ({
        question,
        box,
        level,
        interval,
        reverseBox,
      }),
    );
    const second = await repository.ingestBundle(input);
    expect(second.added).toBe(0);
    const again = await repository.listCards(first.deckId);
    expect(again).toHaveLength(2);
    expect(
      again.map(({ question, box, level, interval, reverseBox }) => ({
        question,
        box,
        level,
        interval,
        reverseBox,
      })),
    ).toEqual(snapshot);
  });

  it("verwendet den alten Stapeltitel weiter", async () => {
    const repository = await setup();
    const first = await repository.ingestBundle({
      bundle: roundBundle("r5", [words[0]!]),
      title: "Fehler aus Unterrichtsrunde",
      source: { kind: "running-dictation" },
    });
    const second = await repository.ingestBundle({
      bundle: roundBundle("r6", [words[1]!]),
      title: "Übungsbedarf aus Unterrichtsrunde",
      alternativeTitles: ["Fehler aus Unterrichtsrunde"],
      source: { kind: "running-dictation" },
      placements: { "live-r6-b": "reset" },
    });
    expect(second.deckId).toBe(first.deckId);
    expect(await repository.listDecks()).toHaveLength(1);
  });

  it("macht ohne Platzierung weiterhin beide Richtungen fällig", async () => {
    const { repository, advanced } = await existingAdvanced();
    await repository.ingestBundle({
      bundle: roundBundle("r7", [words[0]!]),
      title: "Runde",
      source: source("r7"),
    });
    const stored = (await repository.listCards(advanced.deckId))[0]!;
    expect(stored.box).toBe(4);
    expect(stored.nextReview).toBeLessThanOrEqual(Date.now());
    expect(stored.reverseNextReview).toBeLessThanOrEqual(Date.now());
  });
});
