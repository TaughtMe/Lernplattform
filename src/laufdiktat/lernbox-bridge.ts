// The only place Laufdiktat and LernBox touch: turns a finished vocabulary
// round into a LearningBundleV1, the shared, versioned contract from
// src/domain/learning-bundle.ts (see docs/architecture.md, "Datenbereiche").
// Deliberately does not import anything IndexedDB-related — building the
// bundle is pure and testable; only the caller decides to hand it to
// createLernBoxService(...).importBundle().
import type {
  LearningBundleV1,
  VocabularyItemV1,
  VocabularyStackV1,
} from "../domain/learning-bundle.ts";
import type { WordItem } from "./types.ts";

function newId(): string {
  return crypto.randomUUID();
}

/**
 * Builds a LearningBundleV1 from a Laufdiktat word list, keeping only
 * `kind: "vocabulary"` entries — text dictation and math tasks aren't
 * vocabulary and have no place in the LernBox. Returns `null` if the list
 * has no vocabulary items.
 */
export function vocabularyWordsToBundle(words: WordItem[], stackTitle: string, now: string = new Date().toISOString()): LearningBundleV1 | null {
  const vocabWords = words.filter((w) => w.kind === "vocabulary" && w.prompt && w.targetWord);
  if (vocabWords.length === 0) return null;

  const items: VocabularyItemV1[] = vocabWords.map((w) => ({
    kind: "vocabulary",
    id: newId(),
    prompt: { text: w.prompt as string, locale: w.promptLang ?? "de" },
    answer: { text: w.targetWord, locale: w.answerLang ?? "de", alternatives: w.acceptedAnswers },
    tagIds: [],
    createdAt: now,
    updatedAt: now,
  }));

  const stack: VocabularyStackV1 = {
    id: newId(),
    title: stackTitle,
    itemIds: items.map((item) => item.id),
    tagIds: [],
  };

  return {
    schemaVersion: "1.0.0",
    id: newId(),
    revision: 1,
    createdAt: now,
    source: { kind: "teacher" },
    vocabulary: items,
    stacks: [stack],
  };
}
