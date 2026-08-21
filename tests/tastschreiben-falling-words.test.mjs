import assert from "node:assert/strict";
import test from "node:test";
import {
  initGame,
  spawnWord,
  tick,
  typeChar,
  fallDurationMs,
  pickSpawnPool,
  LANES,
  STARTING_LIVES,
} from "../src/tastschreiben/falling-words-game.ts";
import { LESSONS } from "../src/tastschreiben/curriculum.ts";

test("initGame: starts empty, full lives, no game over", () => {
  const s = initGame();
  assert.deepEqual(s.words, []);
  assert.equal(s.lives, STARTING_LIVES);
  assert.equal(s.score, 0);
  assert.equal(s.gameOver, false);
});

test("fallDurationMs: gets faster over time but never below the minimum", () => {
  const early = fallDurationMs(0);
  const late = fallDurationMs(200000);
  assert.ok(late < early, `expected later fall duration (${late}) to be shorter than early (${early})`);
  assert.ok(late >= 3500);
});

test("spawnWord: adds a word to a free lane", () => {
  let s = initGame();
  s = spawnWord(s, "haus");
  assert.equal(s.words.length, 1);
  assert.equal(s.words[0].word, "haus");
  assert.equal(s.words[0].typed, 0);
});

test("spawnWord: does nothing once all lanes are full", () => {
  let s = initGame();
  for (let i = 0; i < LANES; i++) s = spawnWord(s, `w${i}`);
  assert.equal(s.words.length, LANES);
  const after = spawnWord(s, "overflow");
  assert.equal(after.words.length, LANES, "no room for another word");
});

test("tick: advances progress and eventually removes a word that reaches the bottom, costing a life", () => {
  let s = spawnWord(initGame(), "hi");
  const fallMs = s.words[0].fallMs;
  s = tick(s, fallMs + 100);
  assert.equal(s.words.length, 0, "the word reached the bottom and was removed");
  assert.equal(s.lives, STARTING_LIVES - 1);
});

test("tick: three missed words end the game", () => {
  let s = initGame();
  for (let i = 0; i < STARTING_LIVES; i++) {
    s = spawnWord(s, "x");
    s = tick(s, s.words[0].fallMs + 100);
  }
  assert.equal(s.gameOver, true);
  assert.equal(s.lives, 0);
});

test("typeChar: correct letters complete a word, remove it, and add to the score", () => {
  let s = spawnWord(initGame(), "hi");
  s = typeChar(s, "h");
  assert.equal(s.words[0].typed, 1);
  s = typeChar(s, "i");
  assert.equal(s.words.length, 0, "the finished word is removed");
  assert.equal(s.score, 2);
  assert.equal(s.streak, 1);
});

test("typeChar: a wrong letter for the active word is ignored, progress is not lost", () => {
  let s = spawnWord(initGame(), "hi");
  s = typeChar(s, "h");
  s = typeChar(s, "x");
  assert.equal(s.words[0].typed, 1, "the wrong key did not reset progress");
});

test("typeChar: with two words on screen, typing picks the one whose first letter matches", () => {
  let s = spawnWord(initGame(), "haus");
  s = spawnWord(s, "baum");
  s = typeChar(s, "b");
  const active = s.words.find((w) => w.id === s.activeWordId);
  assert.equal(active.word, "baum");
});

test("typeChar: once a word is missed, its life-cost resets the streak", () => {
  let s = spawnWord(initGame(), "hi");
  s = typeChar(s, "h");
  s = typeChar(s, "i");
  assert.equal(s.streak, 1);
  s = spawnWord(s, "x");
  s = tick(s, s.words[0].fallMs + 100);
  assert.equal(s.streak, 0, "a miss resets the streak");
});

test("typeChar: does nothing once the game is over", () => {
  let s = initGame();
  s = spawnWord(s, "x");
  s = tick(s, s.words[0].fallMs + 100);
  s = spawnWord(s, "y");
  s = tick(s, s.words[0].fallMs + 100);
  s = spawnWord(s, "z");
  s = tick(s, s.words[0].fallMs + 100);
  assert.equal(s.gameOver, true);
  const after = typeChar(s, "a");
  assert.equal(after, s);
});

test("pickSpawnPool: before all keys are known, only produces words from the available key pool", () => {
  const completed = new Set([LESSONS[0].id, LESSONS[1].id]);
  const pool = pickSpawnPool(completed, "pool-seed");
  assert.ok(pool.length > 0);
  const allowedChars = new Set(LESSONS[0].newKeys.concat(LESSONS[1].newKeys));
  for (const word of pool) {
    for (const ch of word) assert.ok(allowedChars.has(ch), `"${ch}" in "${word}" not yet taught`);
  }
});

test("pickSpawnPool: once all keys are known, produces real curated words", () => {
  const allDrillIds = LESSONS.filter((l) => l.kind === "drill").map((l) => l.id);
  const pool = pickSpawnPool(new Set(allDrillIds), "pool-seed-2");
  assert.ok(pool.includes("haus") || pool.includes("baum") || pool.length > 0);
  // Real words are longer on average than the 2-4 character synthetic drill pool.
  const avgLen = pool.reduce((sum, w) => sum + w.length, 0) / pool.length;
  assert.ok(avgLen > 3);
});

test("pickSpawnPool: is deterministic for the same seed", () => {
  const completed = new Set([LESSONS[0].id]);
  assert.deepEqual(pickSpawnPool(completed, "same"), pickSpawnPool(completed, "same"));
});
