import type {
  DirectionProgressV1,
  EntityId,
  IsoDateTime,
  LearningDirection,
  LearningEventV1,
  LearningProgressV1,
} from "./learning-bundle";

/**
 * Review interval per Leitner box, in whole days. Box 1 is due immediately
 * (same-day repetition), each following box roughly doubles the gap.
 * Not yet finally calibrated with real students — see "19 - Entscheidungsprotokoll",
 * Punkt 11, "verbindliche Zusammensetzung ... der Rankingpunkte" for the wider
 * open-parameters note that also applies here.
 */
export const BOX_INTERVAL_DAYS: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 0,
  2: 1,
  3: 3,
  4: 7,
  5: 14,
};

const DIRECTIONS: LearningDirection[] = ["prompt-to-answer", "answer-to-prompt"];

function addDays(iso: IsoDateTime, days: number): IsoDateTime {
  const date = new Date(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function dueAtForBox(box: 1 | 2 | 3 | 4 | 5, now: IsoDateTime): IsoDateTime {
  return addDays(now, BOX_INTERVAL_DAYS[box]);
}

export function initialDirectionProgress(now: IsoDateTime): DirectionProgressV1 {
  return { box: 1, dueAt: now };
}

export function initialLearningProgress(learningObjectId: EntityId, now: IsoDateTime): LearningProgressV1 {
  const perDirection = () =>
    Object.fromEntries(DIRECTIONS.map((direction) => [direction, initialDirectionProgress(now)])) as Record<
      LearningDirection,
      DirectionProgressV1
    >;
  return {
    learningObjectId,
    knowledge: perDirection(),
    writing: perDirection(),
  };
}

export function isDue(progress: DirectionProgressV1, now: IsoDateTime): boolean {
  return progress.dueAt <= now;
}

function advance(box: DirectionProgressV1["box"]): DirectionProgressV1["box"] {
  return (box < 5 ? box + 1 : 5) as DirectionProgressV1["box"];
}

function moveTrack(
  track: DirectionProgressV1,
  result: "advance" | "stay" | "fall",
  roundId: EntityId,
  now: IsoDateTime,
): DirectionProgressV1 {
  if (result === "fall") {
    return { box: 1, dueAt: dueAtForBox(1, now) };
  }
  if (result === "stay") {
    return track;
  }
  // "Mehrfach in derselben Runde richtig | höchstens ein Aufstieg": a track that
  // already advanced in this round does not advance a second time.
  if (track.lastAdvancedRoundId === roundId) {
    return track;
  }
  const box = advance(track.box);
  return { box, dueAt: dueAtForBox(box, now), lastAdvancedRoundId: roundId };
}

/**
 * Applies one LearningEventV1 to a LearningProgressV1 following the rules in
 * "06 - Lernlogik und Leitner-Boxen": knowledge and writing are tracked
 * separately, but a writing mistake alone does not drag knowledge down, while
 * a wrong meaning always drags both down. Help, self-correction, or a
 * not-assessed result never cause an advance.
 */
export function applyLearningEvent(
  progress: LearningProgressV1,
  event: LearningEventV1,
  now: IsoDateTime = event.occurredAt,
): LearningProgressV1 {
  const { direction, help, assessment } = event;
  const canAdvance = help === "none" && !assessment.selfCorrected;

  const knowledgeResult = knowledgeOutcome(assessment, canAdvance);
  const writingResult = writingOutcome(assessment, canAdvance);

  const knowledgeTrack = progress.knowledge[direction];
  const writingTrack = progress.writing[direction];

  return {
    ...progress,
    knowledge: {
      ...progress.knowledge,
      [direction]: {
        ...moveTrack(knowledgeTrack, knowledgeResult, event.roundId, now),
        lastEventId: event.id,
      },
    },
    writing: {
      ...progress.writing,
      [direction]: {
        ...moveTrack(writingTrack, writingResult, event.roundId, now),
        lastEventId: event.id,
      },
    },
  };
}

type Outcome = "advance" | "stay" | "fall";

/**
 * "Bedeutung richtig, Schreibfehler | Wissen bleibt, Schreiben fällt": a writing
 * mistake alone must not drag the knowledge track down or up, so it depends on
 * the writing assessment too, not just its own.
 */
function knowledgeOutcome(assessment: LearningEventV1["assessment"], canAdvance: boolean): Outcome {
  if (assessment.knowledge === "incorrect") return "fall";
  if (assessment.knowledge === "not-assessed") return "stay";
  if (assessment.writing === "incorrect") return "stay";
  return canAdvance ? "advance" : "stay";
}

/** "Bedeutung falsch | beide fallen": a wrong meaning drags writing down too, even if it wasn't assessed as wrong itself. */
function writingOutcome(assessment: LearningEventV1["assessment"], canAdvance: boolean): Outcome {
  if (assessment.knowledge === "incorrect" || assessment.writing === "incorrect") return "fall";
  if (assessment.writing === "not-assessed") return "stay";
  return canAdvance ? "advance" : "stay";
}

/** Lowest box across all four tracks — a simple "how well is this known" signal for overviews. */
export function minBox(progress: LearningProgressV1): DirectionProgressV1["box"] {
  return Math.min(
    progress.knowledge["prompt-to-answer"].box,
    progress.knowledge["answer-to-prompt"].box,
    progress.writing["prompt-to-answer"].box,
    progress.writing["answer-to-prompt"].box,
  ) as DirectionProgressV1["box"];
}

export function dueDirections(
  progress: LearningProgressV1,
  now: IsoDateTime,
): Array<{ track: "knowledge" | "writing"; direction: LearningDirection }> {
  const due: Array<{ track: "knowledge" | "writing"; direction: LearningDirection }> = [];
  for (const direction of DIRECTIONS) {
    if (isDue(progress.knowledge[direction], now)) due.push({ track: "knowledge", direction });
    if (isDue(progress.writing[direction], now)) due.push({ track: "writing", direction });
  }
  return due;
}
