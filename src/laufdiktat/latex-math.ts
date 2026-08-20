import type { WordItem } from "./types.ts";

function uid(): string {
  return crypto.randomUUID();
}

function round(n: number): number {
  return Math.round(n * 1e9) / 1e9;
}

export interface LatexMathExpr {
  /** KaTeX source, e.g. "\\frac{1}{2} + \\frac{1}{3}". */
  latex: string;
  result: number;
}

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a || 1;
}

/** "1/2 + 1/3" -> \frac{1}{2} + \frac{1}{3}, exact fraction arithmetic (no floating point drift). */
export function parseFractionLine(line: string): LatexMathExpr | null {
  const m = line.trim().match(/^(-?\d+)\/(\d+)\s*([+\-*/])\s*(-?\d+)\/(\d+)$/);
  if (!m) return null;
  const [, aRaw, bRaw, opRaw, cRaw, dRaw] = m;
  const a = Number(aRaw);
  const b = Number(bRaw);
  const c = Number(cRaw);
  const d = Number(dRaw);
  if (b === 0 || d === 0) return null;

  let num: number;
  let den: number;
  switch (opRaw) {
    case "+":
      num = a * d + c * b;
      den = b * d;
      break;
    case "-":
      num = a * d - c * b;
      den = b * d;
      break;
    case "*":
      num = a * c;
      den = b * d;
      break;
    case "/":
      if (c === 0) return null;
      num = a * d;
      den = b * c;
      break;
    default:
      return null;
  }
  const g = gcd(num, den);
  num /= g;
  den /= g;
  if (den < 0) {
    num = -num;
    den = -den;
  }

  const opSymbol = opRaw === "*" ? "\\cdot" : opRaw === "/" ? ":" : opRaw;
  const latex = `\\frac{${aRaw}}{${bRaw}} ${opSymbol} \\frac{${cRaw}}{${dRaw}}`;
  return { latex, result: round(num / den) };
}

/** "sqrt(16)" or "wurzel(16)" -> \sqrt{16} */
export function parseRootLine(line: string): LatexMathExpr | null {
  const m = line.trim().match(/^(?:sqrt|wurzel)\((\d+(?:[.,]\d+)?)\)$/i);
  if (!m) return null;
  const n = Number(m[1].replace(",", "."));
  if (Number.isNaN(n) || n < 0) return null;
  return { latex: `\\sqrt{${m[1]}}`, result: round(Math.sqrt(n)) };
}

/** "3^2" -> 3^{2} */
export function parsePowerLine(line: string): LatexMathExpr | null {
  const m = line.trim().match(/^(-?\d+(?:[.,]\d+)?)\^(-?\d+)$/);
  if (!m) return null;
  const base = Number(m[1].replace(",", "."));
  const exp = Number(m[2]);
  if (Number.isNaN(base) || Number.isNaN(exp)) return null;
  return { latex: `${m[1]}^{${m[2]}}`, result: round(Math.pow(base, exp)) };
}

/** Parses one line of the teacher's shorthand ("1/2 + 1/3", "sqrt(16)", "3^2") into a LaTeX math WordItem. */
export function parseLatexMathLine(line: string): WordItem | null {
  const expr = parseFractionLine(line) ?? parseRootLine(line) ?? parsePowerLine(line);
  if (!expr) return null;
  return { id: uid(), kind: "math", promptFormat: "latex", prompt: expr.latex, targetWord: String(expr.result) };
}

export function parseLatexMathLines(lines: string[]): WordItem[] {
  return lines.map(parseLatexMathLine).filter((w): w is WordItem => w !== null);
}

export type LatexTaskKind = "fraction" | "root" | "power";

export interface LatexGenOptions {
  kinds: LatexTaskKind[];
  count: number;
}

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

const PERFECT_SQUARES = [1, 4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144];

function randomFractionExpr(): LatexMathExpr {
  const ops = ["+", "-", "*"] as const;
  const op = ops[randInt(0, ops.length - 1)];
  const b = randInt(2, 10);
  const d = randInt(2, 10);
  const a = randInt(1, b - 1);
  const c = randInt(1, d - 1);
  return parseFractionLine(`${a}/${b} ${op} ${c}/${d}`)!;
}

function randomRootExpr(): LatexMathExpr {
  const n = PERFECT_SQUARES[randInt(0, PERFECT_SQUARES.length - 1)];
  return parseRootLine(`sqrt(${n})`)!;
}

function randomPowerExpr(): LatexMathExpr {
  const base = randInt(2, 12);
  const exp = randInt(2, 3);
  return parsePowerLine(`${base}^${exp}`)!;
}

/** Generates random fraction/root/power tasks directly (not via a text round-trip — LaTeX doesn't survive that reliably). */
export function generateLatexMathWords(opts: LatexGenOptions): WordItem[] {
  const kinds = opts.kinds.length ? opts.kinds : (["fraction"] as LatexTaskKind[]);
  const words: WordItem[] = [];
  for (let i = 0; i < opts.count; i++) {
    const kind = kinds[randInt(0, kinds.length - 1)];
    const expr = kind === "fraction" ? randomFractionExpr() : kind === "root" ? randomRootExpr() : randomPowerExpr();
    words.push({ id: uid(), kind: "math", promptFormat: "latex", prompt: expr.latex, targetWord: String(expr.result) });
  }
  return words;
}
