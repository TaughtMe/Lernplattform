import * as z from "zod";
import type { LearningEventV1 } from "./learning-bundle";
import type { LearningBoxDirection } from "./learning-box";
import { localDayKey } from "./local-day";

/** Aufgaben der Tagesportion; später pro Klasse einstellbar. */
export const DAILY_PLAN_SIZE = 20;

/**
 * Kontingente innerhalb der Portion: höchstens so viele Fehler vorab (der Rest
 * der Fehler füllt nur übrigen Platz), höchstens `new` neue Aufgaben neben
 * Wiederholungen und höchstens `newWhenFree` neue, wenn sonst Platz bleibt.
 */
export const DAILY_PLAN_QUOTAS = { error: 6, new: 4, newWhenFree: 10 } as const;

export const DAILY_PLAN_MODULES = [
  "vocabulary",
  "german",
  "mathematics",
] as const;

export type DailyPlanModule = (typeof DAILY_PLAN_MODULES)[number];
/**
 * „archive“ ist der Bonus aus dem Lernarchiv (Box 6 der Lernwörter, Regel A-3).
 * Format: Eine ältere App-Version kennt die Art nicht, verwirft einen solchen
 * Plan und erzeugt ihn neu.
 */
export type DailyPlanKind = "error" | "review" | "new" | "archive";

export type DailyPlanCandidate = {
  /** Eindeutig, z. B. `vocabulary:<cardId>:forward` oder `mathematics:<familyKey>`. */
  key: string;
  module: DailyPlanModule;
  kind: DailyPlanKind;
  /** `learningObjectId`s, deren Ereignis das Element erledigt. */
  objectIds: string[];
  /** ISO; bei „new“ der Zeitpunkt des Anlegens. */
  dueAt: string;
  /** ISO; Zeitpunkt des letzten Fehlers (für „error“). */
  occurredAt?: string | undefined;
  /** Nur LernBox: die Richtung, in der die Karte dran ist. */
  direction?: LearningBoxDirection | undefined;
  /**
   * Eigene Übungsroute, wenn das Element nicht im Modul geübt wird (z. B. eine
   * Klassenaufgabe, deren Fehler als Ereignis ohne LernBox-Karte vorliegt).
   */
  route?: string | undefined;
};

export type DailyPlanItem = Omit<DailyPlanCandidate, "dueAt" | "occurredAt">;

export type DailyPlan = {
  /** Lokaler Tag `JJJJ-MM-TT`; zugleich der Schlüssel in der Datenbank. */
  day: string;
  createdAt: string;
  size: number;
  items: DailyPlanItem[];
};

const dailyPlanItemSchema = z
  .object({
    key: z.string().min(1).max(500),
    module: z.enum(DAILY_PLAN_MODULES),
    kind: z.enum(["error", "review", "new", "archive"]),
    objectIds: z.array(z.string().min(1).max(200)).min(1).max(10_000),
    direction: z.enum(["forward", "reverse"]).optional(),
    // Nur interne Pfade; „//“ würde als fremde Adresse gelesen.
    route: z
      .string()
      .regex(/^\/(?!\/)/)
      .max(300)
      .optional(),
  })
  .strict();

/** Prüft gespeicherte Pläne; ein ungültiger Plan wird verworfen und neu erzeugt. */
export const dailyPlanSchema = z
  .object({
    day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    createdAt: z.iso.datetime({ offset: true }),
    size: z.number().int().min(1).max(1000),
    items: z.array(dailyPlanItemSchema).max(1000),
  })
  .strict()
  .refine((plan) => plan.items.length <= plan.size, {
    message: "Der Plan hat mehr Elemente als seine Größe.",
  })
  .refine(
    (plan) =>
      new Set(plan.items.map((item) => item.key)).size === plan.items.length,
    {
      message: "Die Schlüssel der Elemente sind nicht eindeutig.",
    },
  );

function byKey(left: DailyPlanCandidate, right: DailyPlanCandidate) {
  return left.key < right.key ? -1 : left.key > right.key ? 1 : 0;
}

/** Fehler: der jüngste zuerst; ohne Zeitpunkt zählt die Fälligkeit. */
function newestErrorFirst(left: DailyPlanCandidate, right: DailyPlanCandidate) {
  return (
    Date.parse(right.occurredAt ?? right.dueAt) -
      Date.parse(left.occurredAt ?? left.dueAt) || byKey(left, right)
  );
}

/** Wiederholungen und Neues: der Älteste zuerst. */
function oldestDueFirst(left: DailyPlanCandidate, right: DailyPlanCandidate) {
  return Date.parse(left.dueAt) - Date.parse(right.dueAt) || byKey(left, right);
}

/**
 * Nimmt höchstens `limit` Kandidaten und wechselt dabei zwischen den Modulen ab
 * (Wortschatz, Deutsch, Mathe). Die Reihenfolge innerhalb eines Moduls bleibt.
 */
function takeAlternating(
  sorted: readonly DailyPlanCandidate[],
  limit: number,
): { picked: DailyPlanCandidate[]; rest: DailyPlanCandidate[] } {
  const queues = DAILY_PLAN_MODULES.map((module) =>
    sorted.filter((candidate) => candidate.module === module),
  );
  const picked: DailyPlanCandidate[] = [];
  for (let round = 0; picked.length < limit; round += 1) {
    const row = queues.flatMap((queue) => queue[round] ?? []);
    if (row.length === 0) break;
    picked.push(...row.slice(0, limit - picked.length));
  }
  const taken = new Set(picked.map((candidate) => candidate.key));
  return {
    picked,
    rest: sorted.filter((candidate) => !taken.has(candidate.key)),
  };
}

/**
 * Wählt die Tagesportion aus den Kandidaten (deterministisch, ohne Zufall).
 *
 * 1. Fehler (jüngster zuerst), höchstens `DAILY_PLAN_QUOTAS.error`.
 * 2. Wiederholungen (am längsten überfällig zuerst); sie lassen Platz für das
 *    Kontingent neuer Aufgaben frei.
 * 3. Neue Aufgaben (ältester Eintrag zuerst), höchstens `DAILY_PLAN_QUOTAS.new`.
 * 4. Bleibt Platz: übrige Fehler, dann übrige Wiederholungen, dann weitere
 *    neue Aufgaben bis insgesamt `DAILY_PLAN_QUOTAS.newWhenFree`.
 *
 * 5. Bonus aus dem Lernarchiv (A-3): höchstens ein Kandidat der Art „archive“,
 *    der am längsten Fällige (`dueAt`). Er kommt nur zusätzlich zu einer
 *    Portion, die sonst nicht leer ist: Ein Archivwort ist sicher gewusst, eine
 *    Portion nur für dieses eine Wort wäre kein Tagesziel, sondern Pflicht ohne
 *    Anlass. Er belegt einen eigenen Platz und verdrängt keine Aufgabe, solange
 *    `size` mindestens 2 ist.
 *
 * Innerhalb jeder Stufe wechseln die Module ab, damit nicht eines die Portion
 * füllt. Gleichstand entscheidet der Schlüssel. Doppelte Schlüssel zählen einmal.
 */
export function selectDailyPlan(input: {
  candidates: readonly DailyPlanCandidate[];
  day: string;
  now: string;
  size?: number;
}): DailyPlan {
  const totalSize = Math.max(1, Math.floor(input.size ?? DAILY_PLAN_SIZE));
  const unique = [
    ...new Map(
      input.candidates.map((candidate) => [candidate.key, candidate]),
    ).values(),
  ];
  const ofKind = (kind: DailyPlanKind) =>
    unique.filter((candidate) => candidate.kind === kind);
  const errors = ofKind("error").sort(newestErrorFirst);
  const reviews = ofKind("review").sort(oldestDueFirst);
  const fresh = ofKind("new").sort(oldestDueFirst);
  const bonus = ofKind("archive").sort(oldestDueFirst)[0];
  // Platz für den Bonus freihalten, damit er keine fällige Aufgabe verdrängt.
  const size = bonus && totalSize > 1 ? totalSize - 1 : totalSize;

  const firstErrors = takeAlternating(
    errors,
    Math.min(DAILY_PLAN_QUOTAS.error, size),
  );
  const newRoom = Math.min(DAILY_PLAN_QUOTAS.new, fresh.length);
  const firstReviews = takeAlternating(
    reviews,
    Math.max(0, size - firstErrors.picked.length - newRoom),
  );
  const newOnes = takeAlternating(
    fresh,
    Math.min(
      DAILY_PLAN_QUOTAS.new,
      size - firstErrors.picked.length - firstReviews.picked.length,
    ),
  );
  const chosen = [
    ...firstErrors.picked,
    ...firstReviews.picked,
    ...newOnes.picked,
  ];
  const moreErrors = takeAlternating(firstErrors.rest, size - chosen.length);
  const moreReviews = takeAlternating(
    firstReviews.rest,
    size - chosen.length - moreErrors.picked.length,
  );
  chosen.push(...moreErrors.picked, ...moreReviews.picked);
  // Ohne Rückstand darf mehr Neues kommen, sonst wirkt die Portion leer.
  const moreNew = takeAlternating(
    newOnes.rest,
    Math.min(
      size - chosen.length,
      DAILY_PLAN_QUOTAS.newWhenFree - newOnes.picked.length,
    ),
  );
  chosen.push(...moreNew.picked);
  if (bonus && chosen.length > 0 && chosen.length < totalSize) {
    chosen.push(bonus);
  }

  return {
    day: input.day,
    createdAt: input.now,
    size: totalSize,
    items: chosen.map((candidate) => ({
      key: candidate.key,
      module: candidate.module,
      kind: candidate.kind,
      objectIds: candidate.objectIds,
      ...(candidate.direction ? { direction: candidate.direction } : {}),
      ...(candidate.route ? { route: candidate.route } : {}),
    })),
  };
}

const EVENT_DIRECTION: Record<
  LearningEventV1["direction"],
  LearningBoxDirection
> = { "prompt-to-answer": "forward", "answer-to-prompt": "reverse" };

/**
 * Fortschritt der Portion. Ein Element ist erledigt, sobald ein Ereignis zu
 * einer seiner `objectIds` existiert, das nach Erzeugen des Plans am selben
 * lokalen Tag geschah; wie oft geübt wurde, ist gleichgültig. Hat das Element
 * eine Richtung (LernBox), zählt nur ein Ereignis in dieser Richtung.
 */
export function dailyPlanProgress(
  plan: DailyPlan,
  events: readonly LearningEventV1[],
): {
  done: number;
  total: number;
  openByModule: Record<DailyPlanModule, number>;
  openItems: DailyPlanItem[];
} {
  const createdAt = Date.parse(plan.createdAt);
  const answered = new Map<string, Set<LearningBoxDirection>>();
  for (const event of events) {
    if (
      Date.parse(event.occurredAt) < createdAt ||
      localDayKey(event.occurredAt) !== plan.day
    )
      continue;
    const directions = answered.get(event.learningObjectId) ?? new Set();
    directions.add(EVENT_DIRECTION[event.direction]);
    answered.set(event.learningObjectId, directions);
  }

  const openItems = plan.items.filter(
    (item) =>
      !item.objectIds.some((id) => {
        const directions = answered.get(id);
        return item.direction
          ? directions?.has(item.direction)
          : directions !== undefined;
      }),
  );
  const openByModule: Record<DailyPlanModule, number> = {
    vocabulary: 0,
    german: 0,
    mathematics: 0,
  };
  for (const item of openItems) openByModule[item.module] += 1;
  return {
    done: plan.items.length - openItems.length,
    total: plan.items.length,
    openByModule,
    openItems,
  };
}
