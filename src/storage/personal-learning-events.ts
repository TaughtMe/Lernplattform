import {
  learningWordProgressSchema,
  typingProgressSchema,
  typingStatsSchema,
} from "./progress-schema";
import {
  learningEventV1Schema,
  normalizeVocabularyText,
} from "../domain/learning-bundle";
import { learningEventIdentity } from "./learning-event-identity";
import Dexie, { type Table } from "dexie";
import type { LearningEventV1 } from "../domain/learning-bundle";
import type { LearningWordStage } from "../domain/learning-word";
import type { LearningWordProgress } from "../domain/learning-word-progress";
import { updateLearningWordProgress } from "../domain/learning-word-progress";
import type {
  LearningBoxCard,
  LearningBoxDeck,
  LearningBoxDirection,
  LearningBoxMode,
  LearningBoxSource,
  LearningBoxSourceLink,
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
import type { TypingLessonProgress } from "../tastschreiben/typing-progress";
import { updateTypingProgress } from "../tastschreiben/typing-progress";
import type { TypingStats } from "../tastschreiben/typing-stats";

export class PersonalLearningDatabase extends Dexie {
  learningEvents!: Table<LearningEventV1, string>;
  learningBoxDecks!: Table<LearningBoxDeck, string>;
  learningBoxCards!: Table<LearningBoxCard, string>;
  learningWordProgress!: Table<LearningWordProgress, string>;
  typingProgress!: Table<TypingLessonProgress, string>;

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
    this.version(3).stores({
      learningEvents: "id, learningObjectId, occurredAt, roundId",
      learningBoxDecks: "id, title, createdAt, source.kind, source.sourceId",
      learningBoxCards:
        "id, deckId, fingerprint, [deckId+fingerprint], nextReview, reverseNextReview, createdAt, source.kind, source.sourceId",
      learningWordProgress: "id, dueAt, stage, box, lastPracticedAt",
      typingProgress: "id, completed, lastPracticedAt",
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

function bundleItemId(item: LearningBundleV1["vocabulary"][number]): string {
  return item.sourceId ?? item.id;
}

function bundleItemRevision(
  item: LearningBundleV1["vocabulary"][number],
  bundle: LearningBundleV1,
): number {
  return item.sourceRevision ?? bundle.revision;
}

function bundleItemFingerprint(
  item: LearningBundleV1["vocabulary"][number],
): string {
  return JSON.stringify([
    item.prompt.locale.trim().toLocaleLowerCase("en-US"),
    normalizeVocabularyText(item.prompt.text, item.prompt.locale),
    item.answer.locale.trim().toLocaleLowerCase("en-US"),
    normalizeVocabularyText(item.answer.text, item.answer.locale),
  ]);
}

function sourceLinkMatches(
  link: LearningBoxSourceLink,
  source: LearningBoxSource,
  itemId: string,
): boolean {
  return (
    link.itemId === itemId &&
    link.source.kind === source.kind &&
    link.source.sourceId === source.sourceId &&
    link.source.classId === source.classId
  );
}

function createSourceLink(
  source: LearningBoxSource,
  item: LearningBundleV1["vocabulary"][number],
  bundle: LearningBundleV1,
): LearningBoxSourceLink {
  return {
    source: { ...source },
    itemId: bundleItemId(item),
    revision: bundleItemRevision(item, bundle),
    promptLocale: item.prompt.locale,
    answerLocale: item.answer.locale,
  };
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
    putCardAndEvent: async (input: {
      card: LearningBoxCard;
      correct: boolean;
      direction: LearningBoxDirection;
      mode: LearningBoxMode;
      roundId: string;
      now?: string;
    }) => {
      const occurredAt = input.now ?? new Date().toISOString();
      const eventId = await learningEventIdentity(
        "learning-box",
        input.roundId,
        input.card.id,
        input.direction,
      );
      await database.transaction(
        "rw",
        database.learningBoxCards,
        database.learningEvents,
        async () => {
          if (await database.learningEvents.get(eventId)) return;
          await database.learningBoxCards.put(input.card);
          await database.learningEvents.add(
            learningEventV1Schema.parse({
              id: eventId,
              learningObjectId: input.card.id,
              occurredAt,
              source: "learning-box",
              learningArea: "vocabulary",
              roundId: input.roundId,
              direction:
                input.direction === "forward"
                  ? "prompt-to-answer"
                  : "answer-to-prompt",
              answerMode: input.mode === "writing" ? "typed" : "self-check",
              help: input.mode === "writing" ? "none" : "solution",
              assessment: {
                knowledge: input.correct ? "correct" : "incorrect",
                writing:
                  input.mode === "writing"
                    ? input.correct
                      ? "correct"
                      : "incorrect"
                    : "not-assessed",
                selfCorrected: false,
              },
            }),
          );
        },
      );
    },
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
    }): Promise<RunningDictationImportResult> =>
      database.transaction(
        "rw",
        database.learningBoxDecks,
        database.learningBoxCards,
        async () => {
          let deck = input.source.sourceId
            ? await database.learningBoxDecks
                .where("source.sourceId")
                .equals(input.source.sourceId)
                .first()
            : undefined;
          if (!deck) {
            deck = await database.learningBoxDecks
              .where("source.kind")
              .equals(input.source.kind)
              .filter((candidate) => candidate.title === input.title)
              .first();
          }
          if (!deck) {
            deck = createLearningBoxDeck({
              title: input.title,
              source: input.source,
            });
            await database.learningBoxDecks.add(deck);
          }

          const cards = await database.learningBoxCards.toArray();
          let added = 0;
          let reused = 0;
          for (const item of input.bundle.vocabulary) {
            const itemId = bundleItemId(item);
            const incomingRevision = bundleItemRevision(item, input.bundle);
            const sourceLink = createSourceLink(
              input.source,
              item,
              input.bundle,
            );
            let existing = cards.find((card) =>
              (card.sourceLinks ?? []).some((link) =>
                sourceLinkMatches(link, input.source, itemId),
              ),
            );

            if (!existing) {
              const bundleFingerprint = bundleItemFingerprint(item);
              const legacyFingerprint = learningBoxFingerprint(
                item.prompt.text,
                item.answer.text,
              );
              existing = cards.find(
                (card) =>
                  card.fingerprint === bundleFingerprint ||
                  card.fingerprint === legacyFingerprint,
              );
            }

            if (existing) {
              const links = existing.sourceLinks ?? [];
              const matchingLink = links.find((link) =>
                sourceLinkMatches(link, input.source, itemId),
              );
              const isOlderRevision =
                matchingLink !== undefined &&
                incomingRevision < matchingLink.revision;

              if (input.source.kind === "running-dictation") {
                const now = Date.now();
                const nextLinks = matchingLink
                  ? links.map((link) =>
                      sourceLinkMatches(link, input.source, itemId)
                        ? {
                            ...link,
                            revision: Math.max(link.revision, incomingRevision),
                          }
                        : link,
                    )
                  : [...links, sourceLink];
                const nextCard: LearningBoxCard = {
                  ...existing,
                  sourceLinks: nextLinks,
                  nextReview: now,
                  reverseNextReview: now,
                  updatedAt: now,
                };
                await database.learningBoxCards.put(nextCard);
                Object.assign(existing, nextCard);
              } else if (!isOlderRevision && matchingLink) {
                const nextLinks = links.map((link) =>
                  sourceLinkMatches(link, input.source, itemId)
                    ? sourceLink
                    : link,
                );
                const nextCard: LearningBoxCard = {
                  ...existing,
                  question: item.prompt.text.trim(),
                  answer: item.answer.text.trim(),
                  fingerprint: bundleItemFingerprint(item),
                  sourceLinks: nextLinks,
                };
                if (item.tagIds[0]) nextCard.tag = item.tagIds[0];
                else delete nextCard.tag;
                await database.learningBoxCards.put(nextCard);
                Object.assign(existing, nextCard);
              } else if (!matchingLink) {
                const nextCard: LearningBoxCard = {
                  ...existing,
                  sourceLinks: [...links, sourceLink],
                };
                await database.learningBoxCards.put(nextCard);
                Object.assign(existing, nextCard);
              }
              reused += 1;
              continue;
            }

            const card: LearningBoxCard = {
              ...createLearningBoxCard({
                deckId: deck.id,
                question: item.prompt.text,
                answer: item.answer.text,
                ...(item.tagIds[0] ? { tag: item.tagIds[0] } : {}),
                source: input.source,
              }),
              fingerprint: bundleItemFingerprint(item),
              sourceLinks: [sourceLink],
            };
            await database.learningBoxCards.add(card);
            cards.push(card);
            added += 1;
          }
          return { deckId: deck.id, added, reused };
        },
      ),
  };
}

export function createPersonalLearningEventRepository(
  database = new PersonalLearningDatabase(),
): Omit<LocalRepository<LearningEventV1>, "remove"> {
  return {
    get: async (id) => {
      const event = await database.learningEvents.get(id);
      return event === undefined
        ? undefined
        : learningEventV1Schema.parse(event);
    },
    list: async () =>
      (
        await database.learningEvents.orderBy("occurredAt").reverse().toArray()
      ).map((event) => learningEventV1Schema.parse(event)),
    put: async (value) => {
      const event = learningEventV1Schema.parse(value);
      await database.transaction("rw", database.learningEvents, async () => {
        const current = await database.learningEvents.get(event.id);
        if (current) {
          if (
            JSON.stringify(learningEventV1Schema.parse(current)) !==
            JSON.stringify(event)
          ) {
            throw new Error(
              "Ein gespeichertes Lernereignis darf nicht verändert werden.",
            );
          }
          return;
        }
        await database.learningEvents.add(event);
      });
    },
  };
}

export function createLearningWordProgressRepository(
  database = new PersonalLearningDatabase(),
) {
  return {
    list: async () =>
      (await database.learningWordProgress.toArray()).map((value) =>
        learningWordProgressSchema.parse(value),
      ),
    listDue: async (now = new Date().toISOString()) =>
      (
        await database.learningWordProgress
          .where("dueAt")
          .belowOrEqual(now)
          .toArray()
      ).map((value) => learningWordProgressSchema.parse(value)),
    recordAttempt: async (input: {
      words: readonly string[];
      correct: boolean;
      usedHelp: boolean;
      selfCorrected: boolean;
      stage: LearningWordStage;
      roundId: string;
      attemptId: string;
      now?: string;
    }) => {
      const now = input.now ?? new Date().toISOString();
      const eventIds = await Promise.all(
        input.words.map((word) =>
          learningEventIdentity(
            "learning-word",
            input.roundId,
            input.attemptId,
            word.normalize("NFC").trim().toLocaleLowerCase("de-DE"),
          ),
        ),
      );
      await database.transaction(
        "rw",
        database.learningWordProgress,
        database.learningEvents,
        async () => {
          for (const [wordIndex, word] of input.words.entries()) {
            const id = `learning-word:${word.normalize("NFC").trim().toLocaleLowerCase("de-DE")}`;
            const eventId = eventIds[wordIndex]!;
            if (await database.learningEvents.get(eventId)) continue;
            const stored = await database.learningWordProgress.get(id);
            const current =
              stored === undefined
                ? undefined
                : learningWordProgressSchema.parse(stored);
            await database.learningWordProgress.put(
              updateLearningWordProgress(current, {
                word,
                correct: input.correct,
                usedHelp: input.usedHelp,
                selfCorrected: input.selfCorrected,
                stage: input.stage,
                now,
              }),
            );
            await database.learningEvents.add(
              learningEventV1Schema.parse({
                id: eventId,
                learningObjectId: id,
                occurredAt: now,
                source: "learning-word",
                learningArea: "german",
                roundId: input.roundId,
                direction: "prompt-to-answer",
                answerMode: "typed",
                help: input.usedHelp ? "hint" : "none",
                assessment: {
                  knowledge: input.correct ? "correct" : "incorrect",
                  writing: input.correct ? "correct" : "incorrect",
                  selfCorrected: input.selfCorrected,
                },
              }),
            );
          }
        },
      );
    },
  };
}

export function createTypingProgressRepository(
  database = new PersonalLearningDatabase(),
) {
  return {
    list: async () =>
      (await database.typingProgress.toArray()).map((value) =>
        typingProgressSchema.parse(value),
      ),
    recordAttempt: async (
      lessonId: string,
      stats: TypingStats,
      roundId: string,
      now = new Date().toISOString(),
    ) => {
      const checkedStats = typingStatsSchema.parse(stats);
      const eventId = await learningEventIdentity("typing", roundId, lessonId);
      return database.transaction(
        "rw",
        database.typingProgress,
        database.learningEvents,
        async () => {
          const stored = await database.typingProgress.get(lessonId);
          const current =
            stored === undefined
              ? undefined
              : typingProgressSchema.parse(stored);
          if (await database.learningEvents.get(eventId)) {
            if (!current) throw new Error("Der gespeicherte Lernstand fehlt.");
            return current;
          }
          const progress = updateTypingProgress(
            current,
            lessonId,
            checkedStats,
            now,
          );
          await database.typingProgress.put(progress);
          await database.learningEvents.add(
            learningEventV1Schema.parse({
              id: eventId,
              learningObjectId: `typing:${lessonId}`,
              occurredAt: now,
              source: "typing",
              learningArea: "typing",
              roundId,
              direction: "prompt-to-answer",
              answerMode: "typed",
              help: "none",
              assessment: {
                knowledge: "not-assessed",
                writing: stats.accuracy >= 90 ? "correct" : "incorrect",
                selfCorrected: stats.corrections > 0,
              },
            }),
          );
          return progress;
        },
      );
    },
  };
}
