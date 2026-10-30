import {
  displayMathNumber,
  evaluateMentalMathExpression,
  isLatexMathSyntax,
  normalizeMathChainInput,
} from "./mental-math";

/**
 * Erste Rechenschritte eines gemischten Ausdrucks (mehrere Rechenzeichen,
 * Klammern, Brüche), nach den Rechenregeln: Klammern zuerst, dann Punkt vor
 * Strich, dann von links nach rechts. Den letzten Rechenschritt lässt die
 * Funktion immer aus; er bleibt dem Kind (Regel M-1, C4-3).
 *
 * Ausgewertet wird mit `evaluateMentalMathExpression`, nichts Neues. Text in
 * `$…$` ist LaTeX (siehe `MathText`).
 */
export type ExpressionSteps = {
  /** Gezeigte Teilschritte, höchstens `MAX_STEPS`. */
  steps: string[];
  /** Was noch zu rechnen bleibt, wenn alle Schritte bis auf den letzten gezeigt sind. */
  rest: string | null;
};

const MAX_STEPS = 3;
const EPSILON = 1e-9;
const OPERATORS = "+-−*×·/:÷^";
const POINT_OPERATORS = "*×·/:÷";

type Term = { sign: "+" | "-"; text: string };

function same(left: number, right: number) {
  return Math.abs(left - right) < EPSILON;
}

function rounded(value: number) {
  return Math.round(value * 1e9) / 1e9;
}

function symbol(sign: "+" | "-") {
  return sign === "+" ? "+" : "−";
}

function operand(value: number) {
  return value < 0 ? `(${displayMathNumber(value)})` : displayMathNumber(value);
}

/** Zerlegt am obersten Plus und Minus; Vorzeichen am Anfang eines Terms bleiben im Term. */
function splitTerms(source: string): Term[] | null {
  const terms: Term[] = [];
  let depth = 0;
  let start = 0;
  let sign: "+" | "-" = "+";
  let previous = "";
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]!;
    if ("({[".includes(character)) depth += 1;
    else if (")}]".includes(character)) {
      depth -= 1;
      if (depth < 0) return null;
    } else if (
      depth === 0 &&
      (character === "+" || character === "-" || character === "−") &&
      previous !== "" &&
      !OPERATORS.includes(previous)
    ) {
      terms.push({ sign, text: source.slice(start, index).trim() });
      sign = character === "+" ? "+" : "-";
      start = index + 1;
    }
    if (!/\s/.test(character)) previous = character;
  }
  if (depth !== 0) return null;
  terms.push({ sign, text: source.slice(start).trim() });
  return terms.every((term) => term.text) ? terms : null;
}

function hasPointOperator(text: string) {
  let depth = 0;
  for (const character of text) {
    if ("({[".includes(character)) depth += 1;
    else if (")}]".includes(character)) depth -= 1;
    else if (depth === 0 && POINT_OPERATORS.includes(character)) return true;
  }
  return false;
}

/** Klammerpaare ganz außen (nicht in geschweiften Klammern), samt Inhalt. */
function outerGroups(source: string) {
  const groups: { start: number; end: number; inner: string }[] = [];
  let depth = 0;
  let start = -1;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]!;
    if (character === "(") {
      if (depth === 0) start = index;
      depth += 1;
    } else if ("{[".includes(character)) depth += 1;
    else if (")}]".includes(character)) {
      depth -= 1;
      if (depth < 0) return null;
      if (depth === 0 && character === ")")
        groups.push({
          start,
          end: index,
          inner: source.slice(start + 1, index),
        });
    }
  }
  return depth === 0 ? groups : null;
}

/** Ausdruck zum Vorzeigen: Zahlenkette als Text, alles andere als LaTeX. */
function shown(text: string) {
  return normalizeMathChainInput(text) ?? `$${text}$`;
}

function none(steps: string[] = []): ExpressionSteps {
  return { steps, rest: null };
}

export function expressionSteps(
  source: string,
  answer: number,
): ExpressionSteps {
  let text = source.trim();
  const steps: string[] = [];
  const lead = () => (steps.length ? "Dann" : "Rechne zuerst");

  // 1. Klammern, die selbst etwas rechnen.
  const groups = outerGroups(text);
  if (!groups) return none();
  const inside = groups
    .filter((group) => /[-+−*×·/:÷]/.test(group.inner.replace(/^\s*-/, "")))
    .map((group) => ({
      ...group,
      value: evaluateMentalMathExpression(group.inner),
    }));
  if (inside.length > MAX_STEPS) return none();
  if (inside.length) {
    if (inside.some((group) => group.value === null)) return none();
    if (inside.some((group) => same(group.value!, answer))) return none();
    const listed = inside
      .map(
        (group) => `${shown(group.inner)} = ${displayMathNumber(group.value!)}`,
      )
      .join(" und ");
    steps.push(
      `Rechne zuerst ${inside.length === 1 ? "die Klammer" : "die Klammern"}: ${listed}.`,
    );
    for (const group of [...inside].reverse())
      text = `${text.slice(0, group.start)}${displayMathNumber(group.value!)}${text.slice(group.end + 1)}`;
  }

  // 2. Terme am obersten Plus und Minus.
  const terms = splitTerms(text);
  if (!terms) return none(steps);
  const items = terms.map((term) => {
    const value = evaluateMentalMathExpression(term.text);
    return {
      ...term,
      value,
      point: hasPointOperator(term.text),
      // Ein Bruch, eine Wurzel oder Potenz: bleibt als Formel stehen.
      latex: !hasPointOperator(term.text) && isLatexMathSyntax(term.text),
    };
  });
  if (items.some((item) => item.value === null)) return none(steps);
  const values = items.map((item) =>
    item.sign === "+" ? item.value! : -item.value!,
  );
  const total = rounded(values.reduce((sum, value) => sum + value, 0));
  if (!same(total, answer)) return none(steps);

  // 3. Punkt vor Strich, wenn noch ein Strich folgt.
  const display = items.map((item) => {
    if (item.point) return displayMathNumber(item.value!);
    if (item.latex) return `$${item.text}$`;
    return normalizeMathChainInput(item.text) ?? item.text;
  });
  if (items.length >= 2) {
    const points = items.flatMap((item, index) => (item.point ? [index] : []));
    if (points.length > MAX_STEPS) return none(steps);
    if (points.length) {
      if (points.some((index) => same(items[index]!.value!, answer)))
        return none(steps);
      steps.push(
        `${lead()} Punkt vor Strich: ${points
          .map(
            (index) =>
              `${shown(items[index]!.text)} = ${displayMathNumber(items[index]!.value!)}`,
          )
          .join(" und ")}.`,
      );
    }
  } else {
    // Ein einziger Term: Der letzte Schritt gehört dem Kind.
    return steps.length ? { steps, rest: shown(text) } : none();
  }

  // 4. Von links nach rechts, ohne den letzten Schritt.
  let running = items[0]!.value!;
  let runningText = display[0]!;
  for (let index = 1; index <= items.length - 2; index += 1) {
    const item = items[index]!;
    const next = rounded(
      item.sign === "+" ? running + item.value! : running - item.value!,
    );
    if (same(next, answer) || steps.length >= MAX_STEPS) return none(steps);
    const rightText = item.latex ? display[index]! : operand(item.value!);
    steps.push(
      `${lead()} ${runningText} ${symbol(item.sign)} ${rightText} = ${displayMathNumber(next)}.`,
    );
    running = next;
    runningText = displayMathNumber(next);
  }
  const last = items.at(-1)!;
  const lastText = last.latex ? display.at(-1)! : operand(last.value!);
  return {
    steps,
    rest: `${runningText} ${symbol(last.sign)} ${lastText}`,
  };
}
