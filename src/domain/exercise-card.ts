import { getLearningWordCollection } from "./german-learning-content";
import { LEARNING_WORD_STAGES, type LearningWordStage } from "./learning-word";
import {
  MATH_KIND_LABELS,
  MATH_KINDS,
  type MathKindId,
} from "./mental-math-kinds";
import type { MentalMathOperation } from "./mental-math";

/**
 * Übungskarten mit QR-Code (L25-4, Entscheidung 63). Eine Karte trägt nur
 * Kennungen mitgelieferter Übungen: Wortbox und Stufe oder eine Rechenvorgabe.
 * Eigene Wörter der Lehrkraft stehen nie in der Adresse (Entscheidung 60).
 *
 * Die Adresse öffnet die Übung mit dieser Einstellung im Startblatt; das Kind
 * startet selbst (Entscheidung 86: kein Start ohne Einstellungsschritt).
 * Rein und ohne Speicherzugriff: Lehrkraft (Bogen) und Kind (Öffnen) nutzen
 * dieselben Funktionen.
 */

export const MATH_CARD_OPERATIONS = [
  "add",
  "subtract",
  "multiply",
  "divide",
] as const satisfies readonly MentalMathOperation[];

/** Zahlenräume einer Rechenkarte. */
export const MATH_CARD_RANGES = [20, 100, 1000] as const;
export type MathCardRange = (typeof MATH_CARD_RANGES)[number];

export type WordBoxCard = {
  kind: "wortbox";
  collectionId: string;
  stage: LearningWordStage;
};

export type MathCard =
  | {
      kind: "kopfrechnen";
      operations: readonly MentalMathOperation[];
      max: MathCardRange;
    }
  | {
      /** Mittelschul-Arten (MA-11) statt Rechenart und Zahlenraum. */
      kind: "kopfrechnen";
      mathKinds: readonly MathKindId[];
    };

export type ExerciseCard = WordBoxCard | MathCard;

const WORD_PATH = "/frei/german/lernwoerter";
const MATH_PATH = "/frei/mathematics";

const OPERATION_PARAM: Record<MentalMathOperation, string> = {
  add: "plus",
  subtract: "minus",
  multiply: "mal",
  divide: "geteilt",
};

const OPERATION_LABEL: Record<MentalMathOperation, string> = {
  add: "Plus",
  subtract: "Minus",
  multiply: "Mal",
  divide: "Geteilt",
};

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

/** Relative Adresse der Übung, z. B. `/frei/mathematics?rechnen=plus,minus&bis=100`. */
export function exerciseCardHref(card: ExerciseCard): string {
  if (card.kind === "wortbox") {
    const params = new URLSearchParams({
      sammlung: card.collectionId,
      stufe: String(card.stage),
    });
    return `${WORD_PATH}?${params.toString()}`;
  }
  if ("mathKinds" in card) {
    return `${MATH_PATH}?arten=${unique(card.mathKinds).join(",")}`;
  }
  const operations = unique(card.operations)
    .map((operation) => OPERATION_PARAM[operation])
    .join(",");
  return `${MATH_PATH}?rechnen=${operations}&bis=${card.max}`;
}

/** Überschrift der Karte in Kinderworten, z. B. „ck und tz · Stufe 3“. */
export function exerciseCardTitle(card: ExerciseCard): string {
  if (card.kind === "wortbox") {
    const title =
      getLearningWordCollection(card.collectionId)?.title ?? "Wortbox";
    return `${title} · Stufe ${card.stage}`;
  }
  if ("mathKinds" in card) {
    return unique(card.mathKinds)
      .map((kind) => MATH_KIND_LABELS[kind])
      .join(" · ");
  }
  const operations = unique(card.operations)
    .map((operation) => OPERATION_LABEL[operation])
    .join(" und ");
  return `${operations} bis ${card.max}`;
}

/** `?stufe=` einer Wortbox-Karte; ungültige Werte ergeben `undefined`. */
export function parseStageParam(
  raw: string | null | undefined,
): LearningWordStage | undefined {
  const value = Number(raw);
  return (LEARNING_WORD_STAGES as readonly number[]).includes(value)
    ? (value as LearningWordStage)
    : undefined;
}

/** Vorbelegung für Kopfrechnen aus der Adresse einer Rechenkarte. */
export type MathCardPreset =
  | { operations: MentalMathOperation[]; max: MathCardRange }
  | { mathKinds: MathKindId[] };

/**
 * Liest `?rechnen=…&bis=…` oder `?arten=…`. Unbekannte Werte fallen weg; ist
 * danach nichts Gültiges übrig, gibt es keine Vorbelegung (`undefined`).
 */
export function parseMathCardParams(
  params: Pick<URLSearchParams, "get">,
): MathCardPreset | undefined {
  const kinds = (params.get("arten") ?? "")
    .split(",")
    .filter((value): value is MathKindId =>
      (MATH_KINDS as readonly string[]).includes(value),
    );
  if (kinds.length > 0) return { mathKinds: unique(kinds) };
  const byParam = new Map(
    MATH_CARD_OPERATIONS.map((operation) => [
      OPERATION_PARAM[operation],
      operation,
    ]),
  );
  const operations = unique(
    (params.get("rechnen") ?? "")
      .split(",")
      .map((value) => byParam.get(value))
      .filter((value): value is MentalMathOperation => value !== undefined),
  );
  const max = Number(params.get("bis"));
  if (
    operations.length === 0 ||
    !(MATH_CARD_RANGES as readonly number[]).includes(max)
  ) {
    return undefined;
  }
  return { operations, max: max as MathCardRange };
}
