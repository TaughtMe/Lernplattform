import assert from "node:assert/strict";
import test from "node:test";
import { checkAnswer } from "../src/laufdiktat/check-answer.ts";
import { computeStars } from "../src/laufdiktat/scoring.ts";
import { seededShuffle, deterministicOrder } from "../src/laufdiktat/seeded-shuffle.ts";
import { compareVersions } from "../src/laufdiktat/app-version.ts";
import { createDebounced } from "../src/laufdiktat/debounce.ts";
import { animalToFileName, parseStudentName, generateStudentName } from "../src/laufdiktat/animal-names.ts";

test("checkAnswer: plain text is trimmed but otherwise matched exactly", () => {
  const word = { id: "1", kind: "text", targetWord: "Baum" };
  assert.equal(checkAnswer(word, "Baum"), true);
  assert.equal(checkAnswer(word, "baum"), false);
  assert.equal(checkAnswer(word, " Baum "), true);
  assert.equal(checkAnswer(word, "Baume"), false);
});

test("checkAnswer: vocabulary is trimmed, whitespace-normalized, and case-insensitive by default", () => {
  const word = { id: "1", kind: "vocabulary", targetWord: "das Haus", acceptedAnswers: ["die Hütte"] };
  assert.equal(checkAnswer(word, "  DAS   Haus "), true);
  assert.equal(checkAnswer(word, "die hütte"), true);
  assert.equal(checkAnswer(word, "das Auto"), false);
});

test("checkAnswer: vocabulary respects caseSensitive", () => {
  const word = { id: "1", kind: "vocabulary", targetWord: "Berlin", caseSensitive: true };
  assert.equal(checkAnswer(word, "Berlin"), true);
  assert.equal(checkAnswer(word, "berlin"), false);
});

test("checkAnswer: empty input is wrong unless the target word is itself empty", () => {
  assert.equal(checkAnswer({ id: "1", kind: "text", targetWord: "Baum" }, "  "), false);
  assert.equal(checkAnswer({ id: "1", kind: "vocabulary", targetWord: "x" }, ""), false);
});

test("computeStars: no errors is always 5 stars", () => {
  assert.equal(computeStars(0, 10), 5);
  assert.equal(computeStars(0, 0), 5);
});

test("computeStars: scales down with the error rate", () => {
  assert.equal(computeStars(1, 20), 4); // 5%
  assert.equal(computeStars(5, 20), 3); // 25%
  assert.equal(computeStars(10, 20), 2); // 50%
  assert.equal(computeStars(18, 20), 1); // 90%
});

test("seededShuffle: same seed always gives the same order", () => {
  const items = ["a", "b", "c", "d", "e"];
  const first = seededShuffle(items, "room-1234-student-A");
  const second = seededShuffle(items, "room-1234-student-A");
  assert.deepEqual(first, second);
  assert.deepEqual([...first].sort(), [...items].sort());
});

test("seededShuffle: different seeds usually give different orders", () => {
  const items = Array.from({ length: 20 }, (_, i) => i);
  const a = deterministicOrder(20, "seed-A");
  const b = deterministicOrder(20, "seed-B");
  assert.notDeepEqual(a, b);
  void items;
});

test("compareVersions: compares semver-like strings", () => {
  assert.equal(compareVersions("2.0.1", "2.0.0") > 0, true);
  assert.equal(compareVersions("1.0.0", "1.0.0"), 0);
  assert.equal(compareVersions("1.2.0", "1.10.0") < 0, true);
});

test("createDebounced: coalesces bursts into a single call", async () => {
  let calls = 0;
  const debounced = createDebounced(() => { calls += 1; }, { delayMs: 20, maxWaitMs: 200 });
  debounced.schedule();
  debounced.schedule();
  debounced.schedule();
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(calls, 1);
});

test("createDebounced: maxWait fires even under continuous scheduling", async () => {
  let calls = 0;
  const debounced = createDebounced(() => { calls += 1; }, { delayMs: 30, maxWaitMs: 60 });
  const interval = setInterval(() => debounced.schedule(), 10);
  await new Promise((resolve) => setTimeout(resolve, 100));
  clearInterval(interval);
  assert.ok(calls >= 1, "debounced function should have fired despite continuous scheduling");
});

test("animalToFileName: converts umlauts and applies overrides", () => {
  assert.equal(animalToFileName("Chamäleon"), "chameleon");
  assert.equal(animalToFileName("Sphynx-Katze"), "sphynxkatze");
  assert.equal(animalToFileName("Eichhörnchen"), "eichhoernchen");
});

test("parseStudentName: splits adjective from a possibly multi-word animal", () => {
  assert.deepEqual(parseStudentName("Schnelles Nashorn"), { adjective: "Schnelles", animal: "Nashorn" });
  assert.deepEqual(parseStudentName("Mutiger Roter Panda"), { adjective: "Mutiger", animal: "Roter Panda" });
});

test("generateStudentName: always produces 'Adjective Animal'", () => {
  const name = generateStudentName(() => 0);
  assert.match(name, /^\S+ .+$/);
});
