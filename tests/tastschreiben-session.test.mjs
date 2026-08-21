import assert from "node:assert/strict";
import test from "node:test";
import { initSession, typeChar, backspace, isFinished, currentExpectedChar, forceFinish } from "../src/tastschreiben/typing-session.ts";
import { computeStats } from "../src/tastschreiben/typing-stats.ts";

test("initSession: starts at position 0, nothing typed, not finished", () => {
  const s = initSession("abc");
  assert.equal(s.position, 0);
  assert.deepEqual(s.typed, [null, null, null]);
  assert.equal(isFinished(s), false);
  assert.equal(currentExpectedChar(s), "a");
});

test("typeChar: a correct character advances and records it", () => {
  let s = initSession("ab");
  s = typeChar(s, "a", 1000);
  assert.equal(s.position, 1);
  assert.deepEqual(s.typed[0], { char: "a", correct: true });
  assert.equal(s.startedAt, 1000);
});

test("typeChar: a wrong character still advances (never gets stuck), but is marked incorrect", () => {
  let s = initSession("ab");
  s = typeChar(s, "x", 1000);
  assert.equal(s.position, 1);
  assert.deepEqual(s.typed[0], { char: "x", correct: false });
});

test("typeChar: typing the last character finishes the session", () => {
  let s = initSession("ab");
  s = typeChar(s, "a", 1000);
  s = typeChar(s, "b", 1500);
  assert.equal(isFinished(s), true);
  assert.equal(s.finishedAt, 1500);
});

test("typeChar: does nothing once the session is finished", () => {
  let s = initSession("a");
  s = typeChar(s, "a", 1000);
  const after = typeChar(s, "x", 2000);
  assert.equal(after, s, "no change once finished");
});

test("backspace: moves back one position and clears it, counts as a correction", () => {
  let s = initSession("ab");
  s = typeChar(s, "x", 1000);
  s = backspace(s);
  assert.equal(s.position, 0);
  assert.equal(s.typed[0], null);
  assert.equal(s.corrections, 1);
  assert.equal(currentExpectedChar(s), "a");
});

test("backspace: does nothing at position 0", () => {
  const s = initSession("ab");
  const after = backspace(s);
  assert.equal(after, s);
});

test("keystrokeLog keeps every attempt, even ones later corrected away", () => {
  let s = initSession("ab");
  s = typeChar(s, "x", 1000);
  s = backspace(s);
  s = typeChar(s, "a", 1200);
  assert.equal(s.keystrokeLog.length, 2, "both the wrong and the corrected attempt are logged");
  assert.equal(s.typed[0].char, "a", "but the final displayed result is the corrected one");
});

test("computeStats: accuracy, cpm and problem characters from a finished session", () => {
  let s = initSession("aab");
  s = typeChar(s, "a", 0);
  s = typeChar(s, "x", 500); // wrong, expected "a"
  s = typeChar(s, "b", 1000);
  const stats = computeStats(s.keystrokeLog, s.startedAt, s.finishedAt, s.corrections);

  assert.equal(stats.totalChars, 3);
  assert.equal(stats.correctChars, 2);
  assert.equal(stats.errorCount, 1);
  assert.ok(stats.accuracy > 60 && stats.accuracy < 70);
  assert.deepEqual(stats.problemChars, [{ char: "a", errors: 1 }]);
});

test("computeStats: an empty keystroke log reports full accuracy and zero speed, no crash", () => {
  const stats = computeStats([], 0, 0, 0);
  assert.equal(stats.accuracy, 100);
  assert.equal(stats.cpm, 0);
  assert.equal(stats.wpm, 0);
});

test("forceFinish: ends a started session early, mid-text (e.g. a time-attack timer running out)", () => {
  let s = initSession("hallo welt, ein sehr langer text");
  s = typeChar(s, "h", 1000);
  s = typeChar(s, "a", 1200);
  s = forceFinish(s, 5000);
  assert.equal(isFinished(s), true);
  assert.equal(s.finishedAt, 5000);
  assert.equal(s.position, 2, "typed-so-far is preserved, the rest of the text is simply abandoned");
});

test("forceFinish: does nothing if typing never started (avoids a fake 0ms round)", () => {
  const s = initSession("hallo");
  const after = forceFinish(s, 5000);
  assert.equal(after, s);
});

test("forceFinish: does nothing once the session is already finished", () => {
  let s = initSession("ab");
  s = typeChar(s, "a", 1000);
  s = typeChar(s, "b", 1200);
  const after = forceFinish(s, 5000);
  assert.equal(after, s);
});
