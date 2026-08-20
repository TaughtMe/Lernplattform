import assert from "node:assert/strict";
import test from "node:test";
import { karaokeHighlight } from "../src/laufdiktat/typing-highlight.ts";

test("karaokeHighlight: empty typed input gives no characters", () => {
  assert.deepEqual(karaokeHighlight("Haus", ""), []);
});

test("karaokeHighlight: marks each typed character correct or wrong against the target", () => {
  assert.deepEqual(karaokeHighlight("Haus", "Hau"), [
    { char: "H", correct: true },
    { char: "a", correct: true },
    { char: "u", correct: true },
  ]);
  assert.deepEqual(karaokeHighlight("Haus", "Hxu"), [
    { char: "H", correct: true },
    { char: "x", correct: false },
    { char: "u", correct: true },
  ]);
});

test("karaokeHighlight: never reveals untyped characters of the target", () => {
  const result = karaokeHighlight("Elefant", "El");
  assert.equal(result.length, 2, "only the two typed characters are reported, nothing beyond");
});

test("karaokeHighlight: typing past the target's length marks the overflow as wrong", () => {
  const result = karaokeHighlight("Ei", "Eier");
  assert.deepEqual(result, [
    { char: "E", correct: true },
    { char: "i", correct: true },
    { char: "e", correct: false },
    { char: "r", correct: false },
  ]);
});
