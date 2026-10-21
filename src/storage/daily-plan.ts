import {
  dailyPlanProgress,
  dailyPlanSchema,
  selectDailyPlan,
  type DailyPlan,
  type DailyPlanCandidate,
} from "../domain/daily-plan";
import { learningEventV1Schema } from "../domain/learning-bundle";
import { readTolerant } from "../domain/tolerant-read";
import type { LearningEventV1 } from "../domain/learning-bundle";
import {
  isLearningBoxCardDue,
  type LearningBoxCard,
  type LearningBoxDirection,
} from "../domain/learning-box";
import type { LearningWordProgress } from "../domain/learning-word-progress";
import { localDayKey } from "../domain/local-day";
import { mathFamilyKey, mathReviews } from "../domain/math-practice";
import {
  dueEventVocabulary,
  unresolvedEventErrors,
} from "./learning-recommendations";
import { PersonalLearningDatabase } from "./personal-learning-events";
import { learningWordProgressSchema } from "./progress-schema";

/** Pläne, die älter als diese Zahl Tage sind, werden beim Erzeugen eines neuen Plans gelöscht. */
export const DAILY_PLAN_KEEP_DAYS = 7;

const DAY_MS = 86_400_000;

type PlanSources = {
  events: readonly LearningEventV1[];
  cards: readonly LearningBoxCard[];
  words: readonly LearningWordProgress[];
};

function iso(ms: number) {
  return new Date(ms).toISOString();
}

/** Kandidaten einer LernBox-Karte, je Richtung höchstens einer. */
function cardCandidates(card: LearningBoxCard, nowMs: number) {
  const candidates: DailyPlanCandidate[] = [];
  const directions: Array<{
    direction: LearningBoxDirection;
    interval: number;
    box: number;
    nextReview: number;
  }> = [
    {
      direction: "forward",
      interval: card.interval,
      box: card.box,
      nextReview: card.nextReview,
    },
    {
      direction: "reverse",
      interval: card.reverseInterval,
      box: card.reverseBox,
      nextReview: card.reverseNextReview,
    },
  ];
  for (const entry of directions) {
    const base = {
      key: `vocabulary:${card.id}:${entry.direction}`,
      module: "vocabulary" as const,
      objectIds: [card.id],
      direction: entry.direction,
    };
    if (entry.interval === 0) {
      // Die Rückrichtung wird erst angeboten, wenn vorwärts Box 2 erreicht ist.
      if (entry.direction === "reverse" && card.box < 2) continue;
      candidates.push({ ...base, kind: "new", dueAt: iso(card.createdAt) });
    } else if (isLearningBoxCardDue(card, entry.direction, nowMs)) {
      candidates.push({
        ...base,
        kind: entry.box === 1 ? "error" : "review",
        dueAt: iso(entry.nextReview),
        ...(entry.box === 1 ? { occurredAt: iso(card.lastReviewed) } : {}),
      });
    }
  }
  return candidates;
}

/**
 * Baut die Kandidaten der Tagesportion aus dem gelesenen Lernstand (rein, ohne
 * Speicherzugriff).
 */
export function dailyPlanCandidates(
  sources: PlanSources,
  now: string,
): DailyPlanCandidate[] {
  const nowMs = Date.parse(now);
  const cardIds = new Set(sources.cards.map((card) => card.id));
  const candidates: DailyPlanCandidate[] = sources.cards.flatMap((card) =>
    cardCandidates(card, nowMs),
  );

  // Vokabel-Ereignisse ohne Karte: dieselbe Auswahl wie bei den Empfehlungen.
  // Ohne eigene Übungsroute ließen sie sich nirgends üben und blieben offen;
  // solche Ereignisse kommen nicht in die Portion.
  for (const event of unresolvedEventErrors(
    sources.events,
    cardIds,
    "vocabulary",
  )) {
    if (!event.practice) continue;
    candidates.push({
      key: `vocabulary:event:${event.learningObjectId}`,
      module: "vocabulary",
      kind: "error",
      objectIds: [event.learningObjectId],
      dueAt: event.occurredAt,
      occurredAt: event.occurredAt,
      route: event.practice.route,
    });
  }
  for (const { event, dueAt } of dueEventVocabulary(
    sources.events,
    now,
    cardIds,
  )) {
    if (!event.practice) continue;
    candidates.push({
      key: `vocabulary:event:${event.learningObjectId}`,
      module: "vocabulary",
      kind: "review",
      objectIds: [event.learningObjectId],
      dueAt,
      route: event.practice.route,
    });
  }

  for (const word of sources.words) {
    if (word.dueAt > now) continue;
    const error = word.box === 1 && word.incorrectAttempts > 0;
    candidates.push({
      key: `german:${word.id}`,
      module: "german",
      kind: error ? "error" : "review",
      objectIds: [word.id],
      dueAt: word.dueAt,
      ...(error ? { occurredAt: word.lastPracticedAt } : {}),
    });
  }

  // Mathe: ein Kandidat je Aufgabenfamilie, nicht je Aufgabe.
  const families = new Map<string, ReturnType<typeof mathReviews>>();
  for (const review of mathReviews(sources.events)) {
    if (review.dueAt > now) continue;
    const key = mathFamilyKey(review);
    families.set(key, [...(families.get(key) ?? []), review]);
  }
  for (const [family, reviews] of families) {
    const errors = reviews.filter(
      (review) => review.errors > 0 && review.step < 2,
    );
    candidates.push({
      key: `mathematics:${family}`,
      module: "mathematics",
      kind: errors.length > 0 ? "error" : "review",
      objectIds: reviews.map((review) => review.id),
      // `mathReviews` sortiert nach Fälligkeit: erster = am längsten fällig.
      dueAt: reviews[0]!.dueAt,
      ...(errors.length > 0
        ? { occurredAt: errors[errors.length - 1]!.dueAt }
        : {}),
    });
  }
  return candidates;
}

/** Lernstand, aus dem die Portion entsteht (Ereignisse werden tolerant gelesen, Regel S-1). */
async function readSources(database: PersonalLearningDatabase) {
  const [events, cards, words] = await Promise.all([
    database.learningEvents.toArray(),
    database.learningBoxCards.toArray(),
    database.learningWordProgress.toArray(),
  ]);
  return {
    events: readTolerant(learningEventV1Schema, events, "learningEvents").items,
    cards,
    words: readTolerant(
      learningWordProgressSchema,
      words,
      "learningWordProgress",
    ).items,
  };
}

export function createDailyPlanRepository(
  database = new PersonalLearningDatabase(),
) {
  const candidates = async (now: string) =>
    dailyPlanCandidates(await readSources(database), now);

  /**
   * Holt den Plan des lokalen Tages oder erzeugt ihn genau einmal. Was im Laufe
   * des Tages neu fällig wird, kommt erst morgen in die Portion. Nur ein leerer
   * Plan wird bei jedem Aufruf neu berechnet, bis er Elemente hat.
   */
  const today = (now: string): Promise<DailyPlan> =>
    database.transaction(
      "rw",
      [
        database.dailyPlans,
        database.learningEvents,
        database.learningBoxCards,
        database.learningWordProgress,
      ],
      async () => {
        const day = localDayKey(now);
        const stored = dailyPlanSchema.safeParse(
          await database.dailyPlans.get(day),
        );
        // Ein ungültiger Plan wird verworfen und neu erzeugt. Ein leerer Plan
        // auch: Wer morgens noch nichts hatte und dann Karten anlegt, soll sie
        // heute schon in der Portion sehen.
        if (stored.success && stored.data.items.length > 0) return stored.data;
        const plan = selectDailyPlan({
          candidates: dailyPlanCandidates(await readSources(database), now),
          day,
          now,
        });
        await database.dailyPlans.put(plan);
        await database.dailyPlans
          .where("day")
          .below(localDayKey(Date.parse(now) - DAILY_PLAN_KEEP_DAYS * DAY_MS))
          .delete();
        return plan;
      },
    );

  const progress = async (now: string) => {
    const plan = await today(now);
    return {
      plan,
      ...dailyPlanProgress(
        plan,
        readTolerant(
          learningEventV1Schema,
          await database.learningEvents.toArray(),
          "learningEvents",
        ).items,
      ),
    };
  };

  return { candidates, today, progress };
}
