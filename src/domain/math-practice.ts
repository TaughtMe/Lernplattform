import { z } from "zod";
import {
  buildMentalMathTask,
  generateMentalMathTasks,
  parseMentalMathExpression,
  parseMentalMathTask,
  type MentalMathTask,
} from "./mental-math";
import type { LearningEventV1 } from "./learning-bundle";

export const mathOptionsSchema = z
  .object({
    operations: z
      .array(z.enum(["add", "subtract", "multiply", "divide"]))
      .min(1)
      .max(4),
    minValue: z.number().int().min(-1000000).max(1000000).optional(),
    maxValue: z.number().int().min(1).max(1000000),
    count: z.number().int().min(1).max(50),
    allowNegativeResults: z.boolean().optional(),
    excludeZeroOperand: z.boolean().optional(),
    excludeZeroResult: z.boolean().optional(),
    multiplicationTables: z
      .array(z.number().int().min(1).max(10))
      .max(10)
      .optional(),
    gapMode: z.boolean().optional(),
    gapSlots: z
      .array(z.enum(["left", "right", "result"]))
      .max(50)
      .optional(),
  })
  .strict()
  .refine(
    (value) => (value.minValue ?? 0) <= value.maxValue,
    "Der Zahlenraum ist ungültig.",
  );

export const mathTaskSchema = z
  .object({
    id: z.string().min(1).max(2200),
    prompt: z.string().min(1).max(2000),
    source: z.string().min(1).max(2000),
    answer: z.number().finite(),
    skillId: z.string().min(1).max(200),
    operation: z.enum([
      "add",
      "subtract",
      "multiply",
      "divide",
      "mixed-expression",
    ]),
    gap: z.enum(["left", "right", "result"]).optional(),
  })
  .strict();

export const mathAttemptSchema = z
  .object({
    task: mathTaskSchema,
    options: mathOptionsSchema,
    answer: z.string().max(2000),
  })
  .strict();
export type MathOptions = z.infer<typeof mathOptionsSchema>;
export type MathPracticeTask = MentalMathTask & { practiceKey?: string };
export type MathReview = {
  id: string;
  task: MentalMathTask;
  options: MathOptions;
  dueAt: string;
  /** Wiederholungsstufe: 0 = fällig nach Fehler, 1–4 = Abstand `MATH_REVIEW_DAYS[step - 1]`. */
  step: number;
  /** Nach der sauberen Antwort auf Stufe 4 gefestigt; `mathReviews` liefert solche Posten nicht mehr. */
  mastered: boolean;
  errors: number;
  lastRound: string;
};

/** Abstände in Tagen für die Stufen 1 bis 4 nach einer sauberen Antwort. */
export const MATH_REVIEW_DAYS = [1, 3, 7, 14] as const;

/** Recover simple gaps; keep complex teacher expressions as exact retries. */
export function mathTaskFromPrompt(
  prompt: string,
  answer: string,
  index = 0,
): MentalMathTask | null {
  const value = Number(answer.replace(",", "."));
  if (!answer.trim() || !Number.isFinite(value)) return null;
  const plain = prompt.replace(/\((-?\d+(?:[.,]\d+)?)\)/g, "$1");
  const gap = plain.includes("_")
    ? plain.split("=")[0]!.includes("_")
      ? plain.trim().startsWith("_")
        ? "left"
        : "right"
      : "result"
    : undefined;
  const restored = plain.replace("_", String(value));
  const expression = parseMentalMathExpression(restored.split("=")[0]!);
  if (expression) {
    const task = buildMentalMathTask(expression, index, gap);
    const equationResult = restored.includes("=")
      ? Number(restored.split("=")[1]!.trim().replace(",", "."))
      : expression.result;
    if (
      Math.abs(task.answer - value) < 0.01 &&
      Math.abs(equationResult - expression.result) < 0.01
    )
      return task;
  }
  const parsed = parseMentalMathTask(plain, index);
  return parsed && Math.abs(parsed.answer - value) < 0.01
    ? parsed
    : {
        id: `math-expression-${index}`,
        prompt,
        source: prompt,
        answer: value,
        skillId: "math:mixed-expression",
        operation: "mixed-expression",
      };
}

export function optionsForMathTask(task: MentalMathTask): MathOptions {
  const expression = parseMentalMathExpression(task.source);
  const numbers = expression
    ? [expression.left, expression.right, expression.result]
    : [task.answer];
  const max = Math.max(1, ...numbers.map(Math.abs));
  const table =
    expression &&
    (task.operation === "divide"
      ? expression.right
      : Math.min(expression.left, expression.right));
  return {
    operations: [
      task.operation === "mixed-expression" ? "add" : task.operation,
    ],
    minValue: Math.max(-1000000, Math.floor(Math.min(0, ...numbers))),
    maxValue: Math.min(
      1000000,
      Math.ceil(max <= 20 ? 20 : max <= 100 ? 100 : max),
    ),
    count: 5,
    allowNegativeResults: numbers.some((value) => value < 0),
    ...(table && Number.isInteger(table) && table >= 1 && table <= 10
      ? { multiplicationTables: [table] }
      : {}),
    gapMode: Boolean(task.gap),
    ...(task.gap ? { gapSlots: [task.gap] } : {}),
  };
}

/**
 * Wiederholungsposten aus den Matheereignissen (reine Projektion).
 *
 * - Ist die erste Antwort sauber (richtig, ohne Hilfe, nicht selbst korrigiert),
 *   entsteht kein Posten.
 * - Fehler, Hilfe oder Selbstkorrektur setzen `step = 0` und machen den Posten
 *   sofort fällig (`dueAt = occurredAt`); `errors` zählt mit.
 * - Eine saubere Antwort in einer neuen Runde ab `dueAt` hebt um eine Stufe
 *   (Abstände `MATH_REVIEW_DAYS`). Die saubere Antwort auf Stufe 4 festigt den
 *   Posten (`mastered`).
 * - Zu frühe saubere Antworten und weitere in derselben Runde sind Übung, aber
 *   kein Aufstieg.
 *
 * Gefestigte Posten filtert diese Funktion selbst heraus; Aufrufer sehen nur,
 * was noch gewiesen oder wiederholt werden muss. Ein neuer Fehler macht einen
 * gefestigten Posten wieder fällig. Die Rückgabe ist nach `dueAt` sortiert.
 */
export function mathReviews(events: readonly LearningEventV1[]): MathReview[] {
  const reviews = new Map<string, MathReview>();
  for (const event of [...events].sort(
    (a, b) =>
      a.occurredAt.localeCompare(b.occurredAt) || a.id.localeCompare(b.id),
  )) {
    if (!event.math) continue;
    const previous = reviews.get(event.learningObjectId);
    const occurred = Date.parse(event.occurredAt);
    const clean = isCleanMathAnswer(event);
    if (clean && !previous) continue;
    const base = {
      id: event.learningObjectId,
      task: previous?.task ?? event.math.task,
      options: previous?.options ?? event.math.options,
      lastRound: event.roundId,
    };
    if (!clean) {
      reviews.set(event.learningObjectId, {
        ...base,
        dueAt: event.occurredAt,
        step: 0,
        mastered: false,
        errors: (previous?.errors ?? 0) + 1,
      });
      continue;
    }
    const prior = previous!;
    const rises =
      !prior.mastered &&
      occurred >= Date.parse(prior.dueAt) &&
      prior.lastRound !== event.roundId;
    if (!rises) {
      reviews.set(event.learningObjectId, {
        ...prior,
        lastRound: base.lastRound,
      });
      continue;
    }
    const finished = prior.step >= MATH_REVIEW_DAYS.length;
    const step = finished ? prior.step : prior.step + 1;
    reviews.set(event.learningObjectId, {
      ...base,
      dueAt: finished
        ? prior.dueAt
        : new Date(
            occurred + MATH_REVIEW_DAYS[step - 1]! * 86400000,
          ).toISOString(),
      step,
      mastered: finished,
      errors: prior.errors,
    });
  }
  return [...reviews.values()]
    .filter((review) => !review.mastered)
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}

function isCleanMathAnswer(event: LearningEventV1) {
  return (
    event.assessment.knowledge === "correct" &&
    event.help === "none" &&
    !event.assessment.selfCorrected
  );
}

/**
 * Alle Aufgaben einer Runde als Übungsposten, auch saubere (für „Mehr üben“
 * nach einer Raumrunde). Keine Wiederholungsplanung: `step = 0`.
 */
export function mathRoundReviews(
  events: readonly LearningEventV1[],
): MathReview[] {
  const reviews = new Map<string, MathReview>();
  for (const event of [...events].sort(
    (a, b) =>
      a.occurredAt.localeCompare(b.occurredAt) || a.id.localeCompare(b.id),
  )) {
    if (!event.math) continue;
    const previous = reviews.get(event.learningObjectId);
    reviews.set(event.learningObjectId, {
      id: event.learningObjectId,
      task: previous?.task ?? event.math.task,
      options: previous?.options ?? event.math.options,
      dueAt: event.occurredAt,
      step: 0,
      mastered: false,
      errors: (previous?.errors ?? 0) + (isCleanMathAnswer(event) ? 0 : 1),
      lastRound: event.roundId,
    });
  }
  return [...reviews.values()].sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}

/**
 * Aufgabenfamilie eines Postens: Rechenart, Lückenposition und bei ×/÷ die
 * Einmaleinsreihe, sonst die Zahlenraum-Stufe (≤20, ≤100, ≤1000, größer).
 * Gemischte Ausdrücke bilden eine eigene Familie.
 */
export function mathFamilyKey(
  review: Pick<MathReview, "task" | "options">,
): string {
  const { task, options } = review;
  if (task.operation === "mixed-expression") return "mixed-expression";
  const prefix = `${task.operation}:${task.gap ?? "normal"}`;
  if (task.operation === "multiply" || task.operation === "divide") {
    const expression = parseMentalMathExpression(task.source);
    const matching = expression
      ? options.multiplicationTables?.filter((table) =>
          task.operation === "divide"
            ? table === expression.right
            : table === expression.left || table === expression.right,
        )
      : undefined;
    const table = matching?.length
      ? Math.min(...matching)
      : optionsForMathTask(task).multiplicationTables?.[0];
    if (table !== undefined) return `${prefix}:reihe-${table}`;
  }
  const max = options.maxValue;
  const range =
    max <= 20
      ? "bis-20"
      : max <= 100
        ? "bis-100"
        : max <= 1000
          ? "bis-1000"
          : "darueber";
  return `${prefix}:${range}`;
}

export function buildMathReviewRound(
  reviews: readonly MathReview[],
  random: () => number = Math.random,
  includeOriginal = true,
): MathPracticeTask[] {
  if (!reviews.length) return [];
  const chosen = reviews.slice(0, 5);
  return chosen.flatMap((review, index) => {
    const original = {
      ...review.task,
      id: `review-${index}`,
      practiceKey: review.id,
    };
    if (review.task.operation === "mixed-expression") return [original];
    const expression = parseMentalMathExpression(review.task.source);
    if (
      !expression ||
      ![expression.left, expression.right, expression.result].every(
        Number.isInteger,
      )
    )
      return [original];
    const inferred = optionsForMathTask(review.task);
    const matchingTables = review.options.multiplicationTables?.filter(
      (table) =>
        review.task.operation === "divide"
          ? table === expression.right
          : table === expression.left || table === expression.right,
    );
    let generated: MentalMathTask[];
    try {
      generated = generateMentalMathTasks(
        {
          ...review.options,
          operations: [review.task.operation],
          count: Math.max(1, Math.floor(10 / chosen.length) - 1),
          maxValue: Math.max(
            review.options.maxValue,
            Math.abs(expression.left),
            Math.abs(expression.right),
            Math.abs(expression.result),
          ),
          ...(review.task.operation === "multiply" ||
          review.task.operation === "divide"
            ? {
                multiplicationTables: matchingTables?.length
                  ? matchingTables
                  : (inferred.multiplicationTables ??
                    review.options.multiplicationTables),
              }
            : {}),
          gapMode: Boolean(review.task.gap),
          ...(review.task.gap
            ? { gapSlots: Array(10).fill(review.task.gap) }
            : {}),
        },
        random,
      );
    } catch {
      return [original];
    }
    const variants = generated.map((task, offset) => ({
      ...task,
      id: `variant-${index}-${offset}`,
      practiceKey: review.id,
    }));
    return includeOriginal ? [original, ...variants] : variants;
  });
}
