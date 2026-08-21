import assert from "node:assert/strict";
import test from "node:test";
import { ACHIEVEMENTS, evaluateAchievements } from "../src/tastschreiben/achievements.ts";

function baseProgress(overrides = {}) {
  return { lessons: [], totalLessons: 29, bestGameScore: 0, bestGameStreak: 0, bestTimeAttackWpm: 0, ...overrides };
}

test("ACHIEVEMENTS: every id is unique", () => {
  const ids = ACHIEVEMENTS.map((a) => a.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("evaluateAchievements: no progress unlocks nothing", () => {
  assert.deepEqual(evaluateAchievements(baseProgress()), new Set());
});

test("evaluateAchievements: one completed lesson unlocks 'erste-lektion' only", () => {
  const result = evaluateAchievements(baseProgress({ lessons: [{ completed: true, bestAccuracy: 80, bestWpm: 10 }] }));
  assert.deepEqual(result, new Set(["erste-lektion"]));
});

test("evaluateAchievements: ten completed lessons also unlocks 'zehn-lektionen'", () => {
  const lessons = Array.from({ length: 10 }, () => ({ completed: true, bestAccuracy: 80, bestWpm: 10 }));
  const result = evaluateAchievements(baseProgress({ lessons }));
  assert.ok(result.has("erste-lektion"));
  assert.ok(result.has("zehn-lektionen"));
  assert.ok(!result.has("alle-lektionen"), "not all 29 lessons are done yet");
});

test("evaluateAchievements: completing every lesson unlocks 'alle-lektionen'", () => {
  const lessons = Array.from({ length: 29 }, () => ({ completed: true, bestAccuracy: 80, bestWpm: 10 }));
  const result = evaluateAchievements(baseProgress({ lessons, totalLessons: 29 }));
  assert.ok(result.has("alle-lektionen"));
});

test("evaluateAchievements: a single 100% accuracy lesson unlocks 'fehlerfrei-lektion'", () => {
  const result = evaluateAchievements(baseProgress({ lessons: [{ completed: true, bestAccuracy: 100, bestWpm: 10 }] }));
  assert.ok(result.has("fehlerfrei-lektion"));
});

test("evaluateAchievements: five lessons at 95%+ accuracy unlock 'praezisionsserie', four do not", () => {
  const four = Array.from({ length: 4 }, () => ({ completed: true, bestAccuracy: 96, bestWpm: 10 }));
  assert.ok(!evaluateAchievements(baseProgress({ lessons: four })).has("praezisionsserie"));

  const five = Array.from({ length: 5 }, () => ({ completed: true, bestAccuracy: 96, bestWpm: 10 }));
  assert.ok(evaluateAchievements(baseProgress({ lessons: five })).has("praezisionsserie"));
});

test("evaluateAchievements: wpm thresholds unlock 'flotte-finger' and 'blitzschnell' independently", () => {
  const forty = evaluateAchievements(baseProgress({ lessons: [{ completed: true, bestAccuracy: 90, bestWpm: 40 }] }));
  assert.ok(forty.has("flotte-finger"));
  assert.ok(!forty.has("blitzschnell"));

  const sixty = evaluateAchievements(baseProgress({ lessons: [{ completed: true, bestAccuracy: 90, bestWpm: 60 }] }));
  assert.ok(sixty.has("blitzschnell"), "60 wpm should also satisfy the lower 40 wpm badge implicitly checked separately");
});

test("evaluateAchievements: game and time-attack badges are independent of lesson progress", () => {
  const result = evaluateAchievements(baseProgress({ bestGameScore: 120, bestGameStreak: 20, bestTimeAttackWpm: 55 }));
  assert.ok(result.has("regen-fan"));
  assert.ok(result.has("serienkoenig"));
  assert.ok(result.has("zeitrennen-ass"));
});

test("evaluateAchievements: thresholds are not met just below the line", () => {
  const result = evaluateAchievements(baseProgress({ bestGameScore: 99, bestGameStreak: 14, bestTimeAttackWpm: 49 }));
  assert.equal(result.size, 0);
});
