import assert from "node:assert/strict";
import test from "node:test";
import { checkDuellAnswer, evaluateDuellRound, rankDuellResults } from "../src/duell/duell-scoring.ts";

function word(itemId, answer, alternatives = [], answerLocale = "de") {
  return { itemId, prompt: "prompt", promptLocale: "en", answer, answerLocale, alternatives };
}

test("checkDuellAnswer: matches the main answer, case- and whitespace-insensitive", () => {
  const w = word("1", "das Haus");
  assert.equal(checkDuellAnswer(w, "das haus"), true);
  assert.equal(checkDuellAnswer(w, "  DAS   HAUS  "), true);
  assert.equal(checkDuellAnswer(w, "das auto"), false);
});

test("checkDuellAnswer: also matches accepted alternatives", () => {
  const w = word("1", "das Haus", ["das Zuhause"]);
  assert.equal(checkDuellAnswer(w, "das Zuhause"), true);
});

test("checkDuellAnswer: empty input is never correct", () => {
  assert.equal(checkDuellAnswer(word("1", "das Haus"), "   "), false);
});

test("evaluateDuellRound: scores correct/incorrect/missing answers, computes rounded accuracy", () => {
  const words = [word("1", "eins"), word("2", "zwei"), word("3", "drei")];
  const round = evaluateDuellRound(
    words,
    [
      { itemId: "1", typed: "eins" },
      { itemId: "2", typed: "falsch" },
      // "3" has no answer at all -> counts as wrong, not skipped
    ],
    5000,
  );
  assert.equal(round.correctCount, 1);
  assert.equal(round.totalCount, 3);
  assert.equal(round.accuracy, 33);
  assert.equal(round.totalTimeMs, 5000);
  assert.deepEqual(round.wordResults, [
    { itemId: "1", correct: true },
    { itemId: "2", correct: false },
    { itemId: "3", correct: false },
  ]);
});

test("evaluateDuellRound: an empty word list gives 0% accuracy, not NaN", () => {
  const round = evaluateDuellRound([], [], 0);
  assert.equal(round.accuracy, 0);
});

test("rankDuellResults: higher accuracy wins regardless of time", () => {
  const slow100 = { participantId: "a", alias: "Anna", round: { wordResults: [], correctCount: 10, totalCount: 10, accuracy: 100, totalTimeMs: 90000 } };
  const fast80 = { participantId: "b", alias: "Ben", round: { wordResults: [], correctCount: 8, totalCount: 10, accuracy: 80, totalTimeMs: 10000 } };
  const ranked = rankDuellResults([fast80, slow100]);
  assert.deepEqual(ranked.map((r) => r.participantId), ["a", "b"]);
});

test("rankDuellResults: time is only the tiebreaker for equal accuracy", () => {
  const slow = { participantId: "slow", alias: "Slow", round: { wordResults: [], correctCount: 9, totalCount: 10, accuracy: 90, totalTimeMs: 20000 } };
  const fast = { participantId: "fast", alias: "Fast", round: { wordResults: [], correctCount: 9, totalCount: 10, accuracy: 90, totalTimeMs: 10000 } };
  const ranked = rankDuellResults([slow, fast]);
  assert.deepEqual(ranked.map((r) => r.participantId), ["fast", "slow"]);
});

test("rankDuellResults: does not mutate the input array", () => {
  const a = { participantId: "a", alias: "A", round: { wordResults: [], correctCount: 1, totalCount: 1, accuracy: 100, totalTimeMs: 1 } };
  const b = { participantId: "b", alias: "B", round: { wordResults: [], correctCount: 0, totalCount: 1, accuracy: 0, totalTimeMs: 1 } };
  const input = [b, a];
  rankDuellResults(input);
  assert.deepEqual(input, [b, a]);
});
