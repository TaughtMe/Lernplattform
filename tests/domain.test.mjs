import assert from "node:assert/strict";
import test from "node:test";
import { applyReview, applyWordReview, newLearningProgress, visibleBox } from "../src/domain/leitner.ts";
import { checkAnswer, generateMath, parseVocabularyPairs, splitSections, wrongWords, spellingSetFor } from "../src/domain/dictation.ts";
import { hit, newRun, runInfo } from "../src/domain/typing.ts";
import { acceptLetter, creditPoints, decodeLetter, encodeLetter, floors } from "../src/domain/houses.ts";

const now = new Date("2026-09-28T10:00:00Z");
const dir = "prompt-to-answer";

test("Leitner: richtig steigt eine Box, höchstens einmal pro Runde", () => {
  let p = newLearningProgress("a", now);
  p = applyReview(p, dir, "writing", "correct", now);
  assert.equal(visibleBox(p, dir, "writing"), 2);
  p = applyReview(p, dir, "writing", "correct", now, true);
  assert.equal(visibleBox(p, dir, "writing"), 2);
});

test("Leitner: gewusst aber falsch geschrieben → Bedeutung bleibt, Schreiben fällt", () => {
  let p = newLearningProgress("a", now);
  p = applyReview(p, dir, "writing", "correct", now);
  p = applyReview(p, dir, "writing", "correct", now);
  p = applyReview(p, dir, "writing", "misspelled", now);
  assert.equal(visibleBox(p, dir, "oral"), 3);
  assert.equal(visibleBox(p, dir, "writing"), 1);
});

test("Leitner: Hilfe verhindert Aufstieg, Fehler setzt auf Box 1", () => {
  let p = newLearningProgress("a", now);
  p = applyReview(p, dir, "writing", "correct", now);
  p = applyReview(p, dir, "writing", "helped", now);
  assert.equal(visibleBox(p, dir, "writing"), 2);
  p = applyReview(p, dir, "writing", "wrong", now);
  assert.equal(visibleBox(p, dir, "writing"), 1);
  assert.equal(visibleBox(p, dir, "oral"), 1);
  const w = applyWordReview({ box: 3, dueAt: now.toISOString(), wrongCount: 0 }, "wrong", now);
  assert.deepEqual([w.box, w.wrongCount], [1, 1]);
});

test("Diktat: Abschnitte, Prüfen und wortweiser Vergleich", () => {
  assert.deepEqual(splitSections("Der Hund bellt. Die Katze schläft!\nAm Abend.", "satz"), ["Der Hund bellt.", "Die Katze schläft!", "Am Abend."]);
  assert.deepEqual(splitSections("a b\nc", "zeile"), ["a b", "c"]);
  assert.equal(checkAnswer({ id: "1", kind: "text", targetWord: "Der Hund.", isCompleted: false }, " Der  Hund. "), true);
  assert.equal(checkAnswer({ id: "1", kind: "vocabulary", targetWord: "already", isCompleted: false }, "Already"), true);
  assert.equal(checkAnswer({ id: "1", kind: "math", prompt: "2 + 2 =", targetWord: "4", isCompleted: false }, "4,0"), true);
  assert.deepEqual(wrongWords("Der Hund bellt laut im Hof.", "Der Hunt bellt laut in Hof"), ["Hund", "im"]);
  assert.equal(spellingSetFor("Katze"), "cktz");
  assert.equal(spellingSetFor("Hund"), "verl");
  assert.equal(parseVocabularyPairs("schon; already\nnoch nicht; not yet/yet not")[1].acceptedAnswers[0], "yet not");
  const math = generateMath([":"], 10, 20, () => 0.5);
  assert.ok(math.every((m) => Number.isInteger(Number(m.targetWord))));
});

test("Tastenwelt: strenger Modus wartet auf die richtige Taste", () => {
  let run = newRun("ab");
  run = hit(run, "x", 1000);
  assert.equal(run.pos, 0);
  assert.equal(run.errors, 1);
  run = hit(run, "a", 1100);
  run = hit(run, "b", 1200);
  const info = runInfo(run);
  assert.equal(info.done, true);
  assert.equal(info.accuracy, 67);
});

test("Häuser: Tageslimit, Stockwerke und Leistungsbrief", () => {
  assert.equal(creditPoints(120, 60), 30);
  assert.equal(creditPoints(150, 10), 0);
  assert.equal(floors(410), 8);
  const letter = { v: 1, c: "k", m: "m1", h: "orca", w: "2026-W40", s: 2, hp: 120 };
  const code = encodeLetter(letter);
  const decoded = decodeLetter(code);
  assert.equal(decoded.ok, true);
  assert.equal(decodeLetter(code.replace(/.$/, "x")).ok, false);
  let res = acceptLetter({}, letter, "k");
  assert.equal(res.status, "neu");
  assert.equal(acceptLetter(res.inbox, letter, "k").status, "doppelt");
  assert.equal(acceptLetter(res.inbox, { ...letter, s: 1 }, "k").status, "veraltet");
  assert.equal(acceptLetter(res.inbox, { ...letter, s: 3 }, "k").status, "aktualisiert");
  assert.equal(acceptLetter(res.inbox, letter, "andere").status, "klassenfremd");
});
