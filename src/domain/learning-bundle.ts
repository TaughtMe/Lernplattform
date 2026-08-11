/** Stable cross-module contract. Keep additive changes backward compatible within v1. */
export const LEARNING_BUNDLE_VERSION = "1.0.0" as const;

export type EntityId = string;
export type IsoDateTime = string;
export type LocaleCode = string;

export type LearningObjectKind = "vocabulary";
export type LearningDirection = "prompt-to-answer" | "answer-to-prompt";
export type AnswerMode = "typed" | "choice" | "self-check";
export type EventSource = "learning-box" | "lesson" | "test" | "running-dictation" | "duel";
export type HelpKind = "none" | "hint" | "solution";
export type Assessment = "correct" | "incorrect" | "not-assessed";

export interface VocabularyItemV1 {
  kind: "vocabulary";
  id: EntityId;
  sourceId?: EntityId;
  sourceRevision?: number;
  prompt: { text: string; locale: LocaleCode; alternatives?: string[] };
  answer: { text: string; locale: LocaleCode; alternatives?: string[] };
  tagIds: EntityId[];
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface VocabularyStackV1 {
  id: EntityId;
  sourceId?: EntityId;
  title: string;
  itemIds: EntityId[];
  tagIds: EntityId[];
}

export interface LearningEventV1 {
  id: EntityId;
  learningObjectId: EntityId;
  occurredAt: IsoDateTime;
  source: EventSource;
  roundId: EntityId;
  direction: LearningDirection;
  answerMode: AnswerMode;
  help: HelpKind;
  assessment: {
    knowledge: Assessment;
    writing: Assessment;
    selfCorrected: boolean;
  };
}

export interface DirectionProgressV1 {
  box: 1 | 2 | 3 | 4 | 5;
  dueAt: IsoDateTime;
  lastEventId?: EntityId;
}

export interface LearningProgressV1 {
  learningObjectId: EntityId;
  knowledge: Record<LearningDirection, DirectionProgressV1>;
  writing: Record<LearningDirection, DirectionProgressV1>;
}

export interface LearningBundleV1 {
  schemaVersion: typeof LEARNING_BUNDLE_VERSION;
  id: EntityId;
  revision: number;
  createdAt: IsoDateTime;
  source: { kind: "teacher" | "self" | "peer" | "import"; id?: EntityId };
  vocabulary: VocabularyItemV1[];
  stacks: VocabularyStackV1[];
  events?: LearningEventV1[];
}

export function isLearningBundleV1(value: unknown): value is LearningBundleV1 {
  if (!value || typeof value !== "object") return false;
  const bundle = value as Partial<LearningBundleV1>;
  return bundle.schemaVersion === LEARNING_BUNDLE_VERSION
    && typeof bundle.id === "string"
    && Number.isInteger(bundle.revision)
    && Array.isArray(bundle.vocabulary)
    && Array.isArray(bundle.stacks);
}

export function normalizeVocabularyText(value: string, locale = "de"): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase(locale);
}

export function vocabularyFingerprint(item: Pick<VocabularyItemV1, "prompt" | "answer">): string {
  return `${normalizeVocabularyText(item.prompt.text, item.prompt.locale)}::${normalizeVocabularyText(item.answer.text, item.answer.locale)}`;
}
