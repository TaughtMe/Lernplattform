import assert from "node:assert/strict";
import test from "node:test";
import { computePoints } from "../src/tastschreiben/scoring.ts";

test("computePoints: perfect accuracy gives the full wpm as points", () => {
  assert.equal(computePoints({ wpm: 30, accuracy: 100 }), 30);
});

test("computePoints: lower accuracy reduces points quadratically", () => {
  const points = computePoints({ wpm: 30, accuracy: 80 });
  assert.equal(points, Math.round(30 * 0.8 ** 2));
  assert.ok(points < 30);
});

test("computePoints: zero accuracy gives zero points regardless of speed", () => {
  assert.equal(computePoints({ wpm: 50, accuracy: 0 }), 0);
});

test("computePoints: a first-time lesson completion adds the bonus", () => {
  const normal = computePoints({ wpm: 30, accuracy: 100 }, false);
  const first = computePoints({ wpm: 30, accuracy: 100 }, true);
  assert.equal(first, normal + 20);
});

test("computePoints: absurdly high wpm is capped, never negative for wpm 0", () => {
  assert.ok(computePoints({ wpm: 100000, accuracy: 100 }) < 1000);
  assert.equal(computePoints({ wpm: 0, accuracy: 100 }), 0);
});
