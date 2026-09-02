import type {
  LearningDirection,
  LearningEventV1,
  VocabularyItemV1,
} from "./learning-bundle";
import { deriveLeitnerProgress } from "./leitner-schedule";

export type VocabularySessionMode = "writing" | "self-check";

export function selectDueVocabularyItems(input: {
  items: readonly VocabularyItemV1[];
  events: readonly LearningEventV1[];
  direction: LearningDirection;
  mode: VocabularySessionMode;
  now: string;
  limit?: number;
}): VocabularyItemV1[] {
  const dimension = input.mode === "writing" ? "writing" : "knowledge";
  const due = input.items.filter((item) => {
    const progress = deriveLeitnerProgress({
      events: input.events,
      learningObjectId: item.id,
      direction: input.direction,
      availableAt: item.createdAt,
    });
    return progress[dimension].dueAt <= input.now;
  });

  return due.slice(0, input.limit ?? due.length);
}
