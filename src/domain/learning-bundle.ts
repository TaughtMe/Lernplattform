import * as z from "zod";

/** Stable cross-module contract. Keep additive changes backward compatible within v1. */
export const LEARNING_BUNDLE_VERSION = "1.0.0" as const;

const entityIdSchema = z.string().trim().min(1).max(200);
const isoDateTimeSchema = z.iso.datetime({ offset: true });
const localeCodeSchema = z.string().trim().min(2).max(35);

export const learningDirectionSchema = z.enum([
  "prompt-to-answer",
  "answer-to-prompt",
]);
export const answerModeSchema = z.enum(["typed", "choice", "self-check"]);
export const eventSourceSchema = z.enum([
  "learning-box",
  "learning-word",
  "typing",
  "lesson",
  "test",
  "running-dictation",
  "duel",
]);
export const helpKindSchema = z.enum(["none", "hint", "solution"]);
export const assessmentSchema = z.enum([
  "correct",
  "incorrect",
  "not-assessed",
]);

const vocabularySideSchema = z
  .object({
    text: z.string().trim().min(1).max(2_000),
    locale: localeCodeSchema,
    alternatives: z
      .array(z.string().trim().min(1).max(2_000))
      .max(100)
      .optional(),
  })
  .strict();

export const vocabularyItemV1Schema = z
  .object({
    kind: z.literal("vocabulary"),
    id: entityIdSchema,
    sourceId: entityIdSchema.optional(),
    sourceRevision: z.number().int().nonnegative().optional(),
    prompt: vocabularySideSchema,
    answer: vocabularySideSchema,
    tagIds: z.array(entityIdSchema).max(500),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict();

export const vocabularyStackV1Schema = z
  .object({
    id: entityIdSchema,
    sourceId: entityIdSchema.optional(),
    title: z.string().trim().min(1).max(300),
    itemIds: z.array(entityIdSchema).max(50_000),
    tagIds: z.array(entityIdSchema).max(500),
  })
  .strict();

export const learningEventV1Schema = z
  .object({
    id: entityIdSchema,
    learningObjectId: entityIdSchema,
    occurredAt: isoDateTimeSchema,
    source: eventSourceSchema,
    roundId: entityIdSchema,
    direction: learningDirectionSchema,
    answerMode: answerModeSchema,
    help: helpKindSchema,
    classContext: z
      .object({
        classId: entityIdSchema,
        assignmentId: entityIdSchema.optional(),
        rankingEligible: z.boolean(),
      })
      .strict()
      .optional(),
    assessment: z
      .object({
        knowledge: assessmentSchema,
        writing: assessmentSchema,
        selfCorrected: z.boolean(),
      })
      .strict(),
  })
  .strict();

export const directionProgressV1Schema = z
  .object({
    box: z.union([
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
      z.literal(5),
    ]),
    dueAt: isoDateTimeSchema,
    lastEventId: entityIdSchema.optional(),
  })
  .strict();

export const learningProgressV1Schema = z
  .object({
    learningObjectId: entityIdSchema,
    knowledge: z.record(learningDirectionSchema, directionProgressV1Schema),
    writing: z.record(learningDirectionSchema, directionProgressV1Schema),
  })
  .strict();

export const learningBundleV1Schema = z
  .object({
    schemaVersion: z.literal(LEARNING_BUNDLE_VERSION),
    id: entityIdSchema,
    revision: z.number().int().nonnegative(),
    createdAt: isoDateTimeSchema,
    source: z
      .object({
        kind: z.enum(["teacher", "self", "peer", "import"]),
        id: entityIdSchema.optional(),
      })
      .strict(),
    vocabulary: z.array(vocabularyItemV1Schema).max(50_000),
    stacks: z.array(vocabularyStackV1Schema).max(10_000),
    events: z.array(learningEventV1Schema).max(1_000_000).optional(),
  })
  .strict()
  .superRefine((bundle, context) => {
    const vocabularyIds = new Set<string>();
    for (const [index, vocabulary] of bundle.vocabulary.entries()) {
      if (vocabularyIds.has(vocabulary.id)) {
        context.addIssue({
          code: "custom",
          message: `Doppelte Vokabel-ID: ${vocabulary.id}`,
          path: ["vocabulary", index, "id"],
        });
      }
      vocabularyIds.add(vocabulary.id);
    }

    const stackIds = new Set<string>();
    for (const [stackIndex, stack] of bundle.stacks.entries()) {
      if (stackIds.has(stack.id)) {
        context.addIssue({
          code: "custom",
          message: `Doppelte Stapel-ID: ${stack.id}`,
          path: ["stacks", stackIndex, "id"],
        });
      }
      stackIds.add(stack.id);

      for (const [itemIndex, itemId] of stack.itemIds.entries()) {
        if (!vocabularyIds.has(itemId)) {
          context.addIssue({
            code: "custom",
            message: `Unbekannte Vokabel-ID im Stapel: ${itemId}`,
            path: ["stacks", stackIndex, "itemIds", itemIndex],
          });
        }
      }
    }

    const eventIds = new Set<string>();
    for (const [eventIndex, event] of (bundle.events ?? []).entries()) {
      if (eventIds.has(event.id)) {
        context.addIssue({
          code: "custom",
          message: `Doppelte Ereignis-ID: ${event.id}`,
          path: ["events", eventIndex, "id"],
        });
      }
      eventIds.add(event.id);

      if (!vocabularyIds.has(event.learningObjectId)) {
        context.addIssue({
          code: "custom",
          message: `Unbekanntes Lernobjekt im Ereignis: ${event.learningObjectId}`,
          path: ["events", eventIndex, "learningObjectId"],
        });
      }
    }
  });

export type EntityId = string;
export type IsoDateTime = string;
export type LocaleCode = string;
export type LearningObjectKind = "vocabulary";
export type LearningDirection = z.infer<typeof learningDirectionSchema>;
export type AnswerMode = z.infer<typeof answerModeSchema>;
export type EventSource = z.infer<typeof eventSourceSchema>;
export type HelpKind = z.infer<typeof helpKindSchema>;
export type Assessment = z.infer<typeof assessmentSchema>;
export type VocabularyItemV1 = z.infer<typeof vocabularyItemV1Schema>;
export type VocabularyStackV1 = z.infer<typeof vocabularyStackV1Schema>;
export type LearningEventV1 = z.infer<typeof learningEventV1Schema>;
export type DirectionProgressV1 = z.infer<typeof directionProgressV1Schema>;
export type LearningProgressV1 = z.infer<typeof learningProgressV1Schema>;
export type LearningBundleV1 = z.infer<typeof learningBundleV1Schema>;

export function parseLearningBundleV1(value: unknown): LearningBundleV1 {
  return learningBundleV1Schema.parse(value);
}

export function isLearningBundleV1(value: unknown): value is LearningBundleV1 {
  return learningBundleV1Schema.safeParse(value).success;
}

export function normalizeVocabularyText(value: string, locale = "de"): string {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase(locale);
}

export function vocabularyFingerprint(
  item: Pick<VocabularyItemV1, "prompt" | "answer">,
): string {
  return `${normalizeVocabularyText(item.prompt.text, item.prompt.locale)}::${normalizeVocabularyText(item.answer.text, item.answer.locale)}`;
}
