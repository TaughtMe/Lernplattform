import type { MathReview } from "../../../src/domain/math-practice";
import type { MentalMathOperation } from "../../../src/domain/mental-math";
import { openModuleItems } from "../../lernen/plan-today";

export const operationLabels: Record<MentalMathOperation, string> = {
  add: "Plus",
  subtract: "Minus",
  multiply: "Mal",
  divide: "Geteilt",
};

/**
 * Art und Anzahl der erzeugten Runde in einem Satz, z. B. „12 Aufgaben · Plus
 * und Minus bis 100 · Lücken“. Die Vorschau verrät keine Lösung (Audit C-013).
 */
export function describeRound(settings: {
  count: number;
  operations: readonly MentalMathOperation[];
  minValue: number;
  maxValue: number;
  tables: readonly number[];
  gapMode: boolean;
}) {
  const names = (Object.keys(operationLabels) as MentalMathOperation[])
    .filter((operation) => settings.operations.includes(operation))
    .map((operation) => operationLabels[operation]);
  const kinds =
    names.length > 1
      ? `${names.slice(0, -1).join(", ")} und ${names.at(-1)}`
      : (names[0] ?? "");
  const usesTables = settings.operations.some(
    (operation) => operation === "multiply" || operation === "divide",
  );
  const tables = settings.tables.join(", ");
  return [
    `${settings.count} ${settings.count === 1 ? "Aufgabe" : "Aufgaben"}`,
    `${kinds} ${settings.minValue > 0 ? `von ${settings.minValue} ` : ""}bis ${settings.maxValue}`,
    ...(usesTables && settings.tables.length
      ? [`${settings.tables.length === 1 ? "Reihe" : "Reihen"} ${tables}`]
      : []),
    ...(settings.gapMode ? ["Lücken"] : []),
  ].join(" · ");
}

/**
 * Posten der Tagesportion: je offenem Mathe-Element der am längsten fällige
 * Posten seiner Familie. Was inzwischen nicht mehr fällig ist, zählt nicht.
 * `buildMathReviewRound` nimmt höchstens fünf Posten; der Rest folgt in der
 * nächsten Runde.
 */
export function todaysReviews(
  progress: Parameters<typeof openModuleItems>[0],
  reviews: readonly MathReview[],
  now: string,
) {
  // `mathReviews` ist nach Fälligkeit sortiert: der erste Treffer ist der älteste.
  return openModuleItems(progress, "mathematics").flatMap((item) => {
    const review = reviews.find(
      (entry) => item.objectIds.includes(entry.id) && entry.dueAt <= now,
    );
    return review ? [review] : [];
  });
}
