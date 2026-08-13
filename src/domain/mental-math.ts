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
  gap?: MathGapSlot;
};

export type MentalMathOptions = {
  operations: readonly MentalMathOperation[];
  minValue?: number;
  maxValue: number;
  count: number;
  allowNegativeResults?: boolean;
  excludeZeroOperand?: boolean;
  excludeZeroResult?: boolean;
  multiplicationTables?: readonly number[];
  gapMode?: boolean;
  gapSlots?: readonly MathGapSlot[];
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
  const match = value
    .trim()
    .match(/^(-?\d+(?:[.,]\d+)?)\s*([+\-−*×·/:÷])\s*(-?\d+(?:[.,]\d+)?)$/);
  if (!match) return null;
  const left = Number.parseFloat(match[1]!.replace(",", "."));
  const right = Number.parseFloat(match[3]!.replace(",", "."));
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

function randomInteger(random: () => number, min: number, max: number) {
  const low = Math.min(min, max);
  const high = Math.max(min, max);
  return low + Math.floor(random() * (high - low + 1));
}

function generateOperands(
  operation: MentalMathOperation,
  options: Required<Omit<MentalMathOptions, "operations" | "gapSlots">>,
  random: () => number,
) {
  const tables = options.multiplicationTables.length
    ? options.multiplicationTables
    : MULTIPLICATION_TABLES;
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (operation === "multiply" || operation === "divide") {
      const table = tables[randomInteger(random, 0, tables.length - 1)] ?? 1;
      const factor = randomInteger(random, 0, 10);
      const left =
        operation === "multiply"
          ? random() < 0.5
            ? table
            : factor
          : table * factor;
      const right =
        operation === "multiply" ? (left === table ? factor : table) : table;
      const result = compute(left, operationToOperator[operation], right)!;
      if (Math.max(left, right, result) > options.maxValue) continue;
      if (options.excludeZeroOperand && (left === 0 || right === 0)) continue;
      if (options.excludeZeroResult && result === 0) continue;
      return { left, right, result };
    }
    const left = randomInteger(random, options.minValue, options.maxValue);
    const right = randomInteger(random, options.minValue, options.maxValue);
    const result = compute(left, operationToOperator[operation], right)!;
    const minimumResult = options.allowNegativeResults
      ? Math.min(options.minValue, -options.maxValue)
      : options.minValue;
    if (result < minimumResult || result > options.maxValue) continue;
    if (options.excludeZeroOperand && (left === 0 || right === 0)) continue;
    if (options.excludeZeroResult && result === 0) continue;
    return { left, right, result };
  }
  return {
    left: 1,
    right: operation === "subtract" ? 0 : 1,
    result: operation === "subtract" ? 1 : operation === "add" ? 2 : 1,
  };
}

export function buildMentalMathTask(
  expression: MentalMathExpression,
  index: number,
  gap?: MathGapSlot,
): MentalMathTask {
  const operation = operatorToOperation[expression.operator];
  const shownLeft = gap === "left" ? "_" : displayOperand(expression.left);
  const shownRight = gap === "right" ? "_" : displayOperand(expression.right);
  const shownResult =
    gap === "result" ? "_" : displayMathNumber(expression.result);
  const prompt = gap
    ? `${shownLeft} ${mathOperatorSymbol(expression.operator)} ${shownRight} = ${shownResult}`
    : `${displayOperand(expression.left)} ${mathOperatorSymbol(expression.operator)} ${displayOperand(expression.right)}`;
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
    const values = generateOperands(operation, normalized, random);
    const gap = normalized.gapMode
      ? (options.gapSlots?.[index] ??
        (["left", "right", "result"] as const)[randomInteger(random, 0, 2)])
      : undefined;
    return buildMentalMathTask(
      { ...values, operator: operationToOperator[operation] },
      index,
      gap,
    );
  });
}

export function checkMentalMathAnswer(
  task: { answer: number; [key: string]: unknown },
  value: string,
) {
  const normalized = value.trim().replace(",", ".");
  return (
    normalized !== "" &&
    Number.isFinite(Number(normalized)) &&
    Math.abs(Number(normalized) - task.answer) < 0.01
  );
}
