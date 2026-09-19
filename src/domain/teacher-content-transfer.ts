import {
  LEARNING_BUNDLE_VERSION,
  parseLearningBundleV1,
  type LearningBundleV1,
} from "./learning-bundle";

export type TeacherVocabularyPair = {
  prompt: string;
  answer: string;
};

export function parseTeacherVocabularyPairs(
  source: string,
): TeacherVocabularyPair[] {
  return source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const separator = line.includes("\t") ? "\t" : ";";
      const [prompt, ...answerParts] = line.split(separator);
      const answer = answerParts.join(separator);
      if (!prompt?.trim() || !answer.trim()) return [];
      return [{ prompt: prompt.trim(), answer: answer.trim() }];
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
    },
    answer: {
      text: pair.answer,
      locale: input.answerLocale ?? "de",
    },
    tagIds: [input.id],
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
