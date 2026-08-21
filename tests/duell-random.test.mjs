import assert from "node:assert/strict";
import test from "node:test";
import { seededShuffle } from "../src/duell/duell-random.ts";

test("seededShuffle: same seed gives the same order every time", () => {
  const items = [1, 2, 3, 4, 5, 6, 7, 8];
  assert.deepEqual(seededShuffle(items, "abc"), seededShuffle(items, "abc"));
});

test("seededShuffle: different seeds usually give different orders", () => {
  const items = [1, 2, 3, 4, 5, 6, 7, 8];
  assert.notDeepEqual(seededShuffle(items, "abc"), seededShuffle(items, "xyz"));
});

test("seededShuffle: is a permutation, never drops or duplicates items", () => {
  const items = ["a", "b", "c", "d", "e"];
  const shuffled = seededShuffle(items, "seed-1");
  assert.deepEqual([...shuffled].sort(), [...items].sort());
});

test("seededShuffle: does not mutate the input array", () => {
  const items = [1, 2, 3];
  const copy = [...items];
  seededShuffle(items, "seed");
  assert.deepEqual(items, copy);
});
