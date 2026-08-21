import assert from "node:assert/strict";
import test from "node:test";
import { LESSONS, availableKeysThrough, lessonById, lessonIndex, isLessonUnlocked } from "../src/tastschreiben/curriculum.ts";
import { KEYBOARD_ROWS } from "../src/tastschreiben/keyboard-layout.ts";

test("lessonById / lessonIndex: find lessons by id", () => {
  assert.equal(lessonById("grundstellung-zeigefinger").title, "Grundstellung: Zeigefinger");
  assert.equal(lessonIndex("grundstellung-zeigefinger"), 0);
  assert.equal(lessonById("does-not-exist"), undefined);
  assert.equal(lessonIndex("does-not-exist"), -1);
});

test("availableKeysThrough: accumulates only up to and including the given lesson", () => {
  const afterFirst = availableKeysThrough("grundstellung-zeigefinger");
  assert.deepEqual(afterFirst.sort(), ["f", "j"]);

  const afterFourth = availableKeysThrough("grundstellung-kleinfinger");
  assert.deepEqual(afterFourth.sort(), ["a", "d", "f", "j", "k", "l", "s", "ö"]);
});

test("availableKeysThrough: a combo lesson with no new keys does not lose earlier ones", () => {
  const beforeCombo = availableKeysThrough("grundstellung-kleinfinger").length;
  const afterCombo = availableKeysThrough("grundreihe-leertaste").length;
  assert.equal(afterCombo, beforeCombo + 1, "only space is added by the combo lesson");
});

test("every physical key on the keyboard is introduced as a newKey in exactly one lesson by the end of 'satzzeichen'", () => {
  const allBases = new Set(KEYBOARD_ROWS.flat().map((k) => k.base));
  const introduced = new Map();
  for (const lesson of LESSONS) {
    for (const key of lesson.newKeys) {
      assert.equal(introduced.has(key), false, `"${key}" introduced twice (also in ${introduced.get(key)})`);
      introduced.set(key, lesson.id);
    }
    if (lesson.id === "satzzeichen") break;
  }
  for (const base of allBases) {
    assert.ok(introduced.has(base), `"${base}" is never introduced as a newKey`);
  }
});

test("isLessonUnlocked: the first lesson is always unlocked", () => {
  assert.equal(isLessonUnlocked(LESSONS[0].id, new Set()), true);
});

test("isLessonUnlocked: a later lesson is locked until the previous one is completed", () => {
  const secondId = LESSONS[1].id;
  assert.equal(isLessonUnlocked(secondId, new Set()), false);
  assert.equal(isLessonUnlocked(secondId, new Set([LESSONS[0].id])), true);
});

test("isLessonUnlocked: completing an earlier lesson does not unlock one further ahead", () => {
  const thirdId = LESSONS[2].id;
  assert.equal(isLessonUnlocked(thirdId, new Set([LESSONS[0].id])), false);
});

test("lessons after 'satzzeichen' (words/sentences/free-text) introduce no new keys of their own", () => {
  const idx = lessonIndex("satzzeichen");
  for (const lesson of LESSONS.slice(idx + 1)) {
    assert.deepEqual(lesson.newKeys, [], `${lesson.id} should rely on already-taught keys`);
  }
});
