import { describe, expect, it } from "vitest";
import type { LearningEventV1, VocabularyItemV1 } from "./learning-bundle";
import { selectDueVocabularyItems } from "./vocabulary-session";

const item = (id: string): VocabularyItemV1 => ({
  kind: "vocabulary",
  id,
  prompt: { text: id, locale: "en" },
  answer: { text: `${id}-de`, locale: "de" },
  tagIds: ["school"],
  createdAt: "2026-08-12T08:00:00.000Z",
  updatedAt: "2026-08-12T08:00:00.000Z",
});

const correctEvent = (learningObjectId: string): LearningEventV1 => ({
  id: `${learningObjectId}-correct`,
  learningObjectId,
  occurredAt: "2026-08-12T10:00:00.000Z",
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
});

describe("selectDueVocabularyItems", () => {
  it("selects new and currently due cards while preserving stack order", () => {
    expect(
      selectDueVocabularyItems({
        items: [item("library"), item("classroom")],
        events: [correctEvent("library")],
        direction: "prompt-to-answer",
        mode: "writing",
        now: "2026-08-12T11:00:00.000Z",
      }).map((entry) => entry.id),
    ).toEqual(["classroom"]);
  });

  it("keeps directions independent and respects the session limit", () => {
    expect(
      selectDueVocabularyItems({
        items: [item("library"), item("classroom")],
        events: [correctEvent("library")],
        direction: "answer-to-prompt",
        mode: "self-check",
        now: "2026-08-12T11:00:00.000Z",
        limit: 1,
      }).map((entry) => entry.id),
    ).toEqual(["library"]);
  });
});
