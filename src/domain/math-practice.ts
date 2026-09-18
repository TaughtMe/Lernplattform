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
  streak: number;
  errors: number;
  lastRound: string;
};

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

export function mathReviews(events: readonly LearningEventV1[]): MathReview[] {
  const reviews = new Map<string, MathReview>();
  for (const event of [...events].sort(
    (a, b) =>
      a.occurredAt.localeCompare(b.occurredAt) || a.id.localeCompare(b.id),
  )) {
    if (!event.math) continue;
    const previous = reviews.get(event.learningObjectId);
    const clean =
      event.assessment.knowledge === "correct" &&
      event.help === "none" &&
      !event.assessment.selfCorrected;
    const streak = clean ? (previous?.streak ?? 0) + 1 : 0;
    const now = Date.parse(event.occurredAt);
    const delayed =
      previous &&
      now >= Date.parse(previous.dueAt) &&
      previous.lastRound !== event.roundId &&
      previous.streak >= 2;
    const days = clean && streak >= 2 ? (delayed ? 3 : 1) : 0;
    reviews.set(event.learningObjectId, {
      id: event.learningObjectId,
      task: previous?.task ?? event.math.task,
      options: previous?.options ?? event.math.options,
      dueAt: new Date(
        clean && days > 0
          ? Math.max(
              now + days * 86400000,
              previous ? Date.parse(previous.dueAt) : 0,
            )
          : now,
      ).toISOString(),
      streak,
      errors:
        (previous?.errors ?? 0) +
        (event.assessment.knowledge === "incorrect" ? 1 : 0),
      lastRound: event.roundId,
    });
  }
  return [...reviews.values()].sort((a, b) => a.dueAt.localeCompare(b.dueAt));
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
