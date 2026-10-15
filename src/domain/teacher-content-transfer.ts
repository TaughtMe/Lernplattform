import { parseVocabularyTable } from "./running-dictation";
import {
  LEARNING_BUNDLE_VERSION,
  parseLearningBundleV1,
  type LearningBundleV1,
} from "./learning-bundle";

export type TeacherVocabularyPair = {
  prompt: string;
  answer: string;
  /** Weitere richtige Schreibweisen, im Text mit „|“ getrennt. */
  promptAlternatives: string[];
  answerAlternatives: string[];
  /** Dritte Spalte: Tag für die LernBox. */
  tag?: string;
};

/** Längste Tag-Kennung, die das Lernpaket annimmt. */
const MAX_TAG_LENGTH = 200;

/**
 * Liest das Vokabelformat der Ablage wie das Laufdiktat: `links;rechts;tag`
 * (Tab statt `;` erlaubt), Alternativen mit `|`.
 */
export function parseTeacherVocabularyPairs(
  source: string,
): TeacherVocabularyPair[] {
  return parseVocabularyTable(source).map((pair) => {
    const tag = pair.tag?.slice(0, MAX_TAG_LENGTH).trim();
    return {
      prompt: pair.left.primary,
      answer: pair.right.primary,
      promptAlternatives: [...pair.left.alternatives],
      answerAlternatives: [...pair.right.alternatives],
      ...(tag ? { tag } : {}),
    };
  });
}

export function buildTeacherVocabularyBundle(input: {
  id: string;
  revision: number;
  title: string;
  source: string;
  sourceId?: string;
  promptLocale?: string;
  answerLocale?: string;
  now?: string;
}): LearningBundleV1 {
  const pairs = parseTeacherVocabularyPairs(input.source);
  if (pairs.length === 0) {
    throw new Error("Bitte gib mindestens ein gültiges Vokabelpaar ein.");
  }

  const now = input.now ?? new Date().toISOString();
  const vocabulary = pairs.map((pair, index) => ({
    kind: "vocabulary" as const,
    id: `${input.id}:vocabulary:${index + 1}`,
    prompt: {
      text: pair.prompt,
      locale: input.promptLocale ?? "en",
      ...(pair.promptAlternatives.length
        ? { alternatives: pair.promptAlternatives }
        : {}),
    },
    answer: {
      text: pair.answer,
      locale: input.answerLocale ?? "de",
      ...(pair.answerAlternatives.length
        ? { alternatives: pair.answerAlternatives }
        : {}),
    },
    // Die LernBox liest den ersten Eintrag als Tag der Karte.
    tagIds: pair.tag ? [pair.tag] : [],
    createdAt: now,
    updatedAt: now,
  }));

  return parseLearningBundleV1({
    schemaVersion: LEARNING_BUNDLE_VERSION,
    id: input.id,
    revision: input.revision,
    createdAt: now,
    source: {
      kind: "teacher",
      ...(input.sourceId ? { id: input.sourceId } : {}),
    },
    vocabulary,
    stacks: [
      {
        id: `${input.id}:stack`,
        title: input.title.trim(),
        itemIds: vocabulary.map((item) => item.id),
        tagIds: [input.id],
      },
    ],
  });
}
