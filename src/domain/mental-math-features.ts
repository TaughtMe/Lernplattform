/**
 * Merkmale einer Kopfrechenaufgabe (Baustein MA-1 bis MA-3, Vision 22): ob eine
 * Plus- oder Minusaufgabe einen Übergang hat und aus welchen Stellenwerten ihre
 * Zahlen bestehen. Reine Funktionen auf Zahlen, ohne Zufall und ohne
 * Abhängigkeit vom Generator; die Merkmale werden aus der Aufgabe berechnet und
 * nirgends gespeichert (Dexie und CSV bleiben unverändert).
 */

export type MathFeatureOperator = "+" | "-" | "*" | "/";

/** Stellenwertart einer ganzen Zahl: E = Einer, Z = Zehner, H = Hunderter, T = Tausender. */
export type PlaceValueKind = "E" | "Z" | "ZE" | "H" | "HZ" | "HZE" | "T" | "T+";

/**
 * Merkmal einer Plus- oder Minusaufgabe mit ganzen Zahlen.
 *
 * - `bridge`: Übergang in der Einerstelle. Plus: Die Einer ergeben zusammen
 *   10 oder mehr (Übertrag, 8 + 5, 25 + 15). Minus: Die Einer der ersten Zahl
 *   sind kleiner als die der zweiten (Entbündeln, 13 − 6, 53 − 27). Ganze
 *   Zehner (56 + 70) haben keinen Übergang.
 * - `placeValue`: die Stellenwertarten beider Zahlen, z. B. `ZE+E`, `ZE-ZE`.
 */
export type MathTaskFeature = {
  bridge: boolean;
  placeValue: string;
};

/** Stellenwertart einer ganzen, nicht negativen Zahl; sonst `null`. */
export function placeValueKind(value: number): PlaceValueKind | null {
  if (!Number.isInteger(value) || value < 0) return null;
  if (value < 10) return "E";
  if (value < 100) return value % 10 === 0 ? "Z" : "ZE";
  if (value < 1000) {
    if (value % 100 === 0) return "H";
    return value % 10 === 0 ? "HZ" : "HZE";
  }
  return value % 1000 === 0 ? "T" : "T+";
}

/**
 * Merkmal einer Aufgabe `left ± right`. `null` bei Mal und Geteilt, bei
 * Dezimalzahlen, negativen Zahlen und bei Minus mit negativem Ergebnis: dort
 * gibt es keinen Übergang im Sinn dieser Regel.
 */
export function mathTaskFeature(
  left: number,
  operator: MathFeatureOperator,
  right: number,
): MathTaskFeature | null {
  if (operator !== "+" && operator !== "-") return null;
  const leftKind = placeValueKind(left);
  const rightKind = placeValueKind(right);
  if (!leftKind || !rightKind) return null;
  if (operator === "-" && left < right) return null;
  const bridge =
    operator === "+"
      ? (left % 10) + (right % 10) >= 10
      : left % 10 < right % 10;
  return { bridge, placeValue: `${leftKind}${operator}${rightKind}` };
}

/** Passt die Aufgabe `left ± right` zum gewünschten Merkmal? */
export function matchesMathFeature(
  left: number,
  operator: MathFeatureOperator,
  right: number,
  wanted: MathTaskFeature,
) {
  const feature = mathTaskFeature(left, operator, right);
  return (
    feature !== null &&
    feature.bridge === wanted.bridge &&
    feature.placeValue === wanted.placeValue
  );
}

/**
 * Hat die Rechnung einen Übertrag bei den Hundertern (Plus: Zehner und Einer
 * ergeben zusammen 100 oder mehr; Minus: die letzten zwei Stellen der ersten
 * Zahl sind kleiner als die der zweiten)? Nur für ganze, nicht negative Zahlen.
 */
export function hasHundredsBridge(
  left: number,
  operator: MathFeatureOperator,
  right: number,
) {
  if (operator !== "+" && operator !== "-") return false;
  if (!placeValueKind(left) || !placeValueKind(right)) return false;
  if (operator === "-" && left < right) return false;
  return operator === "+"
    ? (left % 100) + (right % 100) >= 100
    : left % 100 < right % 100;
}

/**
 * Stellenweise „kleiner von größer“ gerechnet: In jeder Stelle wird die
 * kleinere Ziffer von der größeren abgezogen (53 − 27 → 34 statt 26). Ergibt
 * nur einen Wert, wenn dabei wirklich eine Stelle vertauscht wird (die Zahl
 * weicht vom richtigen Ergebnis ab); sonst `null`.
 */
export function digitwiseSubtraction(left: number, right: number) {
  if (!placeValueKind(left) || !placeValueKind(right) || left < right)
    return null;
  const a = String(left);
  const b = String(right).padStart(a.length, "0");
  let result = "";
  for (let index = 0; index < a.length; index += 1)
    result += String(Math.abs(Number(a[index]) - Number(b[index])));
  const value = Number(result);
  return value === left - right ? null : value;
}

/**
 * Art einer Aufgabe für die Gewichtung des Generators (MA-1). Eine Aufgabe
 * kann zu mehreren Arten passen.
 *
 * - `bridge`: Zehnerübergang (nur Plus und Minus).
 * - `double`: Verdoppeln (a + a, bei Minus Halbieren 2a − a, bei Mal · 2).
 * - `near-double`: Fast-Verdoppeln (a + (a ± 1)).
 * - `core`: Kernaufgabe. Plus und Minus: Das Ergebnis ist ein voller Zehner.
 *   Mal und Geteilt: ein Faktor ist 5.
 * - `neighbour`: Nachbaraufgabe. Plus und Minus: Das Ergebnis liegt um 1 neben
 *   einem vollen Zehner. Mal und Geteilt: ein Faktor ist 3, 4, 6 oder 9
 *   (Nachbar von 2, 5 und 10).
 * - `other`: alles übrige.
 */
export type MathTaskKind =
  "bridge" | "double" | "near-double" | "core" | "neighbour" | "other";

export type MathKindOperation = "add" | "subtract" | "multiply" | "divide";

/** Gewichte je Rechenart in Prozent (Summe 100). Mal und Geteilt teilen sich ihre. */
export const MATH_KIND_WEIGHTS: Readonly<
  Record<MathKindOperation, readonly (readonly [MathTaskKind, number])[]>
> = {
  add: [
    ["bridge", 35],
    ["double", 10],
    ["near-double", 10],
    ["core", 10],
    ["neighbour", 10],
    ["other", 25],
  ],
  subtract: [
    ["bridge", 45],
    ["double", 10],
    ["core", 15],
    ["neighbour", 15],
    ["other", 15],
  ],
  multiply: [
    ["double", 15],
    ["core", 25],
    ["neighbour", 35],
    ["other", 25],
  ],
  divide: [
    ["double", 15],
    ["core", 25],
    ["neighbour", 35],
    ["other", 25],
  ],
};

/** Höchstanteil der Aufgaben mit 0, 1 oder · 10 in einer Runde (MA-1). */
export const MATH_TRIVIAL_SHARE = 0.05;

/**
 * Aufgaben mit 0, 1 oder · 10: Plus und Minus mit 0 oder 1 als Zahl, Mal mit
 * 0, 1 oder 10 als Faktor, Geteilt durch 1 oder 10 oder 0 geteilt.
 */
export function isTrivialMathTask(
  operation: MathKindOperation,
  left: number,
  right: number,
) {
  if (operation === "add" || operation === "subtract")
    return left === 0 || left === 1 || right === 0 || right === 1;
  if (operation === "multiply") return [left, right].some(isTrivialFactor);
  return left === 0 || right === 1 || right === 10;
}

function isTrivialFactor(value: number) {
  return value === 0 || value === 1 || value === 10;
}

/** Passt die Aufgabe zur gewünschten Art? `result` ist das Ergebnis der Rechnung. */
export function matchesMathKind(
  kind: MathTaskKind,
  operation: MathKindOperation,
  left: number,
  right: number,
  result: number,
) {
  if (operation === "multiply" || operation === "divide") {
    // Beim Teilen zählt das Faktorenpaar: Teiler und Ergebnis.
    const [first, second] =
      operation === "multiply" ? [left, right] : [right, result];
    const has = (values: readonly number[]) =>
      values.includes(first) || values.includes(second);
    if (kind === "double") return has([2]);
    if (kind === "core") return has([5]);
    if (kind === "neighbour") return has([3, 4, 6, 9]);
    if (kind === "other") return !has([2, 5, 3, 4, 6, 9]);
    return false;
  }
  const operator = operation === "add" ? "+" : "-";
  if (kind === "bridge")
    return mathTaskFeature(left, operator, right)?.bridge === true;
  if (kind === "double")
    return operation === "add" ? left === right : left === 2 * right;
  if (kind === "near-double")
    return operation === "add" && Math.abs(left - right) === 1;
  if (kind === "core") return result >= 10 && result % 10 === 0;
  if (kind === "neighbour")
    return result >= 9 && (result % 10 === 1 || result % 10 === 9);
  return true;
}

/** Wählt eine Art nach Gewicht; `random` liefert eine Zahl in [0, 1). */
export function pickMathKind(
  operation: MathKindOperation,
  random: () => number,
): MathTaskKind {
  const weights = MATH_KIND_WEIGHTS[operation];
  const total = weights.reduce((sum, [, weight]) => sum + weight, 0);
  let point = random() * total;
  for (const [kind, weight] of weights) {
    point -= weight;
    if (point < 0) return kind;
  }
  return "other";
}

const KIND_PATTERN = "E|Z|ZE|H|HZ|HZE|T\\+|T";

/** Zerlegt `ZE+E` in Stellenwertart der ersten Zahl, Rechenzeichen und der zweiten. */
export function splitPlaceValue(placeValue: string) {
  const match = placeValue.match(
    new RegExp(`^(${KIND_PATTERN})([+-])(${KIND_PATTERN})$`),
  );
  return match
    ? {
        left: match[1] as PlaceValueKind,
        operator: match[2] as "+" | "-",
        right: match[3] as PlaceValueKind,
      }
    : null;
}

const KIND_SPAN: Record<PlaceValueKind, readonly [number, number]> = {
  E: [0, 9],
  Z: [10, 90],
  ZE: [11, 99],
  H: [100, 900],
  HZ: [110, 990],
  HZE: [101, 999],
  T: [1000, 9000],
  "T+": [1001, 9999],
};

/**
 * Zufallszahl der gewünschten Stellenwertart im Zahlenraum [min, max]; `null`,
 * wenn nach einigen Versuchen keine gefunden ist. `random` liefert [0, 1).
 */
export function randomOfPlaceValueKind(
  kind: PlaceValueKind,
  min: number,
  max: number,
  random: () => number,
) {
  const [low, high] = KIND_SPAN[kind];
  const from = Math.max(low, min);
  const to = Math.min(high, max);
  if (from > to) return null;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const value = from + Math.floor(random() * (to - from + 1));
    if (placeValueKind(value) === kind) return value;
  }
  return null;
}
