import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  isLearningBundleV1,
  learningBundleV1Schema,
  normalizeVocabularyText,
  parseLearningBundleV1,
  vocabularyFingerprint,
  type LearningBundleV1,
} from "./learning-bundle";

const validBundle: LearningBundleV1 = {
  schemaVersion: "1.0.0",
  id: "bundle-english-unit-1",
  revision: 1,
  createdAt: "2026-08-12T10:00:00.000Z",
  source: { kind: "teacher", id: "teacher-source-1" },
  vocabulary: [
    {
      kind: "vocabulary",
      id: "vocabulary-hello",
      prompt: { text: "Hallo", locale: "de" },
      answer: { text: "hello", locale: "en" },
      tagIds: ["unit-1"],
      createdAt: "2026-08-12T10:00:00.000Z",
      updatedAt: "2026-08-12T10:00:00.000Z",
    },
  ],
  stacks: [
    {
      id: "stack-unit-1",
      title: "Unit 1",
      itemIds: ["vocabulary-hello"],
      tagIds: ["unit-1"],
    },
  ],
  events: [
    {
      id: "event-1",
      learningObjectId: "vocabulary-hello",
      occurredAt: "2026-08-12T10:05:00.000Z",
      source: "learning-box",
      roundId: "round-1",
      direction: "prompt-to-answer",
      answerMode: "typed",
      help: "none",
      assessment: {
        knowledge: "correct",
        writing: "correct",
        selfCorrected: false,
      },
    },
  ],
};

describe("LearningBundle v1", () => {
  it("accepts a complete valid bundle", () => {
    expect(parseLearningBundleV1(validBundle)).toEqual(validBundle);
    expect(isLearningBundleV1(validBundle)).toBe(true);
  });

  it("rejects unknown fields instead of silently accepting them", () => {
    const result = learningBundleV1Schema.safeParse({
      ...validBundle,
      unexpectedPersonalData: "must not pass",
    });

    expect(result.success).toBe(false);
  });

  it("rejects references to missing vocabulary", () => {
    const result = learningBundleV1Schema.safeParse({
      ...validBundle,
      stacks: [{ ...validBundle.stacks[0], itemIds: ["missing"] }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain(
        "Unbekannte Vokabel-ID",
      );
    }
  });

  it("rejects duplicate vocabulary and stack IDs", () => {
    const duplicateVocabulary = learningBundleV1Schema.safeParse({
      ...validBundle,
      vocabulary: [validBundle.vocabulary[0], validBundle.vocabulary[0]],
    });
    const duplicateStack = learningBundleV1Schema.safeParse({
      ...validBundle,
      stacks: [validBundle.stacks[0], validBundle.stacks[0]],
    });

    expect(duplicateVocabulary.success).toBe(false);
    expect(duplicateStack.success).toBe(false);
  });

  it("rejects duplicate event IDs to keep imports idempotent", () => {
    const event = validBundle.events?.[0];
    expect(event).toBeDefined();

    const result = learningBundleV1Schema.safeParse({
      ...validBundle,
      events: [event, event],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("Doppelte Ereignis-ID");
    }
  });

  it("rejects events that reference an unknown learning object", () => {
    const event = validBundle.events?.[0];
    expect(event).toBeDefined();

    const result = learningBundleV1Schema.safeParse({
      ...validBundle,
      events: [{ ...event, learningObjectId: "missing" }],
    });

    expect(result.success).toBe(false);
  });

  it("accepts content-only bundles without learning events", () => {
    const contentOnlyBundle = { ...validBundle };
    delete contentOnlyBundle.events;
    expect(isLearningBundleV1(contentOnlyBundle)).toBe(true);
  });
});

describe("vocabulary normalization invariants", () => {
  it("is idempotent for arbitrary Unicode input", () => {
    fc.assert(
      fc.property(fc.string(), (value) => {
        const normalized = normalizeVocabularyText(value);
        expect(normalizeVocabularyText(normalized)).toBe(normalized);
      }),
    );
  });

  it("creates the same fingerprint for harmless spacing and case differences", () => {
    const base = {
      prompt: { text: "  Guten   Morgen ", locale: "de" },
      answer: { text: "GOOD MORNING", locale: "en" },
    };
    const equivalent = {
      prompt: { text: "guten morgen", locale: "de" },
      answer: { text: "good morning", locale: "en" },
    };

    expect(vocabularyFingerprint(base)).toBe(vocabularyFingerprint(equivalent));
  });
});
