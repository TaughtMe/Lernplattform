export type MentalMathOperation = "add" | "subtract" | "multiply" | "divide";
export type MathOperator = "+" | "-" | "*" | "/";
export type MathGapSlot = "left" | "right" | "result";

export type MentalMathExpression = {
  left: number;
  operator: MathOperator;
  right: number;
  result: number;
};

export type MentalMathTask = {
  id: string;
  prompt: string;
  source: string;
  answer: number;
  skillId: string;
  operation: MentalMathOperation | "mixed-expression";
  gap?: MathGapSlot | undefined;
};

export type MentalMathOptions = {
  operations: readonly MentalMathOperation[];
  minValue?: number | undefined;
  maxValue: number;
  count: number;
  allowNegativeResults?: boolean | undefined;
  excludeZeroOperand?: boolean | undefined;
  excludeZeroResult?: boolean | undefined;
  multiplicationTables?: readonly number[] | undefined;
  gapMode?: boolean | undefined;
  gapSlots?: readonly MathGapSlot[] | undefined;
};

export const MULTIPLICATION_TABLES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

const operationToOperator: Record<MentalMathOperation, MathOperator> = {
  add: "+",
  subtract: "-",
  multiply: "*",
  divide: "/",
};
const operatorToOperation: Record<MathOperator, MentalMathOperation> = {
  "+": "add",
  "-": "subtract",
  "*": "multiply",
  "/": "divide",
};

export function mathOperatorSymbol(operator: MathOperator) {
  return operator === "*"
    ? "·"
    : operator === "/"
      ? ":"
      : operator === "-"
        ? "−"
        : "+";
}

function round(value: number) {
  return Math.round(value * 1e9) / 1e9;
}

export function displayMathNumber(value: number) {
  return String(round(value)).replace(".", ",");
}

function displayOperand(value: number) {
  const displayed = displayMathNumber(value);
  return value < 0 ? `(${displayed})` : displayed;
}

function compute(left: number, operator: MathOperator, right: number) {
  if (operator === "+") return round(left + right);
  if (operator === "-") return round(left - right);
  if (operator === "*") return round(left * right);
  return right === 0 ? null : round(left / right);
}

export function parseMentalMathExpression(
  value: string,
): MentalMathExpression | null {
  // Zahlen dürfen in Klammern stehen, z. B. „-1 − (-4)“.
  const operand = String.raw`\(\s*-?\d+(?:[.,]\d+)?\s*\)|-?\d+(?:[.,]\d+)?`;
  const match = value
    .trim()
    .match(
      new RegExp(String.raw`^(${operand})\s*([+\-−*×·/:÷])\s*(${operand})$`),
    );
  if (!match) return null;
  const number = (text: string) =>
    Number.parseFloat(text.replace(/[()\s]/g, "").replace(",", "."));
  const left = number(match[1]!);
  const right = number(match[3]!);
  const raw = match[2]!;
  const operator: MathOperator =
    raw === "+"
      ? "+"
      : raw === "-" || raw === "−"
        ? "-"
        : raw === "*" || raw === "×" || raw === "·"
          ? "*"
          : "/";
  const result = compute(left, operator, right);
  return result === null ? null : { left, operator, right, result };
}

type Token =
  | { type: "number"; value: number }
  | { type: "operator"; value: MathOperator | "^" }
  | {
      type:
        | "left-paren"
        | "right-paren"
        | "left-brace"
        | "right-brace"
        | "left-bracket"
        | "right-bracket";
    }
  | { type: "fraction" | "root" };

function tokenizeExpression(input: string): Token[] | null {
  const tokens: Token[] = [];
  for (let index = 0; index < input.length;) {
    const character = input[index]!;
    if (/\s/.test(character)) {
      index += 1;
      continue;
    }
    if (character === "\\") {
      if (input.startsWith("\\frac", index)) {
        tokens.push({ type: "fraction" });
        index += 5;
        continue;
      }
      if (input.startsWith("\\sqrt", index)) {
        tokens.push({ type: "root" });
        index += 5;
        continue;
      }
      return null;
    }
    const simple: Record<string, Token> = {
      "(": { type: "left-paren" },
      ")": { type: "right-paren" },
      "{": { type: "left-brace" },
      "}": { type: "right-brace" },
      "[": { type: "left-bracket" },
      "]": { type: "right-bracket" },
      "^": { type: "operator", value: "^" },
      "+": { type: "operator", value: "+" },
      "-": { type: "operator", value: "-" },
      "−": { type: "operator", value: "-" },
      "*": { type: "operator", value: "*" },
      "×": { type: "operator", value: "*" },
      "·": { type: "operator", value: "*" },
      "/": { type: "operator", value: "/" },
      ":": { type: "operator", value: "/" },
      "÷": { type: "operator", value: "/" },
    };
    if (simple[character]) {
      tokens.push(simple[character]);
      index += 1;
      continue;
    }
    if (/\d/.test(character)) {
      let end = index + 1;
      while (end < input.length && /\d/.test(input[end]!)) end += 1;
      if (input[end] === "." || input[end] === ",") {
        end += 1;
        while (end < input.length && /\d/.test(input[end]!)) end += 1;
      }
      tokens.push({
        type: "number",
        value: Number.parseFloat(input.slice(index, end).replace(",", ".")),
      });
      index = end;
      continue;
    }
    return null;
  }
  return tokens;
}

class SafeMathParser {
  private position = 0;
  constructor(private readonly tokens: Token[]) {}
  private peek() {
    return this.tokens[this.position];
  }
  private next() {
    return this.tokens[this.position++];
  }
  private expect(type: Token["type"]) {
    return this.next()?.type === type;
  }
  atEnd() {
    return this.position === this.tokens.length;
  }
  parseExpression(): number | null {
    let value = this.parseTerm();
    if (value === null) return null;
    while (
      this.peek()?.type === "operator" &&
      (this.peek() as { value?: string }).value &&
      ["+", "-"].includes((this.peek() as { value: string }).value)
    ) {
      const operator = (this.next() as { value: "+" | "-" }).value;
      const right = this.parseTerm();
      if (right === null) return null;
      value = operator === "+" ? value + right : value - right;
    }
    return value;
  }
  private parseTerm(): number | null {
    let value = this.parseUnary();
    if (value === null) return null;
    while (
      this.peek()?.type === "operator" &&
      ["*", "/"].includes((this.peek() as { value: string }).value)
    ) {
      const operator = (this.next() as { value: "*" | "/" }).value;
      const right = this.parseUnary();
      if (right === null || (operator === "/" && right === 0)) return null;
      value = operator === "*" ? value * right : value / right;
    }
    return value;
  }
  private parseUnary(): number | null {
    if (
      this.peek()?.type === "operator" &&
      (this.peek() as { value: string }).value === "-"
    ) {
      this.next();
      const value = this.parseUnary();
      return value === null ? null : -value;
    }
    return this.parsePower();
  }
  private parsePower(): number | null {
    const base = this.parseAtom();
    if (base === null) return null;
    if (
      this.peek()?.type === "operator" &&
      (this.peek() as { value: string }).value === "^"
    ) {
      this.next();
      const exponent = this.parseUnary();
      return exponent === null ? null : Math.pow(base, exponent);
    }
    return base;
  }
  private parseAtom(): number | null {
    const token = this.next();
    if (!token) return null;
    if (token.type === "number") return token.value;
    if (token.type === "left-paren" || token.type === "left-brace") {
      const value = this.parseExpression();
      const closing =
        token.type === "left-paren" ? "right-paren" : "right-brace";
      return value === null || !this.expect(closing) ? null : value;
    }
    if (token.type === "fraction") {
      if (!this.expect("left-brace")) return null;
      const numerator = this.parseExpression();
      if (
        numerator === null ||
        !this.expect("right-brace") ||
        !this.expect("left-brace")
      )
        return null;
      const denominator = this.parseExpression();
      return denominator === null ||
        denominator === 0 ||
        !this.expect("right-brace")
        ? null
        : numerator / denominator;
    }
    if (token.type === "root") {
      let degree = 2;
      if (this.peek()?.type === "left-bracket") {
        this.next();
        const parsedDegree = this.parseExpression();
        if (parsedDegree === null || !this.expect("right-bracket")) return null;
        degree = parsedDegree;
      }
      if (!this.expect("left-brace")) return null;
      const radicand = this.parseExpression();
      if (
        radicand === null ||
        !this.expect("right-brace") ||
        degree === 0 ||
        (radicand < 0 && degree % 2 === 0)
      )
        return null;
      return radicand < 0
        ? -Math.pow(-radicand, 1 / degree)
        : Math.pow(radicand, 1 / degree);
    }
    return null;
  }
}

export function evaluateMentalMathExpression(input: string) {
  const tokens = tokenizeExpression(input.trim());
  if (!tokens?.length) return null;
  const parser = new SafeMathParser(tokens);
  const value = parser.parseExpression();
  return value === null || !Number.isFinite(value) || !parser.atEnd()
    ? null
    : round(value);
}

export type MathChainToken =
  { kind: "number"; value: number } | { kind: "symbol"; text: string };

/**
 * Tokenizes a manually typed arithmetic chain (numbers, + - * /, parens)
 * into a flat, position-ordered list — used to re-space input and to pick
 * which numeral in a chain becomes a gap. Returns null for anything that
 * needs real math typesetting instead (\frac, \sqrt, ^, braces), which is
 * left exactly as typed and rendered via KaTeX rather than reformatted —
 * a caret exponent read back as plain text ("2^3") isn't a real superscript.
 */
export function tokenizeMathChain(input: string): MathChainToken[] | null {
  const tokens = tokenizeExpression(input.trim());
  if (!tokens?.length) return null;
  const chain: MathChainToken[] = [];
  // Ein Vorzeichen steht am Anfang, nach einem Rechenzeichen oder nach „(“:
  // „-1 − -4“ enthält die Zahlen -1 und -4, nicht vier Rechenzeichen.
  let expectOperand = true;
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    if (token.type === "number") {
      chain.push({ kind: "number", value: token.value });
      expectOperand = false;
    } else if (token.type === "operator" && token.value !== "^") {
      const next = tokens[index + 1];
      if (expectOperand) {
        if (
          (token.value !== "-" && token.value !== "+") ||
          next?.type !== "number"
        )
          return null;
        chain.push({
          kind: "number",
          value: token.value === "-" ? -next.value : next.value,
        });
        index += 1;
        expectOperand = false;
        continue;
      }
      chain.push({ kind: "symbol", text: mathOperatorSymbol(token.value) });
      expectOperand = true;
    } else if (token.type === "left-paren") {
      chain.push({ kind: "symbol", text: "(" });
      expectOperand = true;
    } else if (token.type === "right-paren") {
      chain.push({ kind: "symbol", text: ")" });
      expectOperand = false;
    } else {
      return null;
    }
  }
  return chain;
}

/**
 * Re-serializes chain tokens into a canonically spaced string, e.g.
 * "6+4-2" -> "6 + 4 - 2". Pass `gapIndex` (0-based, counting only number
 * tokens) to blank that numeral as "_" instead of printing its value —
 * used to build a gap task's visible prompt. Negative numbers after an
 * operator are bracketed ("-1 − (-4)"); at the start or directly after "("
 * they stay bare.
 */
export function formatMathChainTokens(
  tokens: MathChainToken[],
  gapIndex?: number,
) {
  let out = "";
  let numberOrdinal = 0;
  let spaceBeforeNext = false;
  tokens.forEach((token, index) => {
    let text: string;
    let spaceBefore = spaceBeforeNext;
    let spaceAfter = true;
    if (token.kind === "number") {
      const previous = tokens[index - 1];
      const bare =
        index === 0 || (previous?.kind === "symbol" && previous.text === "(");
      text =
        numberOrdinal === gapIndex
          ? "_"
          : token.value < 0 && !bare
            ? `(${displayMathNumber(token.value)})`
            : displayMathNumber(token.value);
      numberOrdinal += 1;
    } else if (token.text === "(") {
      text = "(";
      spaceAfter = false;
    } else if (token.text === ")") {
      text = ")";
      spaceBefore = false;
    } else {
      text = token.text;
    }
    out += (spaceBefore ? " " : "") + text;
    spaceBeforeNext = spaceAfter;
  });
  return out;
}

/** Counts the gappable numerals in a chain (its number tokens). */
export function countMathChainNumbers(tokens: MathChainToken[]) {
  return tokens.filter((token) => token.kind === "number").length;
}

/**
 * Re-spaces a manually typed arithmetic chain into canonical form (e.g.
 * "6+4-2" -> "6 + 4 - 2"), or returns null when the input isn't a plain
 * chain (LaTeX-style \frac/\sqrt input is left exactly as typed).
 */
export function normalizeMathChainInput(input: string) {
  const tokens = tokenizeMathChain(input);
  return tokens ? formatMathChainTokens(tokens) : null;
}

/**
 * True when a manually typed line uses LaTeX-only syntax (\frac, \sqrt, ^,
 * braces) that benefits from KaTeX rendering — i.e. it evaluates but isn't a
 * plain arithmetic chain. A long plain chain like "6 + 4 - 2" is still just
 * text; only fractions/roots/powers actually need real math typesetting.
 */
export function isLatexMathSyntax(input: string) {
  return (
    tokenizeMathChain(input) === null &&
    evaluateMentalMathExpression(input) !== null
  );
}

type MentalMathExpressionValues = Pick<
  MentalMathExpression,
  "left" | "right" | "result"
>;

function randomInteger(random: () => number, min: number, max: number) {
  const low = Math.min(min, max);
  const high = Math.max(min, max);
  return low + Math.floor(random() * (high - low + 1));
}

function generateOperands(
  operation: MentalMathOperation,
  options: {
    [K in keyof Omit<MentalMathOptions, "operations" | "gapSlots">]-?: Exclude<
      MentalMathOptions[K],
      undefined
    >;
  },
  random: () => number,
  /** Zusätzliche Bedingung an die Operanden, z. B. eine eindeutige Lücke. */
  accept: (values: MentalMathExpressionValues) => boolean = () => true,
) {
  const tables = options.multiplicationTables.length
    ? options.multiplicationTables
    : MULTIPLICATION_TABLES;
  const minimumResult = options.allowNegativeResults
    ? Math.min(options.minValue, -options.maxValue)
    : Math.max(0, options.minValue);
  function candidate(left: number, right: number) {
    const result = compute(left, operationToOperator[operation], right);
    if (
      result === null ||
      left < options.minValue ||
      right < options.minValue ||
      left > options.maxValue ||
      right > options.maxValue ||
      result < minimumResult ||
      result > options.maxValue ||
      (options.excludeZeroOperand && (left === 0 || right === 0)) ||
      (options.excludeZeroResult && result === 0)
    )
      return null;
    const values = { left, right, result };
    return accept(values) ? values : null;
  }
  for (let attempt = 0; attempt < 200; attempt += 1) {
    let left: number;
    let right: number;
    if (operation === "multiply" || operation === "divide") {
      const table = tables[randomInteger(random, 0, tables.length - 1)]!;
      const factor = randomInteger(random, 0, 10);
      left = operation === "divide" ? table * factor : table;
      right = operation === "divide" ? table : factor;
      if (operation === "multiply" && random() < 0.5)
        [left, right] = [right, left];
    } else {
      left = randomInteger(random, options.minValue, options.maxValue);
      right = randomInteger(random, options.minValue, options.maxValue);
    }
    const valid = candidate(left, right);
    if (valid) return valid;
  }
  // Bounded fallback also honors narrow ranges, selected rows and zero rules.
  if (operation === "multiply" || operation === "divide") {
    for (const table of tables)
      for (let factor = 0; factor <= 10; factor += 1) {
        const valid =
          operation === "multiply"
            ? candidate(table, factor)
            : candidate(table * factor, table);
        if (valid) return valid;
      }
  } else {
    const values = [
      options.minValue,
      options.maxValue,
      0,
      1,
      -1,
      options.minValue + 1,
      options.maxValue - 1,
    ];
    for (const left of values)
      for (const right of values) {
        const valid = candidate(left, right);
        if (valid) return valid;
      }
  }
  throw new Error(
    "Für diese Einstellungen gibt es keine passenden Aufgaben. Ändere den Zahlenraum oder die Regeln.",
  );
}

export function buildMentalMathTask(
  expression: MentalMathExpression,
  index: number,
  gap?: MathGapSlot,
): MentalMathTask {
  const operation = operatorToOperation[expression.operator];
  // Die erste Zahl steht ohne Klammern, negative zweite Zahlen mit: „-1 − (-4)“.
  const shownLeft = gap === "left" ? "_" : displayMathNumber(expression.left);
  const shownRight = gap === "right" ? "_" : displayOperand(expression.right);
  const shownResult =
    gap === "result" ? "_" : displayMathNumber(expression.result);
  const prompt = gap
    ? `${shownLeft} ${mathOperatorSymbol(expression.operator)} ${shownRight} = ${shownResult}`
    : `${displayMathNumber(expression.left)} ${mathOperatorSymbol(expression.operator)} ${displayOperand(expression.right)}`;
  const answer =
    gap === "left"
      ? expression.left
      : gap === "right"
        ? expression.right
        : expression.result;
  return {
    id: `math-${index}-${operation}-${expression.left}-${expression.right}-${gap ?? "normal"}`,
    prompt,
    source: `${displayMathNumber(expression.left)} ${mathOperatorSymbol(expression.operator)} ${displayMathNumber(expression.right)}`,
    answer,
    operation,
    ...(gap ? { gap } : {}),
    skillId: `math:${operation}:range`,
  };
}

export function parseMentalMathTask(
  source: string,
  index = 0,
  gap?: MathGapSlot,
): MentalMathTask | null {
  const equation = source.match(/^(.*?)\s*=\s*(-?\d+(?:[.,]\d+)?)\s*$/);
  if (equation) {
    const expression = parseMentalMathExpression(equation[1] ?? "");
    const expected = Number.parseFloat((equation[2] ?? "").replace(",", "."));
    if (!expression || Math.abs(expression.result - expected) > 1e-9)
      return null;
    return buildMentalMathTask(expression, index, gap);
  }
  const simple = parseMentalMathExpression(source);
  if (simple) return buildMentalMathTask(simple, index, gap);
  const answer = evaluateMentalMathExpression(source);
  return answer === null
    ? null
    : {
        id: `math-${index}-expression`,
        prompt: source.trim(),
        source: source.trim(),
        answer,
        operation: "mixed-expression",
        skillId: "math:mixed-expression",
      };
}

const GAP_SLOTS: readonly MathGapSlot[] = ["left", "right", "result"];

/**
 * Ist der Wert der Lücke durch die Gleichung eindeutig bestimmt? Mehrdeutig
 * sind nur Lücken, die eine Null „verschluckt“: `0 · _ = 0` und `_ · 0 = 0`
 * (jede Zahl passt) sowie `0 : _ = 0` (jede Zahl außer 0 passt). Alle anderen
 * Lücken (auch `_ : 5 = 0`, nur 0 passt) haben genau eine Lösung. Solche
 * Lücken werden gar nicht erst erzeugt, statt später jede passende Zahl
 * zu akzeptieren (Audit G-009, Red Team 6.13).
 */
export function isGapUnique(
  operator: MathOperator,
  values: Pick<MentalMathExpression, "left" | "right">,
  gap: MathGapSlot,
) {
  if (operator === "*")
    return gap === "left"
      ? values.right !== 0
      : gap === "right"
        ? values.left !== 0
        : true;
  if (operator === "/") return gap === "right" ? values.left !== 0 : true;
  return true;
}

/**
 * Mischt Aufgaben (Fisher-Yates) mit dem übergebenen Zufall und lässt die
 * Eingabe unverändert. Mit festem Zufall ist die Reihenfolge reproduzierbar.
 */
export function shuffleMathTasks<T>(
  tasks: readonly T[],
  random: () => number = Math.random,
): T[] {
  const shuffled = [...tasks];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const other = randomInteger(random, 0, index);
    [shuffled[index], shuffled[other]] = [shuffled[other]!, shuffled[index]!];
  }
  return shuffled;
}

export function generateMentalMathTasks(
  options: MentalMathOptions,
  random: () => number = Math.random,
): MentalMathTask[] {
  const operations: readonly MentalMathOperation[] = options.operations.length
    ? options.operations
    : ["add"];
  const normalized = {
    minValue: Math.floor(options.minValue ?? 0),
    maxValue: Math.max(1, Math.floor(options.maxValue)),
    count: Math.max(1, Math.floor(options.count)),
    allowNegativeResults: options.allowNegativeResults ?? false,
    excludeZeroOperand: options.excludeZeroOperand ?? false,
    excludeZeroResult: options.excludeZeroResult ?? false,
    multiplicationTables: [...(options.multiplicationTables ?? [])],
    gapMode: options.gapMode ?? false,
  };
  return Array.from({ length: normalized.count }, (_, index) => {
    const operation =
      operations[randomInteger(random, 0, operations.length - 1)] ?? "add";
    const operator = operationToOperator[operation];
    const forced = normalized.gapMode ? options.gapSlots?.[index] : undefined;
    // Eine vorgegebene Lückenposition bleibt; dann ziehen wir die Operanden neu,
    // bis die Lücke eindeutig ist. Sonst weichen wir auf die nächste Position aus.
    const values = generateOperands(
      operation,
      normalized,
      random,
      forced
        ? (candidate) => isGapUnique(operator, candidate, forced)
        : undefined,
    );
    let gap: MathGapSlot | undefined = forced;
    if (normalized.gapMode && !forced) {
      const start = randomInteger(random, 0, GAP_SLOTS.length - 1);
      // „result“ ist immer eindeutig, die Suche endet also spätestens dort.
      gap = [...GAP_SLOTS.slice(start), ...GAP_SLOTS.slice(0, start)].find(
        (slot) => isGapUnique(operator, values, slot),
      );
    }
    return buildMentalMathTask({ ...values, operator }, index, gap);
  });
}

/**
 * Zerlegt eine Eingabe streng in Vorzeichen, ganze Stellen und Nachkommastellen
 * und liefert die kanonische Dezimalschreibweise („-1000.5“) oder `null`.
 *
 * Erlaubt sind:
 * - Vorzeichen `-`, `−` (U+2212) oder `–` (U+2013), davor/danach Leerraum;
 * - Tausendertrenner „.“ oder Leerzeichen (auch geschützt) **nur in gültigen
 *   Dreiergruppen** („1.000“, „12 345 678“), die erste Gruppe hat 1 bis 3
 *   Ziffern und beginnt nicht mit 0;
 * - Dezimaltrenner „,“; „.“ nur, wenn es nicht als Tausenderpunkt lesbar ist.
 *
 * Entscheidung zur Mehrdeutigkeit: Ein „.“ mit **genau drei** Ziffern danach
 * ist im Deutschen ein Tausenderpunkt („1.000“ = 1000, „2.500“ = 2500), auch
 * wenn es ein englisches Dezimalzeichen sein könnte. Mit anderen Ziffernzahlen
 * („2.5“, „0.75“, „1234.567“) ist es ein Dezimalpunkt. Mit Tausenderpunkt
 * ist nur „,“ als Dezimaltrenner erlaubt („1.000,5“). Das Komma ist immer
 * Dezimaltrenner („1,000“ = 1). Alles andere („1e1“, „0x10“, „1.00.0“,
 * „1,5,5“, „,5“, „5,“) ist ungültig.
 */
function parseDecimalAnswer(input: string) {
  const value = input.trim();
  const sign = String.raw`([-\u2212\u2013]?)\s*`;
  const match =
    value.match(
      new RegExp(String.raw`^${sign}([1-9]\d{0,2}(?:\.\d{3})+)(?:,(\d+))?$`),
    ) ??
    value.match(
      new RegExp(
        String.raw`^${sign}([1-9]\d{0,2}(?:[ \u00a0\u202f]\d{3})+)(?:[,.](\d+))?$`,
      ),
    ) ??
    value.match(new RegExp(String.raw`^${sign}(\d+)(?:[,.](\d+))?$`));
  if (!match) return null;
  return {
    negative: match[1] !== "",
    integer: (match[2] ?? "").replace(/[. \u00a0\u202f]/g, ""),
    fraction: match[3] ?? "",
  };
}

/** Kanonische Schreibweise ohne führende/nachfolgende Nullen, „-0“ gibt es nicht. */
function canonicalDecimal(
  negative: boolean,
  integer: string,
  fraction: string,
) {
  const whole = integer.replace(/^0+(?=\d)/, "");
  const decimals = fraction.replace(/0+$/, "");
  const zero = whole === "0" && decimals === "";
  return `${negative && !zero ? "-" : ""}${whole}${decimals ? `.${decimals}` : ""}`;
}

/** Höchstzahl der Nachkommastellen, auf die eine Lösung gerundet wird. */
const MATH_ANSWER_DECIMALS = 6;

/**
 * Die Lösung auf ihre Nachkommastellen (höchstens 6) gerundet, kanonisch
 * geschrieben. Ein Text statt einer Zahl vermeidet jedes Epsilon: Gleichheit
 * ist Textgleichheit.
 */
function canonicalSolution(solution: number) {
  if (!Number.isFinite(solution) || Math.abs(solution) >= 1e15) return null;
  // `toFixed` schreibt immer „123.456000“: Das ist kein Eingabeformat, daher
  // wird hier direkt zerlegt und nicht `parseDecimalAnswer` benutzt.
  const [integer = "0", fraction = ""] = Math.abs(solution)
    .toFixed(MATH_ANSWER_DECIMALS)
    .split(".");
  return canonicalDecimal(solution < 0, integer, fraction);
}

/**
 * Liest eine Antwort als Zahl oder liefert `null`, wenn sie keine eindeutig
 * lesbare Zahl ist (Regeln siehe `parseDecimalAnswer`). Keine Toleranz,
 * kein `Number()`.
 */
export function parseMathAnswer(input: string): number | null {
  const parsed = parseDecimalAnswer(input);
  return parsed
    ? Number(canonicalDecimal(parsed.negative, parsed.integer, parsed.fraction))
    : null;
}

/**
 * Exakter Vergleich: Die Lösung wird auf ihre Nachkommastellen (höchstens 6)
 * gerundet und mit der Eingabe als Dezimalzahl verglichen. Eine Eingabe mit
 * mehr Nachkommastellen als die Lösung (außer Nullen am Ende) ist falsch.
 */
export function mathAnswerMatches(solution: number, input: string) {
  const parsed = parseDecimalAnswer(input);
  const expected = canonicalSolution(solution);
  if (parsed === null || expected === null) return false;
  const given = canonicalDecimal(
    parsed.negative,
    parsed.integer,
    parsed.fraction,
  );
  if (given === expected) return true;
  // Nicht abbrechende Lösung (1 : 3): Jede richtig gerundete Eingabe mit
  // mindestens zwei Nachkommastellen zählt („0,33“, „0,333“, nicht „0,34“).
  const terminates = Math.abs(Number(expected) - solution) < 1e-12;
  const places = parsed.fraction.length;
  if (terminates || places < 2 || places > MATH_ANSWER_DECIMALS) return false;
  const [integer = "0", fraction = ""] = Math.abs(solution)
    .toFixed(places)
    .split(".");
  return given === canonicalDecimal(solution < 0, integer, fraction);
}

/** Gleichheit zweier Zahlen in der Genauigkeit der Antwortprüfung (6 Stellen). */
export function mathNumbersEqual(left: number, right: number) {
  const expected = canonicalSolution(left);
  return expected !== null && expected === canonicalSolution(right);
}

export function checkMentalMathAnswer(
  task: { answer: number; [key: string]: unknown },
  value: string,
) {
  return mathAnswerMatches(task.answer, value);
}

/** Zerlegt den Aufgabentext der Lehrkraft in getrimmte, nicht leere Zeilen. */
export function splitMathLines(source: string) {
  return source
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * Die Lücke einer Rechenzeile ist ein einzelner Zahlenindex: 0..N-1 verdeckt
 * die jeweilige Zahl im Term (nur Zahlen gezählt, von links nach rechts), N
 * (eins hinter der letzten) verdeckt stattdessen das Ergebnis. Das gilt
 * gleich für eine einfache Aufgabe mit zwei Zahlen und für eine Kette.
 * Vorgabe: die letzte Zahl des Terms.
 */
export function defaultMathGapIndex(numberCount: number) {
  return Math.max(0, numberCount - 1);
}

/**
 * Fügt `token` an der Auswahl [start, end) des Entwurfs ein und liefert den
 * neuen Text samt Cursorposition (`start` + `cursorOffset`).
 */
export function insertAtSelection(
  draft: string,
  token: string,
  start: number,
  end: number,
  cursorOffset: number,
) {
  return {
    text: draft.slice(0, start) + token + draft.slice(end),
    cursor: start + cursorOffset,
  };
}
