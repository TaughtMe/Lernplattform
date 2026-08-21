import assert from "node:assert/strict";
import test from "node:test";
import { generateDrillText, generateWords, generateSentences, pickFreeText, generatePracticeText } from "../src/tastschreiben/text-generator.ts";
import { LESSONS, lessonById } from "../src/tastschreiben/curriculum.ts";

test("generateDrillText: only uses characters from the available pool", () => {
  const text = generateDrillText({ newKeys: ["a", "s"], availableKeys: ["a", "s", "d", "f"], length: 40, seed: "seed-1" });
  const used = new Set(text.replace(/ /g, ""));
  for (const ch of used) assert.ok(["a", "s", "d", "f"].includes(ch), `unexpected character "${ch}"`);
});

test("generateDrillText: reaches roughly the requested length", () => {
  const text = generateDrillText({ newKeys: ["a"], availableKeys: ["a", "s"], length: 60, seed: "seed-2" });
  const charCount = text.replace(/ /g, "").length;
  assert.ok(charCount >= 60, `expected at least 60 characters, got ${charCount}`);
});

test("generateDrillText: is deterministic for the same seed", () => {
  const opts = { newKeys: ["a", "s"], availableKeys: ["a", "s", "d", "f"], length: 30, seed: "same-seed" };
  assert.equal(generateDrillText(opts), generateDrillText(opts));
});

test("generateDrillText: different seeds very likely produce different text", () => {
  const a = generateDrillText({ newKeys: ["a", "s", "d", "f"], availableKeys: ["a", "s", "d", "f"], length: 40, seed: "x" });
  const b = generateDrillText({ newKeys: ["a", "s", "d", "f"], availableKeys: ["a", "s", "d", "f"], length: 40, seed: "y" });
  assert.notEqual(a, b);
});

test("generateDrillText: introducesShift produces only uppercase letters", () => {
  const text = generateDrillText({
    newKeys: [],
    availableKeys: ["a", "s", "d", "f"],
    introducesShift: true,
    length: 20,
    seed: "shift-seed",
  });
  const letters = text.replace(/ /g, "");
  assert.ok(letters.length > 0);
  assert.equal(letters, letters.toUpperCase());
});

test("generateWords: only ever produces lowercase words from the curated list", () => {
  const text = generateWords(10, "w-seed");
  const words = text.split(" ");
  assert.equal(words.length, 10);
  assert.equal(text, text.toLowerCase());
});

test("generateSentences: joins the requested number of curated sentences", () => {
  const text = generateSentences(3, "s-seed");
  // Each curated sentence ends in a period, so there should be at least 3 of them.
  assert.ok((text.match(/\./g) || []).length >= 3);
});

test("pickFreeText: returns a non-empty paragraph, deterministic per seed", () => {
  const a = pickFreeText("free-seed");
  const b = pickFreeText("free-seed");
  assert.ok(a.length > 50);
  assert.equal(a, b);
});

test("generatePracticeText: dispatches correctly for every lesson kind without throwing", () => {
  for (const lesson of LESSONS) {
    const text = generatePracticeText(lesson, `seed-for-${lesson.id}`);
    assert.ok(text.length > 0, `${lesson.id} produced empty text`);
  }
});

test("generatePracticeText: a drill lesson's text only contains characters available by that lesson", () => {
  const lesson = lessonById("obere-reihe-links");
  const text = generatePracticeText(lesson, "drill-check");
  const used = new Set(text.replace(/ /g, ""));
  const allowed = new Set(["a", "s", "d", "f", "j", "k", "l", "ö", "g", "h", "q", "w", "e", "r", "t"]);
  for (const ch of used) assert.ok(allowed.has(ch), `"${ch}" should not appear yet in ${lesson.id}`);
});
