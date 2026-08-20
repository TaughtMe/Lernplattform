import assert from "node:assert/strict";
import test from "node:test";
import {
  initialLernwortProgress,
  applyLernwortResult,
  isDue,
  buildGapMask,
  buildStage2Mask,
  buildStage3Mask,
  wordLengthPlaceholder,
  scoreBlockAnswers,
  MISTAKE_STAGE_DROP_THRESHOLD,
} from "../src/domain/lernwort.ts";

const NOW = "2026-08-20T10:00:00.000Z";

test("initialLernwortProgress: starts at stage 1, box 1, due immediately", () => {
  const p = initialLernwortProgress("w1", NOW);
  assert.equal(p.stage, 1);
  assert.equal(p.box, 1);
  assert.equal(p.dueAt, NOW);
  assert.equal(p.consecutiveMistakes, 0);
  assert.equal(isDue(p, NOW), true);
});

test("applyLernwortResult: a clean, unaided correct answer advances both stage and box", () => {
  const p = initialLernwortProgress("w1", NOW);
  const next = applyLernwortResult(p, { correct: true, usedHelp: false, selfCorrected: false }, NOW);
  assert.equal(next.stage, 2);
  assert.equal(next.box, 2);
  assert.equal(next.consecutiveMistakes, 0);
});

test("applyLernwortResult: before stage 5, a word stays due immediately regardless of box — the Merkstrecke must be walkable in one sitting", () => {
  let p = initialLernwortProgress("w1", NOW);
  for (let i = 0; i < 3; i++) {
    p = applyLernwortResult(p, { correct: true, usedHelp: false, selfCorrected: false }, NOW);
    assert.equal(p.dueAt, NOW, `still due immediately at stage ${p.stage}`);
  }
  assert.equal(p.stage, 4);
});

test("applyLernwortResult: the 4 -> 5 transition itself still stays due immediately (the word's very first stage-5 block must be reachable)", () => {
  let p = { learningObjectId: "w1", stage: 4, box: 4, dueAt: NOW, consecutiveMistakes: 0 };
  p = applyLernwortResult(p, { correct: true, usedHelp: false, selfCorrected: false }, NOW);
  assert.equal(p.stage, 5);
  assert.equal(p.box, 5);
  assert.equal(p.dueAt, NOW, "not spaced out yet — the word has not passed a stage-5 block exercise");
});

test("applyLernwortResult: a correct result while already graduated (a passed stage-5 block) finally applies the real Leitner spacing", () => {
  let p = { learningObjectId: "w1", stage: 5, box: 4, dueAt: NOW, consecutiveMistakes: 0 };
  p = applyLernwortResult(p, { correct: true, usedHelp: false, selfCorrected: false }, NOW);
  assert.equal(p.stage, 5);
  assert.equal(p.box, 5);
  assert.ok(p.dueAt > NOW, "box 5 spaces the next review out into the future");
});

test("applyLernwortResult: a mistake at stage 5 makes the word due again immediately, even though the stage may still be 5", () => {
  let p = { learningObjectId: "w1", stage: 5, box: 5, dueAt: NOW, consecutiveMistakes: 0 };
  p = applyLernwortResult(p, { correct: false, usedHelp: false, selfCorrected: false }, NOW);
  assert.equal(p.stage, 5, "one mistake alone does not drop the stage");
  assert.equal(p.box, 1);
  assert.equal(p.dueAt, NOW, "back to box 1 means due right away again");
});

test("applyLernwortResult: stage caps at 5, box caps at 5", () => {
  let p = { learningObjectId: "w1", stage: 5, box: 5, dueAt: NOW, consecutiveMistakes: 0 };
  p = applyLernwortResult(p, { correct: true, usedHelp: false, selfCorrected: false }, NOW);
  assert.equal(p.stage, 5);
  assert.equal(p.box, 5);
});

test("applyLernwortResult: correct but with help holds the stage and box (no advance)", () => {
  const p = initialLernwortProgress("w1", NOW);
  const next = applyLernwortResult(p, { correct: true, usedHelp: true, selfCorrected: false }, NOW);
  assert.equal(next.stage, 1);
  assert.equal(next.box, 1);
});

test("applyLernwortResult: a self-corrected answer counts as correct but still does not advance", () => {
  const p = initialLernwortProgress("w1", NOW);
  const next = applyLernwortResult(p, { correct: true, usedHelp: false, selfCorrected: true }, NOW);
  assert.equal(next.stage, 1);
  assert.equal(next.box, 1);
});

test("applyLernwortResult: a wrong answer holds the stage but resets the box to 1", () => {
  let p = { learningObjectId: "w1", stage: 3, box: 4, dueAt: NOW, consecutiveMistakes: 0 };
  const next = applyLernwortResult(p, { correct: false, usedHelp: false, selfCorrected: false }, NOW);
  assert.equal(next.stage, 3, "one mistake alone does not drop the stage yet");
  assert.equal(next.box, 1);
  assert.equal(next.consecutiveMistakes, 1);
});

test(`applyLernwortResult: ${MISTAKE_STAGE_DROP_THRESHOLD} consecutive mistakes drop the stage by one and reset the counter`, () => {
  let p = { learningObjectId: "w1", stage: 3, box: 2, dueAt: NOW, consecutiveMistakes: 0 };
  for (let i = 0; i < MISTAKE_STAGE_DROP_THRESHOLD; i++) {
    p = applyLernwortResult(p, { correct: false, usedHelp: false, selfCorrected: false }, NOW);
  }
  assert.equal(p.stage, 2);
  assert.equal(p.consecutiveMistakes, 0);
});

test("applyLernwortResult: repeated mistakes never drop the stage below 1", () => {
  let p = { learningObjectId: "w1", stage: 1, box: 1, dueAt: NOW, consecutiveMistakes: 0 };
  for (let i = 0; i < MISTAKE_STAGE_DROP_THRESHOLD * 2; i++) {
    p = applyLernwortResult(p, { correct: false, usedHelp: false, selfCorrected: false }, NOW);
  }
  assert.equal(p.stage, 1);
});

test("applyLernwortResult: a correct answer resets the consecutive-mistake counter", () => {
  let p = { learningObjectId: "w1", stage: 2, box: 1, dueAt: NOW, consecutiveMistakes: 2 };
  p = applyLernwortResult(p, { correct: true, usedHelp: false, selfCorrected: false }, NOW);
  assert.equal(p.consecutiveMistakes, 0);
});

test("buildGapMask: hides roughly the requested fraction of letters, never the whole word, never zero for a non-trivial word", () => {
  const mask = buildGapMask("Nilpferd", "seed-a", 0.25);
  const hiddenCount = mask.filter((c) => c.hidden).length;
  assert.ok(hiddenCount >= 1 && hiddenCount < mask.length, `hid ${hiddenCount} of ${mask.length}`);
  assert.equal(mask.map((c) => c.char).join(""), "Nilpferd", "the mask always carries the true characters, hidden or not");
});

test("buildGapMask: is deterministic for the same seed, varies for a different seed", () => {
  const a1 = buildGapMask("Nilpferd", "seed-a", 0.5);
  const a2 = buildGapMask("Nilpferd", "seed-a", 0.5);
  assert.deepEqual(a1, a2);
  const b = buildGapMask("Nilpferd", "seed-b", 0.5);
  assert.notDeepEqual(a1, b, "different seeds should very likely pick a different subset");
});

test("buildStage3Mask hides more letters than buildStage2Mask for the same word and seed", () => {
  const word = "Verhältnismäßigkeit";
  const stage2 = buildStage2Mask(word, "s").filter((c) => c.hidden).length;
  const stage3 = buildStage3Mask(word, "s").filter((c) => c.hidden).length;
  assert.ok(stage3 > stage2, `stage3 hid ${stage3}, stage2 hid ${stage2}`);
});

test("wordLengthPlaceholder: replaces letters with underscores, keeps spaces", () => {
  assert.equal(wordLengthPlaceholder("Fahrrad"), "_______");
  assert.equal(wordLengthPlaceholder("zwei Wörter"), "____ ______");
});

test("scoreBlockAnswers: matches regardless of order", () => {
  const result = scoreBlockAnswers(["Haus", "Baum", "Auto"], ["Auto", "Haus", "Baum"]);
  assert.deepEqual(result, [true, true, true]);
});

test("scoreBlockAnswers: a missing or wrong answer only fails its own target", () => {
  const result = scoreBlockAnswers(["Haus", "Baum", "Auto"], ["Haus", "Baumm"]);
  assert.deepEqual(result, [true, false, false]);
});

test("scoreBlockAnswers: duplicate targets each need their own matching answer", () => {
  const result = scoreBlockAnswers(["Haus", "Haus"], ["Haus"]);
  assert.equal(result.filter(Boolean).length, 1, "only one of the two duplicate targets can be satisfied by one typed answer");
});

test("scoreBlockAnswers: matching ignores case and surrounding whitespace", () => {
  const result = scoreBlockAnswers(["Haus"], [" haus  "]);
  assert.deepEqual(result, [true]);
});
