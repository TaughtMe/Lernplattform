import {
  displayMathNumber,
  mathOperatorSymbol,
  parseMathAnswer,
  parseMentalMathExpression,
  type MathOperator,
  type MentalMathExpression,
  type MentalMathTask,
} from "./mental-math";

/**
 * Hinweise und Lösungsweg bei falschen Kopfrechen-Antworten (Audit D-008).
 *
 * Die Fehlerart ist eine Vermutung aus Aufgabe und Antwort, keine Diagnose:
 * Zufallstreffer sind möglich (4 + 4 und 4 · 4 liegen nahe). Deshalb zeigt
 * die Oberfläche dem Kind nie die Fehlerart, nur die passende Strategie
 * (`mentalMathHint`). Die Fehlerart ist für Lehrkräfte gedacht und dort als
 * Vermutung zu kennzeichnen. Die Funktionen sind rein und verraten die Lösung
 * nicht; erst `mentalMathSolutionSteps` endet mit dem Ergebnis (Regel M-1:
 * Kinder sehen vor der Runde keine Lösungen).
 */
export type MentalMathErrorKind =
  | "sign"
  | "digit-swap"
  | "place-value"
  | "decimal-point"
  | "operation-mix"
  | "tens-bridge"
  | "off-by-one"
  | "neighbor-fact"
  | "unknown";

/** Toleranz für Vergleiche von Dezimalzahlen (Aufgaben rechnen mit 1e-9). */
const EPSILON = 1e-9;

function same(left: number, right: number) {
  return Math.abs(left - right) < EPSILON;
}

function isInteger(value: number) {
  return Number.isInteger(Math.round(value * 1e9) / 1e9);
}

/** Aufgabe mit allen drei Zahlen; bei Lückenaufgaben fehlt die gesuchte nur im Text. */
function partsOf(task: MentalMathTask): MentalMathExpression | null {
  if (task.operation === "mixed-expression") return null;
  return parseMentalMathExpression(task.source);
}

/** Die beiden sichtbaren Zahlen der Aufgabe (bei einer Lücke: die zwei anderen). */
function shownNumbers(task: MentalMathTask, parts: MentalMathExpression) {
  if (task.gap === "left") return [parts.right, parts.result] as const;
  if (task.gap === "right") return [parts.left, parts.result] as const;
  return [parts.left, parts.right] as const;
}

/** Ergebnisse aller Rechenarten mit den beiden sichtbaren Zahlen, in beide Richtungen. */
function otherResults(first: number, second: number) {
  const values = [
    first + second,
    first - second,
    second - first,
    first * second,
  ];
  if (second !== 0) values.push(first / second);
  if (first !== 0) values.push(second / first);
  return values;
}

function swappedAdjacentDigits(expected: number, given: number) {
  if (!Number.isInteger(expected) || !Number.isInteger(given)) return false;
  if (expected < 0 !== given < 0) return false;
  const a = String(Math.abs(expected));
  const b = String(Math.abs(given));
  if (a.length !== b.length || a.length < 2 || a === b) return false;
  for (let index = 0; index < a.length - 1; index += 1) {
    const swapped =
      a.slice(0, index) + a[index + 1]! + a[index]! + a.slice(index + 2);
    if (swapped === b) return true;
  }
  return false;
}

/**
 * Vermutete Fehlerart einer falschen Antwort. Die Regeln laufen von der
 * spezifischsten zur häufigsten; die erste passende gewinnt:
 *
 * 1. `sign`: richtige Zahl, falsches Vorzeichen.
 * 2. `digit-swap`: zwei benachbarte Ziffern vertauscht (54 statt 45).
 * 3. `place-value` / `decimal-point`: Faktor 10 oder 100 daneben, ohne bzw.
 *    mit Komma in der Aufgabe oder Antwort.
 * 4. `operation-mix`: Ergebnis einer anderen Rechenart mit denselben Zahlen
 *    (Summe statt Differenz, Produkt statt Summe, Umkehrung bei Lücken); nur
 *    bei mehr als 1 Abstand zum richtigen Ergebnis.
 * 5. `tens-bridge`: bei Plus und Minus um genau 10 daneben (Übertrag
 *    vergessen oder doppelt gezählt).
 * 6. `off-by-one`: um genau 1 daneben (typisch beim Zählen).
 * 7. `neighbor-fact`: beim Einmaleins das Ergebnis einer Nachbaraufgabe
 *    (7 · 8 statt 56 die 49 oder 63).
 * 8. sonst `unknown`; ebenso bei nicht lesbarer oder richtiger Antwort.
 */
export function classifyMentalMathError(
  task: MentalMathTask,
  givenAnswer: string,
): MentalMathErrorKind {
  const given = parseMathAnswer(givenAnswer);
  const expected = task.answer;
  if (given === null || same(given, expected)) return "unknown";
  const parts = partsOf(task);
  const difference = given - expected;

  if (expected !== 0 && same(given, -expected)) return "sign";
  if (swappedAdjacentDigits(expected, given)) return "digit-swap";

  if (expected !== 0) {
    for (const factor of [10, 100, 0.1, 0.01])
      if (same(given, expected * factor)) {
        const decimals = [
          expected,
          given,
          ...(parts ? [parts.left, parts.right] : []),
        ].some((value) => !isInteger(value));
        return decimals ? "decimal-point" : "place-value";
      }
  }

  if (
    parts &&
    Math.abs(difference) > 1 + EPSILON &&
    otherResults(...shownNumbers(task, parts)).some(
      (value) => same(value, given) && !same(value, expected),
    )
  )
    return "operation-mix";

  const additive = task.operation === "add" || task.operation === "subtract";
  if (additive && same(Math.abs(difference), 10)) return "tens-bridge";
  if (same(Math.abs(difference), 1)) return "off-by-one";

  if (parts && task.operation === "multiply" && !task.gap) {
    const { left, right } = parts;
    const integers = isInteger(left) && isInteger(right);
    if (
      integers &&
      left >= 2 &&
      right >= 2 &&
      [left, right].some((step) => same(Math.abs(difference), step))
    )
      return "neighbor-fact";
  }
  return "unknown";
}

function show(value: number) {
  return displayMathNumber(value);
}

function operatorWord(operator: MathOperator) {
  return operator === "+"
    ? "Plus"
    : operator === "-"
      ? "Minus"
      : operator === "*"
        ? "Mal"
        : "Geteilt";
}

function expressionText(left: number, operator: MathOperator, right: number) {
  return `${show(left)} ${mathOperatorSymbol(operator)} ${show(right)}`;
}

function bridgeHint(parts: MentalMathExpression): string | null {
  const { left, operator, right } = parts;
  if (!isInteger(left) || !isInteger(right) || left < 0 || right < 0)
    return null;
  const ones = left % 10;
  if (ones === 0) return null;
  const step = operator === "+" ? 10 - ones : ones;
  if (right <= step) return null;
  const sign = mathOperatorSymbol(operator);
  return `Zerlege am Zehner: ${show(left)} ${sign} ${show(right)} = ${show(left)} ${sign} ${step} ${sign} ${right - step}.`;
}

/**
 * Kurzer Strategiehinweis für das Kind. Er nennt die Strategie, nie die
 * Fehlerart und nie das Ergebnis; Zahlen aus der Aufgabe dürfen vorkommen.
 */
export function mentalMathHint(
  task: MentalMathTask,
  errorKind: MentalMathErrorKind,
): string {
  const parts = partsOf(task);
  if (!parts)
    return "Rechne Schritt für Schritt: Klammern zuerst, Punkt vor Strich.";
  if (task.gap && errorKind !== "digit-swap")
    return "Setze deine Zahl in die Lücke und rechne zur Probe nach.";
  switch (errorKind) {
    case "digit-swap":
      return "Schau auf die Reihenfolge der Ziffern: Zehner zuerst, dann Einer.";
    case "sign":
      return "Überlege zuerst: Liegt das Ergebnis über oder unter null?";
    case "place-value":
      return "Achte auf die Stellen: Schätze zuerst, ob das Ergebnis eher klein oder groß ist.";
    case "decimal-point":
      return "Schau auf das Komma: Rechne zuerst ohne Komma und setze es dann wieder ein.";
    case "operation-mix":
      return `Schau auf das Rechenzeichen: Hier steht ${mathOperatorSymbol(parts.operator)}, das heißt ${operatorWord(parts.operator)}.`;
    case "tens-bridge":
      return (
        bridgeHint(parts) ?? "Rechne in zwei Schritten über den vollen Zehner."
      );
    case "off-by-one":
      return "Mach die Probe mit der Umkehraufgabe: Rechne rückwärts und schau, ob du wieder bei der ersten Zahl landest.";
    case "neighbor-fact":
      return neighborHint(parts);
    case "unknown":
      return strategyHint(parts);
  }
}

function neighborHint(parts: MentalMathExpression) {
  const { left, right } = parts;
  if (!isInteger(left) || !isInteger(right) || left < 2 || right < 2)
    return "Nutze eine Aufgabe, die du sicher kannst, und rechne von dort weiter.";
  return `Nutze die Nachbaraufgabe: ${show(left)} · ${show(right)} = ${show(left)} · ${right - 1} + ${show(left)}.`;
}

function strategyHint(parts: MentalMathExpression) {
  const { left, operator, right } = parts;
  if (operator === "+" || operator === "-")
    return (
      bridgeHint(parts) ??
      "Rechne in kleinen Schritten: Zerlege die zweite Zahl in Zehner und Einer."
    );
  if (operator === "*") {
    return isInteger(left) && isInteger(right) && Math.min(left, right) >= 2
      ? neighborHint(parts)
      : "Rechne zuerst ohne Komma oder Null und setze sie danach wieder ein.";
  }
  return right !== 0 && isInteger(left) && isInteger(right)
    ? `Umkehraufgabe: ${show(left)} : ${show(right)} = ?, weil ? · ${show(right)} = ${show(left)}.`
    : "Nutze die Umkehraufgabe: Mal und Geteilt gehören zusammen.";
}

function digitParts(value: number) {
  const digits = String(value);
  return [...digits]
    .map((digit, index) => Number(digit) * 10 ** (digits.length - 1 - index))
    .filter((part) => part > 0);
}

function decimalPlaces(value: number) {
  const text = String(Math.round(value * 1e9) / 1e9);
  return text.includes(".") ? text.split(".")[1]!.length : 0;
}

function solved(answer: number) {
  return `Die Lösung ist ${show(answer)}.`;
}

function gapSteps(task: MentalMathTask, parts: MentalMathExpression) {
  const { left, operator, right, result } = parts;
  const gap = task.gap!;
  const other = gap === "left" ? right : left;
  let inverse: string;
  if (operator === "+") inverse = expressionText(result, "-", other);
  else if (operator === "-")
    inverse =
      gap === "left"
        ? expressionText(result, "+", right)
        : expressionText(left, "-", result);
  else if (operator === "*") inverse = expressionText(result, "/", other);
  else
    inverse =
      gap === "left"
        ? expressionText(result, "*", right)
        : expressionText(left, "/", result);
  return [
    `Drehe die Aufgabe um: ${inverse} = ${show(task.answer)}.`,
    `Probe: ${expressionText(left, operator, right)} = ${show(result)}.`,
    solved(task.answer),
  ];
}

function addSubtractSteps(parts: MentalMathExpression) {
  const { left, operator, right, result } = parts;
  const sign = mathOperatorSymbol(operator);
  const integers = isInteger(left) && isInteger(right);
  if (!integers) return decimalSteps(parts);
  if (left < 0 || right < 0) return [];
  if (operator === "-" && left < right)
    return [
      `${show(right)} − ${show(left)} = ${show(right - left)}.`,
      "Du nimmst mehr weg, als da ist. Darum kommt ein Minus davor.",
    ];
  const ones = left % 10;
  const step = operator === "+" ? 10 - ones : ones;
  if (right < 10 && ones !== 0 && right > step) {
    const zehner = operator === "+" ? left + step : left - step;
    return [
      `${show(left)} ${sign} ${step} = ${zehner} (bis zum vollen Zehner).`,
      `Von der ${right} bleiben ${right - step} übrig: ${zehner} ${sign} ${right - step} = ${show(result)}.`,
    ];
  }
  const rightParts = digitParts(right);
  if (rightParts.length >= 2 && rightParts.length <= 3) {
    const steps: string[] = [];
    let running = left;
    for (const part of rightParts) {
      const next = operator === "+" ? running + part : running - part;
      steps.push(`${running} ${sign} ${part} = ${next}.`);
      running = next;
    }
    return steps;
  }
  return [`${expressionText(left, operator, right)} = ${show(result)}.`];
}

/** Ohne Komma rechnen und das Komma wieder setzen (Plus, Minus, Mal). */
function decimalSteps(parts: MentalMathExpression) {
  const { left, operator, right, result } = parts;
  if (operator === "/") return [];
  const places =
    operator === "*"
      ? [decimalPlaces(left), decimalPlaces(right)]
      : Array<number>(2).fill(
          Math.max(decimalPlaces(left), decimalPlaces(right)),
        );
  const scaledLeft = Math.round(left * 10 ** places[0]!);
  const scaledRight = Math.round(right * 10 ** places[1]!);
  const scaledResult = Math.round(
    result * 10 ** (operator === "*" ? places[0]! + places[1]! : places[0]!),
  );
  return [
    `Rechne ohne Komma: ${scaledLeft} ${mathOperatorSymbol(operator)} ${scaledRight} = ${scaledResult}.`,
    "Setze das Komma wieder: Es hat so viele Stellen wie in der Aufgabe.",
  ];
}

function multiplySteps(parts: MentalMathExpression) {
  const { left, right, result } = parts;
  if (!isInteger(left) || !isInteger(right)) return decimalSteps(parts);
  const [small, big] = left <= right ? [left, right] : [right, left];
  if (small < 0) return [];
  if (small <= 1 || big === 10 || big === 100)
    return small === 0
      ? ["Mal null ergibt immer null."]
      : big === 10 || big === 100
        ? [
            `Mal ${big} heißt: ${big === 10 ? "eine Null" : "zwei Nullen"} anhängen.`,
          ]
        : [`${show(left)} · ${show(right)} = ${show(result)}.`];
  if (big === 9)
    return [
      `Rechne mit 10: 10 · ${small} = ${10 * small}.`,
      `Ein ${small}er zu viel: ${10 * small} − ${small} = ${show(result)}.`,
    ];
  if (big >= 6 && big < 10)
    return [
      `Kernaufgabe: 5 · ${small} = ${5 * small}.`,
      `Dazu kommt: ${big - 5} · ${small} = ${(big - 5) * small}.`,
      `${5 * small} + ${(big - 5) * small} = ${show(result)}.`,
    ];
  if (big <= 5)
    return [
      `Zähle in ${big}er-Schritten, ${small} Mal: ${Array.from({ length: small }, (_, index) => big * (index + 1)).join(", ")}.`,
    ];
  const bigParts = digitParts(big);
  if (big < 100 && bigParts.length === 2)
    return [
      `Zerlege ${big} in ${bigParts[0]} und ${bigParts[1]}.`,
      `${bigParts[0]} · ${small} = ${bigParts[0]! * small} und ${bigParts[1]} · ${small} = ${bigParts[1]! * small}.`,
      `${bigParts[0]! * small} + ${bigParts[1]! * small} = ${show(result)}.`,
    ];
  return [`${expressionText(left, "*", right)} = ${show(result)}.`];
}

function divideSteps(parts: MentalMathExpression) {
  const { left, right, result } = parts;
  const reverse = `Umkehraufgabe: ${show(left)} : ${show(right)} = ?, weil ? · ${show(right)} = ${show(left)}.`;
  if (!isInteger(left) || !isInteger(right) || !isInteger(result))
    return [reverse];
  if (right > 1 && right <= 10)
    return [
      reverse,
      `${right}er-Reihe: ${right} · ${show(result)} = ${show(left)}.`,
    ];
  return [reverse, `Probe: ${show(right)} · ${show(result)} = ${show(left)}.`];
}

/**
 * Lösungsweg in 1 bis 4 kurzen Schritten, der letzte nennt das Ergebnis.
 * Passend zur Aufgabe: Zerlegen am Zehner und Stellenwert bei Plus und Minus,
 * Kernaufgabe beim Einmaleins, Umkehraufgabe bei Division und Lückenaufgaben.
 */
export function mentalMathSolutionSteps(task: MentalMathTask): string[] {
  const parts = partsOf(task);
  if (!parts)
    return [
      "Rechne Schritt für Schritt: Klammern zuerst, dann Punkt vor Strich.",
      solved(task.answer),
    ];
  if (task.gap) return gapSteps(task, parts);
  const steps =
    parts.operator === "+" || parts.operator === "-"
      ? addSubtractSteps(parts)
      : parts.operator === "*"
        ? multiplySteps(parts)
        : divideSteps(parts);
  const withResult = steps.length
    ? steps
    : [
        `${expressionText(parts.left, parts.operator, parts.right)} = ${show(parts.result)}.`,
      ];
  return [...withResult, solved(task.answer)];
}
