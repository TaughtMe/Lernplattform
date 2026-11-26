/**
 * Aufgabenarten der Mittelschule für das Kopfrechnen (MA-11, Vision 22):
 * Zehnereinmaleins, große Zahlen, Runden, Komma und Geld, Größen umrechnen.
 *
 * Jede Art ist eine eigene, ausdrücklich gewählte Einstellung (Entscheidung
 * 86: keine Vorauswahl nach Jahrgang). Reine Logik; der Zufall kommt von außen.
 * Eine Aufgabe trägt ihre Art im optionalen Feld `kind`. Alte Aufgaben ohne
 * `kind` bleiben gültig.
 */
import {
  buildMentalMathTask,
  displayMathNumber,
  generateMentalMathTasks,
  mathOperatorSymbol,
  parseMentalMathExpression,
  type MentalMathExpression,
  type MentalMathOptions,
  type MentalMathTask,
} from "./mental-math";

export const MATH_KINDS = ["tens", "big", "round", "decimal", "units"] as const;
export type MathKindId = (typeof MATH_KINDS)[number];

/** Namen für Einstellungen (Lehrkraft und Kind). */
export const MATH_KIND_LABELS: Record<MathKindId, string> = {
  tens: "Zehnereinmaleins",
  big: "Große Zahlen",
  round: "Runden",
  decimal: "Komma und Geld",
  units: "Größen umrechnen",
};

/** Beispiele für die Einstellung, ohne Lösung. */
export const MATH_KIND_EXAMPLES: Record<MathKindId, string> = {
  tens: "30 · 4 oder 560 : 8",
  big: "3 400 + 2 700",
  round: "Runde 4 678 auf Hunderter",
  decimal: "2,50 € + 1,75 €",
  units: "3 m = _ cm",
};

/**
 * Arten, die sich als einfache Rechenzeile schreiben lassen. Nur diese kann der
 * Live-Raum als Zeile erzeugen; Runden und Größen brauchen eine Textaufgabe.
 */
export const MATH_LINE_KINDS: readonly MathKindId[] = [
  "tens",
  "big",
  "decimal",
];

export function isMathKindId(value: unknown): value is MathKindId {
  return (MATH_KINDS as readonly unknown[]).includes(value);
}

export type MathTasksOptions = MentalMathOptions & {
  /** Gewählte Aufgabenarten; leer oder fehlend heißt: normale Rechenaufgaben. */
  kinds?: readonly MathKindId[] | undefined;
};

type Random = () => number;

function randomInteger(random: Random, min: number, max: number) {
  return min + Math.floor(random() * (max - min + 1));
}

function pick<T>(random: Random, values: readonly T[]): T {
  return values[randomInteger(random, 0, values.length - 1)]!;
}

/** Zahl ab 1000 mit geschütztem Leerzeichen als Tausendertrenner („3 400“). */
export function groupedNumber(value: number) {
  const [integer = "", fraction] = displayMathNumber(value).split(",");
  const grouped =
    Math.abs(value) >= 1000
      ? integer.replace(/\B(?=(\d{3})+(?!\d))/g, " ")
      : integer;
  return fraction === undefined ? grouped : `${grouped},${fraction}`;
}

function withKind(
  task: MentalMathTask,
  kind: MathKindId,
  skill: string,
  prompt?: string,
): MentalMathTask {
  return {
    ...task,
    ...(prompt === undefined ? {} : { prompt }),
    kind,
    skillId: `math:${kind}:${skill}`,
  };
}

function expression(
  left: number,
  operator: MentalMathExpression["operator"],
  right: number,
  result: number,
): MentalMathExpression {
  return { left, operator, right, result };
}

/** Zehnereinmaleins: 30 · 4, 4 · 300, 560 : 8, 2 700 : 9. */
function tensTask(random: Random, index: number): MentalMathTask {
  const unit = random() < 0.75 ? 10 : 100;
  const multiple = randomInteger(random, 2, 9) * unit;
  const other = randomInteger(random, 2, 9);
  if (random() < 0.5) {
    const [left, right] =
      random() < 0.5 ? [multiple, other] : [other, multiple];
    return withKind(
      buildMentalMathTask(
        expression(left, "*", right, multiple * other),
        index,
      ),
      "tens",
      "multiply",
    );
  }
  return withKind(
    buildMentalMathTask(
      expression(multiple * other, "/", other, multiple),
      index,
    ),
    "tens",
    "divide",
  );
}

/** Große Zahlen: 3 400 + 2 700, 12 000 − 4 500 (volle Hunderter, Fünfhunderter, Tausender). */
function bigTask(random: Random, index: number): MentalMathTask {
  const step = pick(random, [100, 100, 500, 1000]);
  const steps = (low: number, high: number) =>
    randomInteger(random, Math.ceil(low / step), Math.floor(high / step)) *
    step;
  if (random() < 0.5) {
    const left = steps(1000, 10000);
    const right = steps(1000, 10000);
    return bigPrompt(expression(left, "+", right, left + right), index, "add");
  }
  const left = steps(2000, 20000);
  const right = steps(1000, left - 1000);
  return bigPrompt(
    expression(left, "-", right, left - right),
    index,
    "subtract",
  );
}

function bigPrompt(parts: MentalMathExpression, index: number, skill: string) {
  return withKind(
    buildMentalMathTask(parts, index),
    "big",
    skill,
    `${groupedNumber(parts.left)} ${mathOperatorSymbol(parts.operator)} ${groupedNumber(parts.right)}`,
  );
}

const ROUND_PLACES = [
  { step: 10, name: "Zehner", low: 100, high: 999 },
  { step: 100, name: "Hunderter", low: 1000, high: 9999 },
  { step: 1000, name: "Tausender", low: 10000, high: 99999 },
] as const;

/** Auf die Stelle runden: ab 5 auf, sonst ab. */
export function roundToPlace(value: number, step: number) {
  return Math.floor(value / step + 0.5) * step;
}

/** Runden: „Runde 4 678 auf Hunderter“. Die Zahl liegt nie schon auf der Stelle. */
function roundTask(random: Random, index: number): MentalMathTask {
  const place = pick(random, ROUND_PLACES);
  let value = randomInteger(random, place.low, place.high);
  if (value % place.step === 0) value += 1 + randomInteger(random, 0, 8);
  return {
    id: `math-${index}-round-${value}-${place.step}`,
    prompt: `Runde ${groupedNumber(value)} auf ${place.name}`,
    source: `Runde ${value} auf ${place.name}`,
    answer: roundToPlace(value, place.step),
    operation: "mixed-expression",
    kind: "round",
    skillId: `math:round:${place.name.toLowerCase()}`,
  };
}

function euro(cents: number) {
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}

/** Komma und Geld: 2,50 € + 1,75 €, 0,5 + 0,25. Gerechnet wird in ganzen Hundertsteln. */
function decimalTask(random: Random, index: number): MentalMathTask {
  const money = random() < 0.5;
  const add = random() < 0.5;
  let left: number;
  let right: number;
  if (money) {
    // Beträge in 5-Cent-Schritten, höchstens 9,95 €.
    left = randomInteger(random, 1, 199) * 5;
    right = randomInteger(random, 1, 199) * 5;
  } else {
    // Zehntel oder Hundertstel; mindestens eine Zahl hat zwei Stellen.
    const tenth = () => randomInteger(random, 1, 49) * 10;
    const hundredth = () => {
      const value = randomInteger(random, 1, 99);
      return value % 10 === 0 ? value + 1 : value;
    };
    [left, right] =
      random() < 0.5 ? [tenth(), hundredth()] : [hundredth(), tenth()];
    if (random() < 0.2) [left, right] = [hundredth(), hundredth()];
  }
  if (!add && left <= right) [left, right] = [right + 5, left];
  const result = add ? left + right : left - right;
  const parts = expression(
    left / 100,
    add ? "+" : "-",
    right / 100,
    result / 100,
  );
  const symbol = mathOperatorSymbol(parts.operator);
  return withKind(
    buildMentalMathTask(parts, index),
    "decimal",
    money ? "money" : "plain",
    money
      ? `${euro(left)} ${symbol} ${euro(right)}`
      : `${displayMathNumber(parts.left)} ${symbol} ${displayMathNumber(parts.right)}`,
  );
}

type UnitConversion = {
  from: string;
  to: string;
  /** Mal (m → cm) oder geteilt (cm → m). */
  multiply: boolean;
  factor: number;
  values: readonly number[];
};

/** Alle Umrechnungen; die Werte sind so gewählt, dass die Antwort höchstens drei Nachkommastellen hat. */
const UNIT_CONVERSIONS: readonly UnitConversion[] = [
  {
    from: "m",
    to: "cm",
    multiply: true,
    factor: 100,
    values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 1.5, 2.5, 3.5],
  },
  {
    from: "cm",
    to: "m",
    multiply: false,
    factor: 100,
    values: [100, 200, 300, 400, 500, 600, 150, 250, 350, 450],
  },
  {
    from: "kg",
    to: "g",
    multiply: true,
    factor: 1000,
    values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 0.5, 1.5, 2.5],
  },
  {
    from: "g",
    to: "kg",
    multiply: false,
    factor: 1000,
    values: [1000, 2000, 3000, 4000, 5000, 500, 1500, 2500, 3500],
  },
  {
    from: "h",
    to: "min",
    multiply: true,
    factor: 60,
    values: [1, 2, 3, 4, 5, 6, 0.5, 1.5, 2.5],
  },
  {
    from: "min",
    to: "h",
    multiply: false,
    factor: 60,
    values: [60, 120, 180, 240, 300, 30, 90, 150, 210],
  },
];

/** Größen umrechnen: „3 m = _ cm“, „90 min = _ h“ (Antwort 1,5). */
function unitsTask(random: Random, index: number): MentalMathTask {
  const conversion = pick(random, UNIT_CONVERSIONS);
  const value = pick(random, conversion.values);
  const raw = conversion.multiply
    ? value * conversion.factor
    : value / conversion.factor;
  return {
    id: `math-${index}-units-${value}-${conversion.from}-${conversion.to}`,
    prompt: `${groupedNumber(value)} ${conversion.from} = _ ${conversion.to}`,
    source: `${displayMathNumber(value)} ${conversion.from} = _ ${conversion.to}`,
    answer: Math.round(raw * 1e6) / 1e6,
    operation: "mixed-expression",
    kind: "units",
    skillId: `math:units:${conversion.from}-${conversion.to}`,
  };
}

const KIND_GENERATORS: Record<
  MathKindId,
  (random: Random, index: number) => MentalMathTask
> = {
  tens: tensTask,
  big: bigTask,
  round: roundTask,
  decimal: decimalTask,
  units: unitsTask,
};

/**
 * Aufgaben der gewählten Arten. Die Arten wechseln der Reihe nach (mit zufälligem
 * Start), damit jede gewählte Art in der Runde vorkommt; die Runde mischt danach.
 * Gleiche Aufgaben in einer Runde werden vermieden, soweit es genug gibt.
 */
export function generateMathKindTasks(
  options: { kinds: readonly MathKindId[]; count: number },
  random: Random = Math.random,
): MentalMathTask[] {
  const kinds = MATH_KINDS.filter((kind) => options.kinds.includes(kind));
  if (!kinds.length) return [];
  const count = Math.max(1, Math.floor(options.count));
  const start = randomInteger(random, 0, kinds.length - 1);
  const seen = new Set<string>();
  return Array.from({ length: count }, (_, index) => {
    const generate = KIND_GENERATORS[kinds[(start + index) % kinds.length]!];
    let task = generate(random, index);
    for (let attempt = 0; attempt < 30 && seen.has(task.source); attempt += 1)
      task = generate(random, index);
    seen.add(task.source);
    return task;
  });
}

/** Wie `generateMentalMathTasks`, aber mit den gewählten Aufgabenarten. */
export function generateMathTasks(
  options: MathTasksOptions,
  random: Random = Math.random,
): MentalMathTask[] {
  return options.kinds?.length
    ? generateMathKindTasks(
        { kinds: options.kinds, count: options.count },
        random,
      )
    : generateMentalMathTasks(options, random);
}

/** Zerlegte Größenaufgabe aus dem Aufgabentext. */
export function parseUnitTask(task: Pick<MentalMathTask, "source">) {
  const match = task.source.match(/^(\S+)\s+(\S+)\s*=\s*_\s*(\S+)$/);
  if (!match) return null;
  const conversion = UNIT_CONVERSIONS.find(
    (entry) => entry.from === match[2] && entry.to === match[3],
  );
  return conversion
    ? { value: Number(match[1]!.replace(",", ".")), conversion }
    : null;
}

/** Zerlegte Rundenaufgabe („Runde 4678 auf Hunderter“). */
export function parseRoundTask(task: Pick<MentalMathTask, "source">) {
  const match = task.source.match(/^Runde (\d+) auf (\S+)$/);
  const place = ROUND_PLACES.find((entry) => entry.name === match?.[2]);
  return match && place ? { value: Number(match[1]), place } : null;
}

function trailingZeros(value: number) {
  let zeros = 0;
  let rest = Math.abs(value);
  while (rest >= 10 && rest % 10 === 0) {
    rest /= 10;
    zeros += 1;
  }
  return zeros;
}

/**
 * Lösungsweg der Arten, die einen eigenen Weg brauchen (Runden, Größen,
 * Zehnereinmaleins); sonst `null`. Er zeigt nie das Endergebnis.
 */
export function mathKindSolutionSteps(
  task: MentalMathTask,
  finish: (rest?: string) => string,
): string[] | null {
  if (task.kind === "round") {
    const parsed = parseRoundTask(task);
    if (!parsed) return null;
    const { value, place } = parsed;
    const digit = Math.floor((value % place.step) / (place.step / 10));
    return [
      `Du rundest auf ${place.name}. Schau auf die Ziffer rechts von dieser Stelle: ${digit}.`,
      "Bei 0 bis 4 rundest du ab, bei 5 bis 9 rundest du auf.",
      finish("Schreibe die gerundete Zahl auf"),
    ];
  }
  if (task.kind === "units") {
    const parsed = parseUnitTask(task);
    if (!parsed) return null;
    const { conversion, value } = parsed;
    const fact = conversion.multiply
      ? `1 ${conversion.from} = ${conversion.factor} ${conversion.to}`
      : `1 ${conversion.to} = ${conversion.factor} ${conversion.from}`;
    return [
      `${fact}.`,
      conversion.multiply
        ? `Du gehst zur kleineren Einheit, also gibt es mehr davon: mal ${conversion.factor}.`
        : `Du gehst zur größeren Einheit, also gibt es weniger davon: geteilt durch ${conversion.factor}.`,
      finish(
        `${displayMathNumber(value)} ${conversion.multiply ? "·" : ":"} ${conversion.factor}`,
      ),
    ];
  }
  if (task.kind === "tens") {
    const parts = parseMentalMathExpression(task.source);
    if (!parts) return null;
    if (parts.operator === "/") {
      const zeros = trailingZeros(parts.result);
      const word = zeros === 1 ? "die Null" : "die Nullen";
      return [
        `Lass ${word} weg: ${parts.left / 10 ** zeros} : ${parts.right} = ${parts.result / 10 ** zeros}.`,
        finish(`Setze ${word} wieder an`),
      ];
    }
    if (parts.operator === "*") {
      const [multiple, other] =
        trailingZeros(parts.left) >= trailingZeros(parts.right)
          ? [parts.left, parts.right]
          : [parts.right, parts.left];
      const zeros = trailingZeros(multiple);
      const word = zeros === 1 ? "die Null" : "die Nullen";
      return [
        `Rechne ohne ${word}: ${multiple / 10 ** zeros} · ${other} = ${(multiple / 10 ** zeros) * other}.`,
        finish(`Hänge ${word} wieder an`),
      ];
    }
  }
  return null;
}

/** Kurzer Tipp nach einem Fehler bei Aufgaben ohne Rechenzeichen-Term; sonst `null`. */
export function mathKindHint(task: MentalMathTask): string | null {
  if (task.kind === "round")
    return "Schau auf die Ziffer rechts von der Stelle, auf die du rundest: Ab 5 rundest du auf.";
  if (task.kind === "units") {
    const parsed = parseUnitTask(task);
    return parsed
      ? `Überlege zuerst: Wie viele ${parsed.conversion.to} sind 1 ${parsed.conversion.from}, oder umgekehrt?`
      : "Überlege zuerst, wie viele der kleinen Einheit in eine große passen.";
  }
  return null;
}
