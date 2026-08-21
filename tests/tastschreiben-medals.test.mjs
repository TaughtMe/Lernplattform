import assert from "node:assert/strict";
import test from "node:test";
import { computeMedal } from "../src/tastschreiben/medals.ts";

function lessons(count, fn) {
  return Array.from({ length: count }, (_, i) => fn(i));
}

test("computeMedal: no medal until every lesson has progress", () => {
  const partial = lessons(10, () => ({ completed: true, bestAccuracy: 100, bestWpm: 50 }));
  assert.equal(computeMedal(partial, 29), "none");
});

test("computeMedal: no medal if any attempted lesson is not completed", () => {
  const all = lessons(29, (i) => ({ completed: i !== 5, bestAccuracy: 100, bestWpm: 50 }));
  assert.equal(computeMedal(all, 29), "none");
});

test("computeMedal: diamond requires every lesson at 100% accuracy", () => {
  const perfect = lessons(29, () => ({ completed: true, bestAccuracy: 100, bestWpm: 20 }));
  assert.equal(computeMedal(perfect, 29), "diamond");

  const almost = lessons(29, (i) => ({ completed: true, bestAccuracy: i === 0 ? 99 : 100, bestWpm: 20 }));
  assert.notEqual(computeMedal(almost, 29), "diamond");
});

test("computeMedal: platinum needs high accuracy and high average wpm, gold needs lower wpm", () => {
  const platinum = lessons(29, () => ({ completed: true, bestAccuracy: 96, bestWpm: 50 }));
  assert.equal(computeMedal(platinum, 29), "platinum");

  const gold = lessons(29, () => ({ completed: true, bestAccuracy: 96, bestWpm: 32 }));
  assert.equal(computeMedal(gold, 29), "gold");
});

test("computeMedal: silver for decent accuracy without meeting the speed bar, bronze otherwise", () => {
  const silver = lessons(29, () => ({ completed: true, bestAccuracy: 92, bestWpm: 10 }));
  assert.equal(computeMedal(silver, 29), "silver");

  const bronze = lessons(29, () => ({ completed: true, bestAccuracy: 70, bestWpm: 10 }));
  assert.equal(computeMedal(bronze, 29), "bronze");
});
