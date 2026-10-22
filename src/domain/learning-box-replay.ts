import type { LearningEventV1 } from "./learning-bundle";
import {
  processLearningBoxResult,
  type LearningBoxCard,
  type LearningBoxDirection,
  type LearningBoxMode,
} from "./learning-box";

/**
 * Felder des Kartenstands, die nur Abfragen verändern. Bewusst die gespeicherte
 * Box: Das Nachspielen und der Abgleich vergleichen gespeicherte Stände; die
 * wirksame Box (Rückstufung nach Zeit) entsteht nur beim Lesen.
 */
export type LearningBoxProgressFields = Pick<
  LearningBoxCard,
  | "box"
  | "level"
  | "interval"
  | "nextReview"
  | "writingStreak"
  | "reverseBox"
  | "reverseInterval"
  | "reverseNextReview"
  | "reverseWritingStreak"
  | "lastReviewed"
>;

export function learningBoxProgress(
  card: LearningBoxCard,
): LearningBoxProgressFields {
  return {
    box: card.box,
    level: card.level,
    interval: card.interval,
    nextReview: card.nextReview,
    writingStreak: card.writingStreak,
    reverseBox: card.reverseBox,
    reverseInterval: card.reverseInterval,
    reverseNextReview: card.reverseNextReview,
    reverseWritingStreak: card.reverseWritingStreak,
    lastReviewed: card.lastReviewed,
  };
}

export type LearningBoxResultInput = {
  correct: boolean;
  direction: LearningBoxDirection;
  mode: LearningBoxMode;
  now: number;
};

/** Abfrageergebnis → Felder des gemeinsamen Lernereignisses. */
export function learningBoxEventFields(input: {
  correct: boolean;
  direction: LearningBoxDirection;
  mode: LearningBoxMode;
}) {
  const writing = input.mode === "writing";
  return {
    direction:
      input.direction === "forward"
        ? ("prompt-to-answer" as const)
        : ("answer-to-prompt" as const),
    answerMode: writing ? ("typed" as const) : ("self-check" as const),
    help: writing ? ("none" as const) : ("solution" as const),
    assessment: {
      knowledge: input.correct ? ("correct" as const) : ("incorrect" as const),
      writing: writing
        ? input.correct
          ? ("correct" as const)
          : ("incorrect" as const)
        : ("not-assessed" as const),
      selfCorrected: false,
    },
  };
}

/**
 * Gegenrichtung zu `learningBoxEventFields`. Liefert `undefined` für Ereignisse,
 * die nicht eindeutig zuzuordnen sind (z. B. Antwortmodus `choice` oder
 * Wissensbewertung `not-assessed`): Sie werden nicht geraten, sondern übersprungen.
 */
export function learningBoxResultFromEvent(
  event: LearningEventV1,
): LearningBoxResultInput | undefined {
  const knowledge = event.assessment.knowledge;
  if (knowledge !== "correct" && knowledge !== "incorrect") return undefined;
  const mode =
    event.answerMode === "typed"
      ? "writing"
      : event.answerMode === "self-check"
        ? "oral"
        : undefined;
  if (!mode) return undefined;
  const now = Date.parse(event.occurredAt);
  if (Number.isNaN(now)) return undefined;
  return {
    correct: knowledge === "correct",
    direction: event.direction === "prompt-to-answer" ? "forward" : "reverse",
    mode,
    now,
  };
}

/**
 * Spielt die LernBox-Ereignisse einer Karte ab `base` nach. Berücksichtigt nur
 * Ereignisse mit `source === "learning-box"` und passender `learningObjectId`,
 * sortiert nach `occurredAt`, bei Gleichstand nach `id`.
 */
export function replayLearningBoxCard(
  base: LearningBoxCard,
  events: readonly LearningEventV1[],
): LearningBoxCard {
  const relevant = events
    .filter(
      (event) =>
        event.source === "learning-box" && event.learningObjectId === base.id,
    )
    .map((event) => ({ event, time: Date.parse(event.occurredAt) }))
    .sort(
      (a, b) =>
        a.time - b.time ||
        (a.event.id < b.event.id ? -1 : a.event.id > b.event.id ? 1 : 0),
    );
  let card = base;
  for (const { event } of relevant) {
    const input = learningBoxResultFromEvent(event);
    if (input) card = processLearningBoxResult(card, input);
  }
  return card;
}
