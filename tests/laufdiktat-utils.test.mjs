import assert from "node:assert/strict";
import test from "node:test";
import { checkAnswer } from "../src/laufdiktat/check-answer.ts";
import { computeStars } from "../src/laufdiktat/scoring.ts";
import { seededShuffle, deterministicOrder } from "../src/laufdiktat/seeded-shuffle.ts";
import { compareVersions } from "../src/laufdiktat/app-version.ts";
import { createDebounced } from "../src/laufdiktat/debounce.ts";
import { animalToFileName, parseStudentName, generateStudentName } from "../src/laufdiktat/animal-names.ts";
import { buildHint } from "../src/laufdiktat/build-hint.ts";
import { isBlockedInputType, isSuspiciousBulkInsert, sanitizeMathInput } from "../src/laufdiktat/strict-typing.ts";
import { pickAttackCandidates } from "../src/laufdiktat/attack-candidates.ts";
import { parseMathExpr, parseMathLine, generateMathLines, displayNum } from "../src/laufdiktat/math-tasks.ts";
import { initialAdaptiveState, nextAdaptiveState, generateAdaptiveTask, LEVELS, MAX_LEVEL } from "../src/laufdiktat/adaptive-math.ts";
import { wordsFromText, wordsFromMathLines, wordsFromVocabLines } from "../src/laufdiktat/word-import.ts";

test("checkAnswer: plain text is trimmed but otherwise matched exactly", () => {
  const word = { id: "1", kind: "text", targetWord: "Baum" };
  assert.equal(checkAnswer(word, "Baum"), true);
  assert.equal(checkAnswer(word, "baum"), false);
  assert.equal(checkAnswer(word, " Baum "), true);
  assert.equal(checkAnswer(word, "Baume"), false);
});

test("checkAnswer: vocabulary is trimmed, whitespace-normalized, and case-insensitive by default", () => {
  const word = { id: "1", kind: "vocabulary", targetWord: "das Haus", acceptedAnswers: ["die Hütte"] };
  assert.equal(checkAnswer(word, "  DAS   Haus "), true);
  assert.equal(checkAnswer(word, "die hütte"), true);
  assert.equal(checkAnswer(word, "das Auto"), false);
});

test("checkAnswer: vocabulary respects caseSensitive", () => {
  const word = { id: "1", kind: "vocabulary", targetWord: "Berlin", caseSensitive: true };
  assert.equal(checkAnswer(word, "Berlin"), true);
  assert.equal(checkAnswer(word, "berlin"), false);
});

test("checkAnswer: empty input is wrong unless the target word is itself empty", () => {
  assert.equal(checkAnswer({ id: "1", kind: "text", targetWord: "Baum" }, "  "), false);
  assert.equal(checkAnswer({ id: "1", kind: "vocabulary", targetWord: "x" }, ""), false);
});

test("checkAnswer: math accepts a small numeric tolerance and a decimal comma", () => {
  const task = { id: "1", kind: "math", targetWord: "8" };
  assert.equal(checkAnswer(task, "8"), true);
  assert.equal(checkAnswer(task, "7"), false);
  const rounded = { id: "2", kind: "math", targetWord: "0.333333333" };
  assert.equal(checkAnswer(rounded, "0,33"), true);
  assert.equal(checkAnswer(rounded, "0,3"), false);
});

test("computeStars: no errors is always 5 stars", () => {
  assert.equal(computeStars(0, 10), 5);
  assert.equal(computeStars(0, 0), 5);
});

test("computeStars: scales down with the error rate", () => {
  assert.equal(computeStars(1, 20), 4); // 5%
  assert.equal(computeStars(5, 20), 3); // 25%
  assert.equal(computeStars(10, 20), 2); // 50%
  assert.equal(computeStars(18, 20), 1); // 90%
});

test("seededShuffle: same seed always gives the same order", () => {
  const items = ["a", "b", "c", "d", "e"];
  const first = seededShuffle(items, "room-1234-student-A");
  const second = seededShuffle(items, "room-1234-student-A");
  assert.deepEqual(first, second);
  assert.deepEqual([...first].sort(), [...items].sort());
});

test("seededShuffle: different seeds usually give different orders", () => {
  const items = Array.from({ length: 20 }, (_, i) => i);
  const a = deterministicOrder(20, "seed-A");
  const b = deterministicOrder(20, "seed-B");
  assert.notDeepEqual(a, b);
  void items;
});

test("compareVersions: compares semver-like strings", () => {
  assert.equal(compareVersions("2.0.1", "2.0.0") > 0, true);
  assert.equal(compareVersions("1.0.0", "1.0.0"), 0);
  assert.equal(compareVersions("1.2.0", "1.10.0") < 0, true);
});

test("createDebounced: coalesces bursts into a single call", async () => {
  let calls = 0;
  const debounced = createDebounced(() => { calls += 1; }, { delayMs: 20, maxWaitMs: 200 });
  debounced.schedule();
  debounced.schedule();
  debounced.schedule();
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(calls, 1);
});

test("createDebounced: maxWait fires even under continuous scheduling", async () => {
  let calls = 0;
  const debounced = createDebounced(() => { calls += 1; }, { delayMs: 30, maxWaitMs: 60 });
  const interval = setInterval(() => debounced.schedule(), 10);
  await new Promise((resolve) => setTimeout(resolve, 100));
  clearInterval(interval);
  assert.ok(calls >= 1, "debounced function should have fired despite continuous scheduling");
});

test("animalToFileName: converts umlauts and applies overrides", () => {
  assert.equal(animalToFileName("Chamäleon"), "chameleon");
  assert.equal(animalToFileName("Sphynx-Katze"), "sphynxkatze");
  assert.equal(animalToFileName("Eichhörnchen"), "eichhoernchen");
});

test("parseStudentName: splits adjective from a possibly multi-word animal", () => {
  assert.deepEqual(parseStudentName("Schnelles Nashorn"), { adjective: "Schnelles", animal: "Nashorn" });
  assert.deepEqual(parseStudentName("Mutiger Roter Panda"), { adjective: "Mutiger", animal: "Roter Panda" });
});

test("generateStudentName: always produces 'Adjective Animal'", () => {
  const name = generateStudentName(() => 0);
  assert.match(name, /^\S+ .+$/);
});

test("buildHint: reveals roughly the requested fraction of letters in a single word", () => {
  const hint = buildHint("Baum", 0.5);
  const revealedCount = hint.split(" ").filter((c) => c !== "_").length;
  assert.equal(revealedCount, 2);
  assert.equal(buildHint("Baum", 1).replace(/ /g, ""), "Baum");
});

test("buildHint: reveals whole words (not letters) for a sentence", () => {
  const hint = buildHint("Der Baum ist grün", 0.5);
  assert.doesNotMatch(hint, /B_um|gr_n/, "should mask or show whole words, never partial words");
});

test("buildHint: is deterministic for the same target and fraction", () => {
  assert.equal(buildHint("Baum", 0.5), buildHint("Baum", 0.5));
});

test("strictTyping: blocks paste/drop/replacement input types but allows normal typing", () => {
  assert.equal(isBlockedInputType("insertFromPaste"), true);
  assert.equal(isBlockedInputType("insertReplacementText"), true);
  assert.equal(isBlockedInputType("insertText"), false);
  assert.equal(isBlockedInputType(null), false);
});

test("strictTyping: flags a value growing by more than one character at once", () => {
  assert.equal(isSuspiciousBulkInsert("Bau", "Baum"), false);
  assert.equal(isSuspiciousBulkInsert("", "Baum"), true);
});

test("strictTyping: sanitizes math input to digits/minus/comma/dot", () => {
  assert.equal(sanitizeMathInput("12,5abc"), "12,5");
  assert.equal(sanitizeMathInput("-3.5"), "-3.5");
});

test("pickAttackCandidates: excludes self and returns at most 3 targets", () => {
  const roster = { Anna: 5, Ben: 6, Clara: 7, David: 8, Erik: 9 };
  const candidates = pickAttackCandidates(roster, "Anna", 5);
  assert.equal(candidates.length, 3);
  assert.equal(candidates.some((c) => c.name === "Anna"), false);
});

test("pickAttackCandidates: a leader sees the closest students behind them", () => {
  const roster = { Ben: 2, Clara: 1 };
  const candidates = pickAttackCandidates(roster, "Anna", 5);
  assert.deepEqual(candidates.map((c) => c.name), ["Ben", "Clara"]);
});

test("math-tasks: parses simple expressions with German operators", () => {
  assert.deepEqual(parseMathExpr("4+4"), { a: 4, op: "+", b: 4, result: 8 });
  assert.deepEqual(parseMathExpr("12 − 5"), { a: 12, op: "-", b: 5, result: 7 });
  assert.deepEqual(parseMathExpr("6·7"), { a: 6, op: "*", b: 7, result: 42 });
  assert.deepEqual(parseMathExpr("20:4"), { a: 20, op: "/", b: 4, result: 5 });
  assert.equal(parseMathExpr("not a task"), null);
});

test("math-tasks: parseMathLine builds a math WordItem with the result as the answer", () => {
  const word = parseMathLine("4 + 4");
  assert.equal(word.kind, "math");
  assert.equal(word.targetWord, "8");
  assert.equal(word.prompt, "4 + 4");
});

test("math-tasks: generateMathLines stays within the configured number range", () => {
  const lines = generateMathLines({
    ops: ["+", "-"],
    minValue: 0,
    maxValue: 10,
    count: 30,
    allowNegativeResults: false,
    excludeZeroOperand: false,
    excludeZeroResult: false,
    multiplicationTables: [],
  });
  assert.equal(lines.length, 30);
  for (const line of lines) {
    const expr = parseMathExpr(line);
    assert.ok(expr, `"${line}" should parse back into a math expression`);
    assert.ok(expr.a >= 0 && expr.a <= 10, `operand a out of range: ${line}`);
    assert.ok(expr.b >= 0 && expr.b <= 10, `operand b out of range: ${line}`);
    assert.ok(expr.result >= 0 && expr.result <= 10, `result out of range: ${line}`);
  }
});

test("math-tasks: displayNum uses a German decimal comma", () => {
  assert.equal(displayNum(0.5), "0,5");
  assert.equal(displayNum(3), "3");
});

test("adaptive-math: starts at level 0 by default", () => {
  assert.deepEqual(initialAdaptiveState(), { level: 0, correctStreak: 0, wrongStreak: 0 });
});

test("adaptive-math: initial level is clamped into range", () => {
  assert.equal(initialAdaptiveState(-5).level, 0);
  assert.equal(initialAdaptiveState(999).level, MAX_LEVEL);
});

test("adaptive-math: three correct answers in a row level up and reset streaks", () => {
  let state = initialAdaptiveState(0);
  state = nextAdaptiveState(state, true);
  state = nextAdaptiveState(state, true);
  assert.equal(state.level, 0, "not yet — only 2 in a row");
  state = nextAdaptiveState(state, true);
  assert.deepEqual(state, { level: 1, correctStreak: 0, wrongStreak: 0 });
});

test("adaptive-math: two wrong answers in a row level down and reset streaks", () => {
  let state = initialAdaptiveState(3);
  state = nextAdaptiveState(state, false);
  assert.equal(state.level, 3, "not yet — only 1 wrong");
  state = nextAdaptiveState(state, false);
  assert.deepEqual(state, { level: 2, correctStreak: 0, wrongStreak: 0 });
});

test("adaptive-math: level never drops below 0 or exceeds MAX_LEVEL", () => {
  let low = initialAdaptiveState(0);
  low = nextAdaptiveState(low, false);
  low = nextAdaptiveState(low, false);
  assert.equal(low.level, 0);

  let high = initialAdaptiveState(MAX_LEVEL);
  high = nextAdaptiveState(high, true);
  high = nextAdaptiveState(high, true);
  high = nextAdaptiveState(high, true);
  assert.equal(high.level, MAX_LEVEL);
});

test("adaptive-math: a correct answer after a wrong one resets the wrong streak (no double-counting)", () => {
  let state = initialAdaptiveState(3);
  state = nextAdaptiveState(state, false);
  state = nextAdaptiveState(state, true);
  assert.equal(state.wrongStreak, 0);
  assert.equal(state.level, 3, "one wrong + one correct should not have leveled down");
});

test("adaptive-math: generates a task matching the state's difficulty level", () => {
  const state = initialAdaptiveState(0);
  const task = generateAdaptiveTask(state);
  assert.equal(task.kind, "math");
  const expr = parseMathExpr(task.prompt);
  assert.ok(expr);
  assert.equal(expr.op, "+", "level 0 only uses addition");
  assert.ok(expr.a >= 0 && expr.a <= 10 && expr.b >= 0 && expr.b <= 10);
});

test("adaptive-math: LEVELS is a non-empty, increasingly permissive ladder", () => {
  assert.ok(LEVELS.length > 1);
  for (let i = 1; i < LEVELS.length; i++) {
    assert.ok(LEVELS[i].maxValue >= LEVELS[i - 1].maxValue, `level ${i} should not be easier than level ${i - 1}`);
  }
});

test("wordsFromText: one word or sentence per line, blank lines dropped", () => {
  const words = wordsFromText("Baum\n\nHaus  \n  Schule");
  assert.deepEqual(words.map((w) => w.targetWord), ["Baum", "Haus", "Schule"]);
  assert.ok(words.every((w) => w.kind === "text"));
});

test("wordsFromMathLines: skips lines that don't parse as a math expression", () => {
  const words = wordsFromMathLines(["4+4", "not a task", "6·7"]);
  assert.deepEqual(words.map((w) => w.targetWord), ["8", "42"]);
});

test("wordsFromVocabLines: parses 'Wort = Übersetzung' pairs", () => {
  const words = wordsFromVocabLines("the house = das Haus\nthe car = das Auto");
  assert.equal(words.length, 2);
  assert.equal(words[0].kind, "vocabulary");
  assert.equal(words[0].prompt, "the house");
  assert.equal(words[0].targetWord, "das Haus");
  assert.equal(words[0].acceptedAnswers, undefined);
});

test("wordsFromVocabLines: a slash-separated right side becomes accepted answers", () => {
  const [word] = wordsFromVocabLines("the car = das Auto/der Wagen");
  assert.equal(word.targetWord, "das Auto");
  assert.deepEqual(word.acceptedAnswers, ["der Wagen"]);
});

test("wordsFromVocabLines: ignores lines without '=' and lines missing a side", () => {
  const words = wordsFromVocabLines("no equals sign here\n = missing prompt\nthe dog = ");
  assert.equal(words.length, 0);
});
