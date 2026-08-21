import assert from "node:assert/strict";
import test from "node:test";
import {
  ZERO_TOTALS,
  DAILY_EVENT_CAP,
  computeEventTotals,
  computeGraduatedCount,
  computeBoxLevelSum,
  computeWeeklyDelta,
  computePoints,
  currentWeekKey,
  evaluateHouseMissions,
  HOUSE_MISSIONS,
} from "../src/klasse/ranking.ts";

function event(overrides = {}) {
  return {
    id: `e-${Math.random()}`,
    learningObjectId: "word-1",
    occurredAt: "2026-08-10T10:00:00.000Z",
    source: "learning-box",
    roundId: "round-1",
    direction: "prompt-to-answer",
    answerMode: "typed",
    help: "none",
    assessment: { knowledge: "correct", writing: "correct", selfCorrected: false },
    ...overrides,
  };
}

test("computeEventTotals: counts correct and clean answers", () => {
  const totals = computeEventTotals([event(), event({ help: "hint" })]);
  assert.equal(totals.correctAnswers, 2);
  assert.equal(totals.cleanAnswers, 1);
  assert.equal(totals.comebackAnswers, 0);
});

test("computeEventTotals: a self-corrected answer is not 'clean'", () => {
  const totals = computeEventTotals([event({ assessment: { knowledge: "correct", writing: "correct", selfCorrected: true } })]);
  assert.equal(totals.correctAnswers, 1);
  assert.equal(totals.cleanAnswers, 0);
});

test("computeEventTotals: a correct answer after an earlier mistake on the same word is a comeback", () => {
  const totals = computeEventTotals([
    event({ occurredAt: "2026-08-01T10:00:00.000Z", assessment: { knowledge: "incorrect", writing: "incorrect", selfCorrected: false } }),
    event({ occurredAt: "2026-08-02T10:00:00.000Z" }),
  ]);
  assert.equal(totals.comebackAnswers, 1);
});

test("computeEventTotals: order in the input array does not matter, only chronology", () => {
  const later = event({ occurredAt: "2026-08-02T10:00:00.000Z" });
  const earlier = event({ occurredAt: "2026-08-01T10:00:00.000Z", assessment: { knowledge: "incorrect", writing: "incorrect", selfCorrected: false } });
  const totals = computeEventTotals([later, earlier]);
  assert.equal(totals.comebackAnswers, 1);
});

test("computeEventTotals: a correct answer with no prior mistake is not a comeback", () => {
  const totals = computeEventTotals([event()]);
  assert.equal(totals.comebackAnswers, 0);
});

test("computeEventTotals: counts distinct active days, incorrect answers still count toward activity", () => {
  const totals = computeEventTotals([
    event({ occurredAt: "2026-08-01T09:00:00.000Z" }),
    event({ occurredAt: "2026-08-01T18:00:00.000Z" }),
    event({ occurredAt: "2026-08-02T09:00:00.000Z", assessment: { knowledge: "incorrect", writing: "incorrect", selfCorrected: false } }),
  ]);
  assert.equal(totals.activeDays, 2);
});

test("computeEventTotals: repeating the same day past the daily cap earns no extra points, but still counts as one active day", () => {
  const manyEvents = Array.from({ length: DAILY_EVENT_CAP + 20 }, (_, i) =>
    event({ occurredAt: `2026-08-05T${String(8 + Math.floor(i / 30)).padStart(2, "0")}:${String(i % 60).padStart(2, "0")}:00.000Z`, learningObjectId: `word-${i}` }),
  );
  const totals = computeEventTotals(manyEvents);
  assert.equal(totals.correctAnswers, DAILY_EVENT_CAP);
  assert.equal(totals.activeDays, 1);
});

test("computeEventTotals: the daily cap resets on the next calendar day", () => {
  const day1 = Array.from({ length: DAILY_EVENT_CAP }, (_, i) => event({ occurredAt: "2026-08-05T08:00:00.000Z", learningObjectId: `d1-${i}` }));
  const day2 = [event({ occurredAt: "2026-08-06T08:00:00.000Z", learningObjectId: "d2-0" })];
  const totals = computeEventTotals([...day1, ...day2]);
  assert.equal(totals.correctAnswers, DAILY_EVENT_CAP + 1);
  assert.equal(totals.activeDays, 2);
});

test("computeGraduatedCount: counts only stage-5 Lernwörter", () => {
  const progress = [{ stage: 5 }, { stage: 3 }, { stage: 5 }];
  assert.equal(computeGraduatedCount(progress), 2);
});

test("computeBoxLevelSum: sums all four box values per entry", () => {
  const progress = [
    {
      knowledge: { "prompt-to-answer": { box: 2 }, "answer-to-prompt": { box: 1 } },
      writing: { "prompt-to-answer": { box: 3 }, "answer-to-prompt": { box: 1 } },
    },
  ];
  assert.equal(computeBoxLevelSum(progress), 7);
});

test("computeWeeklyDelta: subtracts field-wise and never goes negative", () => {
  const current = { correctAnswers: 10, cleanAnswers: 5, comebackAnswers: 2, graduatedLernwoerter: 3, boxLevelSum: 20, activeDays: 4 };
  const baseline = { correctAnswers: 4, cleanAnswers: 5, comebackAnswers: 0, graduatedLernwoerter: 1, boxLevelSum: 25, activeDays: 1 };
  assert.deepEqual(computeWeeklyDelta(current, baseline), {
    correctAnswers: 6,
    cleanAnswers: 0,
    comebackAnswers: 2,
    graduatedLernwoerter: 2,
    boxLevelSum: 0,
    activeDays: 3,
  });
});

test("computePoints: weights each category, zero totals give zero points", () => {
  assert.equal(computePoints(ZERO_TOTALS), 0);
  const totals = { ...ZERO_TOTALS, correctAnswers: 10, cleanAnswers: 5, comebackAnswers: 2, graduatedLernwoerter: 1 };
  assert.equal(computePoints(totals), 10 * 1 + 5 * 2 + 2 * 3 + 1 * 5);
  assert.equal(computePoints(ZERO_TOTALS, 3), 3 * 5);
});

test("currentWeekKey: same ISO week for two dates in the same week, different for the next week", () => {
  const mon = currentWeekKey(new Date("2026-08-10T08:00:00.000Z"));
  const wed = currentWeekKey(new Date("2026-08-12T20:00:00.000Z"));
  const nextMon = currentWeekKey(new Date("2026-08-17T08:00:00.000Z"));
  assert.equal(mon, wed);
  assert.notEqual(mon, nextMon);
  assert.match(mon, /^\d{4}-W\d{2}$/);
});

test("evaluateHouseMissions: sums totals across members for the summing missions", () => {
  const members = [
    { ...ZERO_TOTALS, comebackAnswers: 40, graduatedLernwoerter: 20, boxLevelSum: 10, activeDays: 3 },
    { ...ZERO_TOTALS, comebackAnswers: 70, graduatedLernwoerter: 35, boxLevelSum: 15, activeDays: 6 },
  ];
  const progress = evaluateHouseMissions(members);
  assert.equal(progress.length, HOUSE_MISSIONS.length);
  const fehler = progress.find((p) => p.id === "fehler-verbessern");
  assert.equal(fehler.current, 110);
  assert.equal(fehler.completed, true);
  const woerter = progress.find((p) => p.id === "woerter-sicher");
  assert.equal(woerter.current, 55);
  assert.equal(woerter.completed, true);
});

test("evaluateHouseMissions: 'gemeinsam-lernen' uses the least-active member, not the sum", () => {
  const members = [
    { ...ZERO_TOTALS, activeDays: 2 },
    { ...ZERO_TOTALS, activeDays: 8 },
  ];
  const progress = evaluateHouseMissions(members);
  const gemeinsam = progress.find((p) => p.id === "gemeinsam-lernen");
  assert.equal(gemeinsam.current, 2);
  assert.equal(gemeinsam.completed, false);
});

test("evaluateHouseMissions: an empty house has zero progress everywhere", () => {
  const progress = evaluateHouseMissions([]);
  assert.ok(progress.every((p) => p.current === 0 && !p.completed));
});
