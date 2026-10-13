import type {
  PersonalLearningBackup,
  PersonalLearningBackupInput,
} from "../domain/personal-backup";
import {
  createPersonalLearningBackup,
  parsePersonalLearningBackup,
  parsePersonalLearningBackupText,
  serializePersonalLearningBackup,
} from "../domain/personal-backup";
import type {
  LearningBoxCard,
  LearningBoxSourceLink,
} from "../domain/learning-box";
import { learningEventV1Schema } from "../domain/learning-bundle";
import { WORD_BOX_LIMITS, wordKey, type WordBox } from "../domain/word-box";
import { PersonalLearningDatabase } from "./personal-learning-events";

export type PersonalBackupRestoreConflict = {
  collection:
    | "learningEvents"
    | "learningBoxDecks"
    | "learningBoxCards"
    | "learningWordProgress"
    | "typingProgress"
    | "textboxSessions"
    | "wordBoxes"
    | "wordRounds";
  id: string;
};

export type PersonalBackupRestoreResult = {
  added: number;
  updated: number;
  unchanged: number;
  conflicts: PersonalBackupRestoreConflict[];
};

function sourceLinkKey(link: LearningBoxSourceLink) {
  return [
    link.source.kind,
    link.source.sourceId ?? "",
    link.source.classId ?? "",
    link.itemId,
  ].join("\u001f");
}

function mergeSourceLinks(
  left: readonly LearningBoxSourceLink[] | undefined,
  right: readonly LearningBoxSourceLink[] | undefined,
) {
  const merged = new Map<string, LearningBoxSourceLink>();
  for (const link of [...(left ?? []), ...(right ?? [])]) {
    const key = sourceLinkKey(link);
    const current = merged.get(key);
    if (!current || link.revision > current.revision) merged.set(key, link);
  }
  return [...merged.values()];
}

function mergeCardSources(
  current: LearningBoxCard,
  incoming: LearningBoxCard,
): LearningBoxCard {
  const links = mergeSourceLinks(current.sourceLinks, incoming.sourceLinks);
  return links.length > 0 ? { ...current, sourceLinks: links } : current;
}

function withoutSourceLinks(card: LearningBoxCard) {
  const content = { ...card };
  delete content.sourceLinks;
  return content;
}

/**
 * Gleiche Id: Wörter beider Stände vereinigen (über `wordKey`), Titel und
 * Zeitstempel vom neueren Stand. Über der Wortgrenze gibt es keine Mischung.
 */
function mergeWordBoxes(current: WordBox, incoming: WordBox): WordBox | null {
  const known = new Set(current.words.map((word) => wordKey(word.text)));
  const words = [
    ...current.words,
    ...incoming.words.filter((word) => !known.has(wordKey(word.text))),
  ];
  if (words.length > WORD_BOX_LIMITS.wordsPerBox) return null;
  const newer = incoming.updatedAt > current.updatedAt ? incoming : current;
  return {
    ...current,
    title: newer.title,
    updatedAt: newer.updatedAt,
    createdAt:
      incoming.createdAt < current.createdAt
        ? incoming.createdAt
        : current.createdAt,
    words,
  };
}

function sameJson(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export async function exportPersonalLearningBackup(
  database = new PersonalLearningDatabase(),
  exportedAt = new Date().toISOString(),
): Promise<PersonalLearningBackup> {
  const input: PersonalLearningBackupInput = {
    learningEvents: await database.learningEvents.toArray(),
    learningBoxDecks: await database.learningBoxDecks.toArray(),
    learningBoxCards: await database.learningBoxCards.toArray(),
    learningWordProgress: await database.learningWordProgress.toArray(),
    typingProgress: await database.typingProgress.toArray(),
    textboxSessions: await database.textboxSessions.toArray(),
    wordBoxes: await database.wordBoxes.toArray(),
    wordRounds: await database.wordRounds.toArray(),
  };
  return createPersonalLearningBackup(input, exportedAt);
}

export async function serializePersonalLearningBackupFromDatabase(
  database = new PersonalLearningDatabase(),
  exportedAt = new Date().toISOString(),
) {
  return serializePersonalLearningBackup(
    await exportPersonalLearningBackup(database, exportedAt),
  );
}

export async function restorePersonalLearningBackup(
  value: unknown,
  database = new PersonalLearningDatabase(),
): Promise<PersonalBackupRestoreResult> {
  const backup = parsePersonalLearningBackup(value);
  const result: PersonalBackupRestoreResult = {
    added: 0,
    updated: 0,
    unchanged: 0,
    conflicts: [],
  };

  await database.transaction(
    "rw",
    [
      database.learningEvents,
      database.learningBoxDecks,
      database.learningBoxCards,
      database.learningWordProgress,
      database.typingProgress,
      database.textboxSessions,
      database.wordBoxes,
      database.wordRounds,
    ],
    async () => {
      for (const event of backup.data.learningEvents) {
        const parsed = learningEventV1Schema.parse(event);
        const current = await database.learningEvents.get(parsed.id);
        if (!current) {
          await database.learningEvents.add(parsed);
          result.added += 1;
        } else if (sameJson(current, parsed)) {
          result.unchanged += 1;
        } else {
          result.conflicts.push({
            collection: "learningEvents",
            id: parsed.id,
          });
        }
      }

      for (const deck of backup.data.learningBoxDecks) {
        const current = await database.learningBoxDecks.get(deck.id);
        if (!current) {
          await database.learningBoxDecks.add(deck);
          result.added += 1;
        } else if (sameJson(current, deck)) {
          result.unchanged += 1;
        } else if (deck.updatedAt > current.updatedAt) {
          await database.learningBoxDecks.put(deck);
          result.updated += 1;
        } else {
          result.conflicts.push({
            collection: "learningBoxDecks",
            id: deck.id,
          });
        }
      }

      for (const card of backup.data.learningBoxCards) {
        const current = await database.learningBoxCards.get(card.id);
        if (!current) {
          await database.learningBoxCards.add(card);
          result.added += 1;
          continue;
        }

        const mergedCurrent = mergeCardSources(current, card);
        const sourceChanged = !sameJson(
          current.sourceLinks ?? [],
          mergedCurrent.sourceLinks ?? [],
        );
        const localProgressIsNewer =
          current.lastReviewed > card.lastReviewed ||
          current.updatedAt > card.updatedAt;
        const incomingProgressIsNewer =
          card.lastReviewed > current.lastReviewed &&
          card.updatedAt >= current.updatedAt;

        if (sameJson(current, card)) {
          result.unchanged += 1;
        } else if (incomingProgressIsNewer && !localProgressIsNewer) {
          const nextCard = { ...card };
          if (mergedCurrent.sourceLinks) {
            nextCard.sourceLinks = mergedCurrent.sourceLinks;
          }
          await database.learningBoxCards.put(nextCard);
          result.updated += 1;
        } else if (sourceChanged) {
          await database.learningBoxCards.put(mergedCurrent);
          result.updated += 1;
          if (
            !sameJson(withoutSourceLinks(current), withoutSourceLinks(card)) &&
            !incomingProgressIsNewer
          ) {
            result.conflicts.push({
              collection: "learningBoxCards",
              id: card.id,
            });
          }
        } else {
          result.conflicts.push({
            collection: "learningBoxCards",
            id: card.id,
          });
        }
      }

      for (const progress of backup.data.learningWordProgress) {
        const current = await database.learningWordProgress.get(progress.id);
        if (!current) {
          await database.learningWordProgress.add(progress);
          result.added += 1;
        } else if (sameJson(current, progress)) {
          result.unchanged += 1;
        } else if (progress.lastPracticedAt > current.lastPracticedAt) {
          await database.learningWordProgress.put(progress);
          result.updated += 1;
        } else {
          result.conflicts.push({
            collection: "learningWordProgress",
            id: progress.id,
          });
        }
      }

      for (const progress of backup.data.typingProgress) {
        const current = await database.typingProgress.get(progress.id);
        if (!current) {
          await database.typingProgress.add(progress);
          result.added += 1;
        } else if (sameJson(current, progress)) {
          result.unchanged += 1;
        } else if (progress.lastPracticedAt > current.lastPracticedAt) {
          await database.typingProgress.put(progress);
          result.updated += 1;
        } else {
          result.conflicts.push({
            collection: "typingProgress",
            id: progress.id,
          });
        }
      }

      for (const session of backup.data.textboxSessions) {
        const current = await database.textboxSessions.get(session.id);
        if (!current) {
          await database.textboxSessions.add(session);
          result.added += 1;
        } else if (sameJson(current, session)) {
          result.unchanged += 1;
        } else if (
          current.status === "abgeschlossen" &&
          session.status === "abgeschlossen"
        ) {
          // Zwei abgeschlossene Einheiten sind unveränderlich: Inhalt weicht ab.
          result.conflicts.push({
            collection: "textboxSessions",
            id: session.id,
          });
        } else if (
          session.status === "abgeschlossen" ||
          (current.status === "laufend" &&
            session.updatedAt > current.updatedAt)
        ) {
          await database.textboxSessions.put(session);
          result.updated += 1;
        } else {
          // Lokal ist abgeschlossen oder neuer: nichts zu tun.
          result.unchanged += 1;
        }
      }

      for (const box of backup.data.wordBoxes) {
        const current = await database.wordBoxes.get(box.id);
        if (!current) {
          await database.wordBoxes.add(box);
          result.added += 1;
        } else if (sameJson(current, box)) {
          result.unchanged += 1;
        } else {
          const merged = mergeWordBoxes(current, box);
          if (!merged) {
            result.conflicts.push({ collection: "wordBoxes", id: box.id });
          } else if (sameJson(current, merged)) {
            result.unchanged += 1;
          } else {
            await database.wordBoxes.put(merged);
            result.updated += 1;
          }
        }
      }

      for (const round of backup.data.wordRounds) {
        const current = await database.wordRounds.get(round.id);
        if (!current) {
          await database.wordRounds.add(round);
          result.added += 1;
        } else if (sameJson(current, round)) {
          result.unchanged += 1;
        } else {
          // Abgeschlossene Runden sind unveränderlich: Inhalt weicht ab.
          result.conflicts.push({ collection: "wordRounds", id: round.id });
        }
      }
    },
  );

  return result;
}

export async function restorePersonalLearningBackupText(
  text: string,
  database = new PersonalLearningDatabase(),
) {
  return restorePersonalLearningBackup(
    parsePersonalLearningBackupText(text),
    database,
  );
}
