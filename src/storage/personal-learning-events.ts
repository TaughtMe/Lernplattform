import Dexie, { type Table } from "dexie";
import type { LearningEventV1 } from "../domain/learning-bundle";
import type {
  LearningBoxCard,
  LearningBoxDeck,
  LearningBoxSource,
} from "../domain/learning-box";
import {
  createLearningBoxCard,
  createLearningBoxDeck,
  learningBoxFingerprint,
} from "../domain/learning-box";
import type { LearningBundleV1 } from "../domain/learning-bundle";
import {
  LOCAL_DATA_AREAS,
  type LocalRepository,
} from "./local-data-boundaries";

export class PersonalLearningDatabase extends Dexie {
  learningEvents!: Table<LearningEventV1, string>;
  learningBoxDecks!: Table<LearningBoxDeck, string>;
  learningBoxCards!: Table<LearningBoxCard, string>;

  constructor(name: string = LOCAL_DATA_AREAS.personal) {
    super(name);
    this.version(1).stores({
      learningEvents: "id, learningObjectId, occurredAt, roundId",
    });
    this.version(2).stores({
      learningEvents: "id, learningObjectId, occurredAt, roundId",
      learningBoxDecks: "id, title, createdAt, source.kind, source.sourceId",
      learningBoxCards:
        "id, deckId, fingerprint, [deckId+fingerprint], nextReview, reverseNextReview, createdAt, source.kind, source.sourceId",
    });
  }
}

export type RunningDictationImportResult = {
  deckId: string;
  added: number;
  reused: number;
};

type LegacyDeck = {
  id?: number;
  name: string;
  front_lang?: string;
  back_lang?: string;
  createdAt: number;
};

type LegacyCard = {
  id?: number;
  deckId: number;
  question: string;
  answer: string;
  tag?: string;
  level: number;
  box?: number;
  interval?: number;
  nextReview: number;
  writingStreak?: number;
  reverseBox?: number;
  reverseInterval?: number;
  reverseNextReview?: number;
  reverseWritingStreak?: number;
  lastReviewed?: number;
  createdAt: number;
};

function asLearningBoxLevel(value: number | undefined) {
  return Math.min(5, Math.max(1, value ?? 1)) as 1 | 2 | 3 | 4 | 5;
}

export async function migrateLegacyLearningBox(
  database = new PersonalLearningDatabase(),
) {
  if (!(await Dexie.exists("LernBoxDB"))) return { decks: 0, cards: 0 };

  const legacy = new Dexie("LernBoxDB");
  legacy.version(2).stores({
    decks: "++id, name, createdAt",
    cards: "++id, deckId, level, nextReview, createdAt, [deckId+nextReview]",
  });

  try {
    const legacyDecks = await legacy.table<LegacyDeck>("decks").toArray();
    const legacyCards = await legacy.table<LegacyCard>("cards").toArray();
    let migratedDecks = 0;
    let migratedCards = 0;

    await database.transaction(
      "rw",
      database.learningBoxDecks,
      database.learningBoxCards,
      async () => {
        for (const legacyDeck of legacyDecks) {
          if (legacyDeck.id === undefined) continue;
          const sourceId = `legacy-lernbox:${legacyDeck.id}`;
          let deck = await database.learningBoxDecks
            .where("source.sourceId")
            .equals(sourceId)
            .first();
          if (!deck) {
            deck = createLearningBoxDeck({
              title: legacyDeck.name,
              frontLocale: legacyDeck.front_lang ?? "de-DE",
              backLocale: legacyDeck.back_lang ?? "en-US",
              source: { kind: "import", sourceId },
              now: legacyDeck.createdAt,
            });
            await database.learningBoxDecks.add(deck);
            migratedDecks += 1;
          }

          for (const oldCard of legacyCards.filter(
            (card) => card.deckId === legacyDeck.id,
          )) {
            const fingerprint = learningBoxFingerprint(
              oldCard.question,
              oldCard.answer,
            );
            const exists = await database.learningBoxCards
              .where("[deckId+fingerprint]")
              .equals([deck.id, fingerprint])
              .first();
            if (exists) continue;
            const card = createLearningBoxCard({
              deckId: deck.id,
              question: oldCard.question,
              answer: oldCard.answer,
              ...(oldCard.tag ? { tag: oldCard.tag } : {}),
              source: { kind: "import", sourceId },
              now: oldCard.createdAt,
            });
            const box = asLearningBoxLevel(oldCard.box ?? oldCard.level);
            await database.learningBoxCards.add({
              ...card,
              box,
              level: box,
              interval: oldCard.interval ?? 0,
              nextReview: oldCard.nextReview,
              writingStreak: oldCard.writingStreak ?? 0,
              reverseBox: asLearningBoxLevel(oldCard.reverseBox),
              reverseInterval: oldCard.reverseInterval ?? 0,
              reverseNextReview: oldCard.reverseNextReview ?? oldCard.createdAt,
              reverseWritingStreak: oldCard.reverseWritingStreak ?? 0,
              lastReviewed: oldCard.lastReviewed ?? oldCard.createdAt,
            });
            migratedCards += 1;
          }
        }
      },
    );
    return { decks: migratedDecks, cards: migratedCards };
  } finally {
    legacy.close();
  }
}

export function createLearningBoxRepository(
  database = new PersonalLearningDatabase(),
) {
  return {
    listDecks: () =>
      database.learningBoxDecks.orderBy("createdAt").reverse().toArray(),
    getDeck: (id: string) => database.learningBoxDecks.get(id),
    putDeck: (deck: LearningBoxDeck) => database.learningBoxDecks.put(deck),
    createDeck: async (input: Parameters<typeof createLearningBoxDeck>[0]) => {
      const deck = createLearningBoxDeck(input);
      await database.learningBoxDecks.add(deck);
      return deck;
    },
    deleteDeck: async (id: string) => {
      await database.transaction(
        "rw",
        database.learningBoxDecks,
        database.learningBoxCards,
        async () => {
          await database.learningBoxCards.where("deckId").equals(id).delete();
          await database.learningBoxDecks.delete(id);
        },
      );
    },
    listCards: (deckId: string) =>
      database.learningBoxCards.where("deckId").equals(deckId).toArray(),
    getCard: (id: string) => database.learningBoxCards.get(id),
    putCard: (card: LearningBoxCard) => database.learningBoxCards.put(card),
    addCard: async (input: Parameters<typeof createLearningBoxCard>[0]) => {
      const fingerprint = learningBoxFingerprint(input.question, input.answer);
      const existing = await database.learningBoxCards
        .where("[deckId+fingerprint]")
        .equals([input.deckId, fingerprint])
        .first();
      if (existing) return { card: existing, added: false };
      const card = createLearningBoxCard(input);
      await database.learningBoxCards.add(card);
      return { card, added: true };
    },
    deleteCard: (id: string) => database.learningBoxCards.delete(id),
    exportBackup: async () => ({
      decks: await database.learningBoxDecks.toArray(),
      cards: await database.learningBoxCards.toArray(),
    }),
    importBackup: async (input: {
      decks: LearningBoxDeck[];
      cards: LearningBoxCard[];
    }) => {
      await database.transaction(
        "rw",
        database.learningBoxDecks,
        database.learningBoxCards,
        async () => {
          for (const deck of input.decks) {
            await database.learningBoxDecks.put(deck);
          }
          for (const card of input.cards) {
            const existing = await database.learningBoxCards
              .where("fingerprint")
              .equals(card.fingerprint)
              .first();
            if (!existing) await database.learningBoxCards.put(card);
          }
        },
      );
    },
    ingestBundle: async (input: {
      bundle: LearningBundleV1;
      title: string;
      source: LearningBoxSource;
    }): Promise<RunningDictationImportResult> => {
      let deck = input.source.sourceId
        ? await database.learningBoxDecks
            .where("source.sourceId")
            .equals(input.source.sourceId)
            .first()
        : undefined;
      if (!deck) {
        deck = createLearningBoxDeck({
          title: input.title,
          source: input.source,
        });
        await database.learningBoxDecks.add(deck);
      }

      let added = 0;
      let reused = 0;
      for (const item of input.bundle.vocabulary) {
        const fingerprint = learningBoxFingerprint(
          item.prompt.text,
          item.answer.text,
        );
        const existing = await database.learningBoxCards
          .where("fingerprint")
          .equals(fingerprint)
          .first();
        if (existing) {
          await database.learningBoxCards.update(existing.id, {
            nextReview: Date.now(),
            reverseNextReview: Date.now(),
            source: input.source,
            updatedAt: Date.now(),
          });
          reused += 1;
          continue;
        }
        await database.learningBoxCards.add(
          createLearningBoxCard({
            deckId: deck.id,
            question: item.prompt.text,
            answer: item.answer.text,
            ...(item.tagIds[0] ? { tag: item.tagIds[0] } : {}),
            source: input.source,
          }),
        );
        added += 1;
      }
      return { deckId: deck.id, added, reused };
    },
  };
}

export function createPersonalLearningEventRepository(
  database = new PersonalLearningDatabase(),
): LocalRepository<LearningEventV1> {
  return {
    get: (id) => database.learningEvents.get(id),
    list: () =>
      database.learningEvents.orderBy("occurredAt").reverse().toArray(),
    put: async (value) => {
      await database.learningEvents.put(value);
    },
    remove: async (id) => {
      await database.learningEvents.delete(id);
    },
  };
}
