import assert from "node:assert/strict";
import test from "node:test";
import {
  applyLearningEvent,
  dueDirections,
  initialLearningProgress,
  minBox,
} from "../src/domain/leitner.ts";

const NOW = "2026-08-19T08:00:00.000Z";

function makeEvent(overrides = {}) {
  return {
    id: "event-1",
    learningObjectId: "word-1",
    occurredAt: NOW,
    source: "learning-box",
    roundId: "round-1",
    direction: "prompt-to-answer",
    answerMode: "typed",
    help: "none",
    assessment: { knowledge: "correct", writing: "correct", selfCorrected: false },
    ...overrides,
  };
}

test("new word starts in box 1 and is due immediately", () => {
  const progress = initialLearningProgress("word-1", NOW);
  assert.equal(progress.knowledge["prompt-to-answer"].box, 1);
  assert.equal(progress.writing["answer-to-prompt"].box, 1);
  assert.deepEqual(
    dueDirections(progress, NOW).length,
    4,
  );
});

test("clean correct answer on first try advances both knowledge and writing", () => {
  const progress = initialLearningProgress("word-1", NOW);
  const next = applyLearningEvent(progress, makeEvent(), NOW);
  assert.equal(next.knowledge["prompt-to-answer"].box, 2);
  assert.equal(next.writing["prompt-to-answer"].box, 2);
});

test("correct meaning with a writing mistake keeps knowledge and drops writing", () => {
  const progress = initialLearningProgress("word-1", NOW);
  const boosted = applyLearningEvent(progress, makeEvent(), NOW);
  const next = applyLearningEvent(
    boosted,
    makeEvent({ id: "event-2", roundId: "round-2", assessment: { knowledge: "correct", writing: "incorrect", selfCorrected: false } }),
    NOW,
  );
  assert.equal(next.knowledge["prompt-to-answer"].box, 2, "Wissen bleibt");
  assert.equal(next.writing["prompt-to-answer"].box, 1, "Schreiben fällt");
});

test("wrong meaning drops both knowledge and writing to box 1", () => {
  const progress = initialLearningProgress("word-1", NOW);
  const boosted = applyLearningEvent(progress, makeEvent(), NOW);
  const next = applyLearningEvent(
    boosted,
    makeEvent({ id: "event-2", roundId: "round-2", assessment: { knowledge: "incorrect", writing: "incorrect", selfCorrected: false } }),
    NOW,
  );
  assert.equal(next.knowledge["prompt-to-answer"].box, 1);
  assert.equal(next.writing["prompt-to-answer"].box, 1);
});

test("using a hint or solution prevents an advance", () => {
  const progress = initialLearningProgress("word-1", NOW);
  const next = applyLearningEvent(progress, makeEvent({ help: "hint" }), NOW);
  assert.equal(next.knowledge["prompt-to-answer"].box, 1);
  assert.equal(next.writing["prompt-to-answer"].box, 1);
});

test("a self-corrected answer does not advance", () => {
  const progress = initialLearningProgress("word-1", NOW);
  const next = applyLearningEvent(
    progress,
    makeEvent({ assessment: { knowledge: "correct", writing: "correct", selfCorrected: true } }),
    NOW,
  );
  assert.equal(next.knowledge["prompt-to-answer"].box, 1);
  assert.equal(next.writing["prompt-to-answer"].box, 1);
});

test("repeated correct answers within the same round advance at most once", () => {
  const progress = initialLearningProgress("word-1", NOW);
  const once = applyLearningEvent(progress, makeEvent(), NOW);
  const twice = applyLearningEvent(once, makeEvent({ id: "event-2" }), NOW);
  assert.equal(twice.knowledge["prompt-to-answer"].box, 2, "kein zweiter Aufstieg in derselben Runde");
  const nextRound = applyLearningEvent(
    twice,
    makeEvent({ id: "event-3", roundId: "round-2" }),
    NOW,
  );
  assert.equal(nextRound.knowledge["prompt-to-answer"].box, 3, "neue Runde erlaubt erneuten Aufstieg");
});

test("box never advances past 5", () => {
  let progress = initialLearningProgress("word-1", NOW);
  for (let round = 0; round < 10; round += 1) {
    progress = applyLearningEvent(progress, makeEvent({ id: `event-${round}`, roundId: `round-${round}` }), NOW);
  }
  assert.equal(progress.knowledge["prompt-to-answer"].box, 5);
});

test("advancing to a higher box pushes the due date further out", () => {
  const progress = initialLearningProgress("word-1", NOW);
  const next = applyLearningEvent(progress, makeEvent(), NOW);
  assert.ok(next.knowledge["prompt-to-answer"].dueAt > NOW);
});

test("minBox: a fresh item is box 1 on every track", () => {
  const progress = initialLearningProgress("word-1", NOW);
  assert.equal(minBox(progress), 1);
});

test("minBox: reports the weakest track, not the strongest", () => {
  let progress = initialLearningProgress("word-1", NOW);
  progress = applyLearningEvent(progress, makeEvent(), NOW); // prompt-to-answer advances to box 2
  assert.equal(minBox(progress), 1, "the other three tracks are still at box 1");
});
