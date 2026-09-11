import {
  LEARNING_BUNDLE_VERSION,
  parseLearningBundleV1,
  type LearningBundleV1,
} from "../../domain/learning-bundle";
import { liveWordKind, type LiveSession, type LiveWord } from "./live-session";

export function liveWordErrorKey(word: LiveWord) {
  return liveWordKind(word) === "vocabulary"
    ? `${word.prompt ?? ""} → ${word.targetWord}`
    : (word.prompt ?? word.targetWord);
}

export function selectVocabularyForTransfer(
  session: LiveSession,
  wordErrors: Readonly<Record<string, number>>,
) {
  const vocabulary = session.words.filter(
    (word) => liveWordKind(word) === "vocabulary",
  );
  if (session.vocabularyTransfer === "all") return vocabulary;
  if (session.vocabularyTransfer === "none") return [];
  return vocabulary.filter(
    (word) => (wordErrors[liveWordErrorKey(word)] ?? 0) > 0,
  );
}

export function buildLiveVocabularyTransfer(
  session: LiveSession,
  wordErrors: Readonly<Record<string, number>>,
): { bundle: LearningBundleV1; title: string } | undefined {
  const selected = selectVocabularyForTransfer(session, wordErrors);
  if (selected.length === 0) return undefined;

  const title =
    session.vocabularyTransfer === "errors"
      ? "Fehler aus Unterrichtsrunde"
      : "Vokabeln aus Unterrichtsrunde";
  const createdAt = new Date().toISOString();
  const itemIds = selected.map(
    (word) => `live-${session.sessionId}-${word.id}`,
  );
  return {
    title,
    bundle: parseLearningBundleV1({
      schemaVersion: LEARNING_BUNDLE_VERSION,
      id: `live-transfer-${session.sessionId}`,
      revision: 1,
      createdAt,
      source: { kind: "teacher", id: session.sessionId },
      vocabulary: selected.map((word, index) => ({
        kind: "vocabulary",
        id: itemIds[index],
        prompt: {
          text: word.prompt ?? word.targetWord,
          locale: word.promptLang ?? "de",
        },
        answer: {
          text: word.targetWord,
          locale: word.answerLang ?? "de",
          ...(word.acceptedAnswers?.length
            ? { alternatives: word.acceptedAnswers }
            : {}),
        },
        tagIds: ["unterrichtsrunde"],
        createdAt,
        updatedAt: createdAt,
      })),
      stacks: [
        {
          id: `live-stack-${session.sessionId}`,
          title,
          itemIds,
          tagIds: ["unterrichtsrunde"],
        },
      ],
    }),
  };
}
