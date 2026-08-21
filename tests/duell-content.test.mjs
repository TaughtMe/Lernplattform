import assert from "node:assert/strict";
import test from "node:test";
import { assembleDuellContent } from "../src/duell/duell-content.ts";

function item(id, promptText, answerText, overrides = {}) {
  return {
    kind: "vocabulary",
    id,
    prompt: { text: promptText, locale: "de" },
    answer: { text: answerText, locale: "en" },
    tagIds: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function candidate(id, promptText, answerText, minWritingBox = 1) {
  return { item: item(id, promptText, answerText), minWritingBox };
}

test("assembleDuellContent: empty input gives an empty round", () => {
  assert.deepEqual(assembleDuellContent("herausforderer-stapel", [], "seed"), []);
  assert.deepEqual(assembleDuellContent("herausforderer-stapel", [[]], "seed"), []);
});

test("herausforderer-stapel: takes only the challenger's own words, up to the round size", () => {
  const challenger = [candidate("1", "the house", "das Haus"), candidate("2", "the car", "das Auto")];
  const words = assembleDuellContent("herausforderer-stapel", [challenger], "seed", 1);
  assert.equal(words.length, 1);
  assert.equal(words[0].itemId, "1");
});

test("wechselduell: takes half from each participant, no overlap by fingerprint", () => {
  const a = [candidate("1", "the house", "das Haus"), candidate("2", "the car", "das Auto")];
  const b = [candidate("3", "the tree", "der Baum"), candidate("4", "the dog", "der Hund")];
  const words = assembleDuellContent("wechselduell", [a, b], "seed", 4);
  assert.deepEqual(words.map((w) => w.itemId).sort(), ["1", "2", "3", "4"]);
});

test("wechselduell: a word both participants share counts only once", () => {
  const a = [candidate("1", "the house", "das Haus")];
  const b = [candidate("1dup", "The House", "Das Haus")]; // same fingerprint after normalization
  const words = assembleDuellContent("wechselduell", [a, b], "seed", 4);
  assert.equal(words.length, 1);
});

test("schwierige-woerter: sorts by lowest box first across all participants", () => {
  const a = [candidate("easy", "the house", "das Haus", 4)];
  const b = [candidate("hard", "the car", "das Auto", 1)];
  const words = assembleDuellContent("schwierige-woerter", [a, b], "seed", 2);
  assert.deepEqual(words.map((w) => w.itemId), ["hard", "easy"]);
});

test("zufaellige-woerter: same seed gives the same selection/order twice", () => {
  const pool = [candidate("1", "a", "1"), candidate("2", "b", "2"), candidate("3", "c", "3"), candidate("4", "d", "4")];
  const first = assembleDuellContent("zufaellige-woerter", [pool], "same-seed", 2);
  const second = assembleDuellContent("zufaellige-woerter", [pool], "same-seed", 2);
  assert.deepEqual(first, second);
  assert.equal(first.length, 2);
});

test("assembleDuellContent: each duel word carries prompt/answer/alternatives", () => {
  const withAlternatives = candidate("1", "the house", "das Haus");
  withAlternatives.item.answer.alternatives = ["das Zuhause"];
  const words = assembleDuellContent("herausforderer-stapel", [[withAlternatives]], "seed");
  assert.deepEqual(words[0], {
    itemId: "1",
    prompt: "the house",
    promptLocale: "de",
    answer: "das Haus",
    answerLocale: "en",
    alternatives: ["das Zuhause"],
  });
});
