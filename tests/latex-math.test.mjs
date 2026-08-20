import assert from "node:assert/strict";
import test from "node:test";
import {
  parseFractionLine,
  parseRootLine,
  parsePowerLine,
  parseLatexMathLine,
  parseLatexMathLines,
  generateLatexMathWords,
} from "../src/laufdiktat/latex-math.ts";

test("parseFractionLine: adds fractions exactly, no floating point drift", () => {
  const e = parseFractionLine("1/2 + 1/3");
  assert.equal(e.latex, "\\frac{1}{2} + \\frac{1}{3}");
  assert.ok(Math.abs(e.result - 5 / 6) < 1e-8, `expected ~0.8333, got ${e.result}`);
});

test("parseFractionLine: reduces before dividing, so results a decimal tolerance check accepts", () => {
  const e = parseFractionLine("2/4 - 1/4");
  assert.equal(e.result, 0.25);
});

test("parseFractionLine: rejects malformed input", () => {
  assert.equal(parseFractionLine("1/0 + 1/2"), null);
  assert.equal(parseFractionLine("not a fraction"), null);
});

test("parseRootLine: builds \\sqrt{} and computes the exact root for a perfect square", () => {
  const e = parseRootLine("sqrt(16)");
  assert.equal(e.latex, "\\sqrt{16}");
  assert.equal(e.result, 4);
});

test("parseRootLine: accepts the German 'wurzel(...)' spelling too", () => {
  const e = parseRootLine("wurzel(9)");
  assert.equal(e.result, 3);
});

test("parsePowerLine: builds an exponent and computes the power", () => {
  const e = parsePowerLine("3^2");
  assert.equal(e.latex, "3^{2}");
  assert.equal(e.result, 9);
});

test("parseLatexMathLine: dispatches to the right parser and returns a math WordItem", () => {
  const w = parseLatexMathLine("sqrt(25)");
  assert.equal(w.kind, "math");
  assert.equal(w.promptFormat, "latex");
  assert.equal(w.prompt, "\\sqrt{25}");
  assert.equal(w.targetWord, "5");
});

test("parseLatexMathLine: returns null for a line matching none of the shorthand forms", () => {
  assert.equal(parseLatexMathLine("Baum"), null);
});

test("parseLatexMathLines: filters out unparseable lines", () => {
  const words = parseLatexMathLines(["1/2 + 1/2", "garbage", "4^2"]);
  assert.equal(words.length, 2);
});

test("generateLatexMathWords: produces the requested count, all with LaTeX prompts and numeric answers", () => {
  const words = generateLatexMathWords({ kinds: ["fraction", "root", "power"], count: 20 });
  assert.equal(words.length, 20);
  for (const w of words) {
    assert.equal(w.kind, "math");
    assert.equal(w.promptFormat, "latex");
    assert.ok(w.prompt.length > 0);
    assert.ok(!Number.isNaN(Number(w.targetWord)), `targetWord should be numeric: ${w.targetWord}`);
  }
});

test("generateLatexMathWords: root tasks always use perfect squares (exact, whole-number answers)", () => {
  const words = generateLatexMathWords({ kinds: ["root"], count: 30 });
  for (const w of words) {
    assert.ok(Number.isInteger(Number(w.targetWord)), `expected a whole number, got ${w.targetWord}`);
  }
});
