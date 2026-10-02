import {
  LEARNING_BUNDLE_VERSION,
  parseLearningBundleV1,
  type LearningBundleV1,
} from "../../domain/learning-bundle";
import {
  classifyLiveVocabulary,
  DEFAULT_PLACEMENT_RULES,
  shouldTransfer,
  type LiveVocabularyOutcome,
  type PlacementRules,
} from "../../domain/live-vocabulary-placement";
import { liveWordKind, type LiveSession, type LiveWord } from "./live-session";

export function liveWordErrorKey(word: LiveWord) {
  return liveWordKind(word) === "vocabulary"
    ? `${word.prompt ?? ""} → ${word.targetWord}`
    : (word.prompt ?? word.targetWord);
}

/** Was die Übernahme vom lokalen Schnappschuss der Runde braucht. */
export type LiveTransferTrace = {
  currentIndex: number;
  finished: boolean;
  wordErrors: Readonly<Record<string, number>>;
  wordHelps: Readonly<Record<string, true>>;
};

/** Titel des Stapels vor der Umbenennung; vorhandene Stapel werden weiter gefunden. */
export const LEGACY_ERRORS_DECK_TITLE = "Fehler aus Unterrichtsrunde";
const ERRORS_DECK_TITLE = "Übungsbedarf aus Unterrichtsrunde";
const ALL_DECK_TITLE = "Vokabeln aus Unterrichtsrunde";

export function selectVocabularyForTransfer(
  session: LiveSession,
  trace: LiveTransferTrace,
  rules: PlacementRules = DEFAULT_PLACEMENT_RULES,
): { word: LiveWord; outcome: LiveVocabularyOutcome }[] {
  return session.words.flatMap((word, index) => {
    if (liveWordKind(word) !== "vocabulary") return [];
    const key = liveWordErrorKey(word);
    const outcome = classifyLiveVocabulary(
      {
        errors: trace.wordErrors[key] ?? 0,
        usedHelp: trace.wordHelps[key] === true,
        // Das aktuelle Wort gilt erst als beantwortet, wenn die Runde fertig ist.
        answered: trace.finished || index < trace.currentIndex,
      },
      rules,
    );
    return shouldTransfer(outcome, session.vocabularyTransfer)
      ? [{ word, outcome }]
      : [];
  });
}

export function buildLiveVocabularyTransfer(
  session: LiveSession,
  trace: LiveTransferTrace,
  rules: PlacementRules = DEFAULT_PLACEMENT_RULES,
):
  | {
      bundle: LearningBundleV1;
      title: string;
      alternativeTitles: string[];
      placements: Record<string, LiveVocabularyOutcome>;
    }
  | undefined {
  const entries = selectVocabularyForTransfer(session, trace, rules);
  if (entries.length === 0) return undefined;
  const selected = entries.map((entry) => entry.word);

  const errorsOnly = session.vocabularyTransfer === "errors";
  const title = errorsOnly ? ERRORS_DECK_TITLE : ALL_DECK_TITLE;
  const createdAt = new Date().toISOString();
  const itemIds = selected.map(
    (word) => `live-${session.sessionId}-${word.id}`,
  );
  return {
    title,
    alternativeTitles: errorsOnly ? [LEGACY_ERRORS_DECK_TITLE] : [],
    placements: Object.fromEntries(
      entries.map((entry, index) => [itemIds[index], entry.outcome]),
    ),
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
        // Eigener Tag der Vokabel vor dem Standard-Tag der Lehrkraft.
        tagIds: [word.tag?.trim() || session.vocabularyTag?.trim()].filter(
          (tag): tag is string => Boolean(tag),
        ),
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
