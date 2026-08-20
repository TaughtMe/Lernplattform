import type { WordItem } from "./types.ts";

export type MathOp = "+" | "-" | "*" | "/";

function uid(): string {
  return crypto.randomUUID();
}

// Display: German school format (· for times, : for divided by, − for minus).
export function opSymbol(op: MathOp): string {
  return op === "+" ? "+" : op === "-" ? "−" : op === "*" ? "·" : ":";
}

// Rounds away floating point noise (e.g. 0.1 + 0.2 -> 0.30000000000000004).
function round(n: number): number {
  return Math.round(n * 1e9) / 1e9;
}

/** Displays a number in German format (comma instead of dot, no unnecessary decimals). */
export function displayNum(n: number): string {
  return round(n).toString().replace(".", ",");
}

/** Like displayNum, but wraps negative operands in parentheses: "(-5) + (-3)" instead of the confusing "-5 + -3". */
export function displayOperand(n: number): string {
  const s = displayNum(n);
  return s.startsWith("-") ? `(${s})` : s;
}

function format(a: number, op: MathOp, b: number): string {
  return `${displayNum(a)} ${opSymbol(op)} ${displayNum(b)}`;
}

function formatPrompt(a: number, op: MathOp, b: number): string {
  return `${displayOperand(a)} ${opSymbol(op)} ${displayOperand(b)}`;
}

function compute(a: number, op: MathOp, b: number): number | null {
  switch (op) {
    case "+": return round(a + b);
    case "-": return round(a - b);
    case "*": return round(a * b);
    case "/": return b !== 0 ? round(a / b) : null;
  }
}

export interface MathExpr {
  a: number;
  op: MathOp;
  b: number;
  result: number;
}

function parseNum(s: string): number {
  return parseFloat(s.replace(",", "."));
}

/** Safely parses a line like "4+4", "12 − 5", "6·7", "20:4" (no eval) into its parts. */
export function parseMathExpr(line: string): MathExpr | null {
  const m = line.trim().match(/^(-?\d+(?:[.,]\d+)?)\s*([+\-−*×·/:÷])\s*(-?\d+(?:[.,]\d+)?)$/);
  if (!m) return null;
  const a = parseNum(m[1]);
  const raw = m[2];
  const op: MathOp = raw === "+" ? "+" : raw === "-" || raw === "−" ? "-" : raw === "*" || raw === "×" || raw === "·" ? "*" : "/";
  const b = parseNum(m[3]);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  const result = compute(a, op, b);
  if (result === null) return null;
  return { a, op, b, result };
}

/** Task from a parsed expression (show the task, result is the answer). */
export function normalMathWord(e: MathExpr): WordItem {
  return { id: uid(), kind: "math", prompt: formatPrompt(e.a, e.op, e.b), targetWord: String(e.result) };
}

export function parseMathLine(line: string): WordItem | null {
  const e = parseMathExpr(line);
  return e ? normalMathWord(e) : null;
}

export const MULTIPLICATION_TABLES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export interface GenOptions {
  ops: MathOp[];
  minValue: number;
  maxValue: number;
  count: number;
  allowNegativeResults: boolean;
  excludeZeroOperand: boolean;
  excludeZeroResult: boolean;
  /** Times-table rows for ·/ : , e.g. [2, 5, 10]. Empty = all rows 1-10. */
  multiplicationTables: number[];
}

function randInt(min: number, max: number): number {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

const MAX_ATTEMPTS = 200;

function genAddSub(op: "+" | "-", opts: GenOptions): { a: number; b: number } | null {
  const resultFloor = opts.allowNegativeResults ? Math.min(opts.minValue, -opts.maxValue) : opts.minValue;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const a = randInt(opts.minValue, opts.maxValue);
    const b = randInt(opts.minValue, opts.maxValue);
    if (opts.excludeZeroOperand && (a === 0 || b === 0)) continue;
    const result = op === "+" ? a + b : a - b;
    if (result < resultFloor || result > opts.maxValue) continue;
    if (opts.excludeZeroResult && result === 0) continue;
    return { a, b };
  }
  return null;
}

function genMul(opts: GenOptions): { a: number; b: number } | null {
  const tables = opts.multiplicationTables.length ? opts.multiplicationTables : [...MULTIPLICATION_TABLES];
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const table = tables[Math.floor(Math.random() * tables.length)];
    const factor = randInt(0, 10);
    if (opts.excludeZeroOperand && (table === 0 || factor === 0)) continue;
    const result = table * factor;
    if (Math.max(table, factor, result) > opts.maxValue) continue;
    if (opts.excludeZeroResult && result === 0) continue;
    return Math.random() < 0.5 ? { a: table, b: factor } : { a: factor, b: table };
  }
  return null;
}

function genDiv(opts: GenOptions): { a: number; b: number } | null {
  const tables = opts.multiplicationTables.length ? opts.multiplicationTables : [...MULTIPLICATION_TABLES];
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const divisor = tables[Math.floor(Math.random() * tables.length)];
    if (divisor === 0) continue;
    const quotient = randInt(0, 10);
    if (opts.excludeZeroOperand && quotient === 0) continue;
    if (opts.excludeZeroResult && quotient === 0) continue;
    const dividend = divisor * quotient;
    if (Math.max(dividend, divisor, quotient) > opts.maxValue) continue;
    return { a: dividend, b: divisor };
  }
  return null;
}

/**
 * Generates random task lines (as text) which are then parsed normally.
 * "maxValue" bounds every number that appears in a task, including the
 * result, across all operations. "minValue" only affects +/- (multiply/
 * divide are naturally non-negative and start at 0).
 */
export function generateMathLines(opts: GenOptions): string[] {
  const ops = opts.ops.length ? opts.ops : (["+"] as MathOp[]);
  const lines: string[] = [];

  for (let i = 0; i < opts.count; i++) {
    const op = ops[Math.floor(Math.random() * ops.length)];
    const pair = op === "+" || op === "-" ? genAddSub(op, opts) : op === "*" ? genMul(opts) : genDiv(opts);

    if (pair) {
      lines.push(format(pair.a, op, pair.b));
    } else {
      const safe = Math.max(opts.minValue, 1);
      lines.push(op === "/" ? "1 : 1" : op === "*" ? "1 · 1" : format(safe, op, op === "-" ? 0 : safe));
    }
  }
  return lines;
}
