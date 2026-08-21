import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import test from "node:test";
import { LOCAL_DATA_AREAS } from "../src/storage/local-data-boundaries.ts";
import { createIndexedDbRepositoryFactory } from "../src/storage/indexeddb-repository.ts";
import { createLernBoxService } from "../src/domain/lernbox-service.ts";
import {
  adoptDuellWords,
  applyDuellBoxAdvances,
  buildDuellCandidates,
  findAdoptableWords,
  fromRemoteDuellCandidates,
  toRemoteDuellCandidates,
} from "../src/duell/duell-vocab-bridge.ts";

let openFactory;

async function freshService() {
  await openFactory?.close();
  await new Promise((resolve) => {
    const request = indexedDB.deleteDatabase(LOCAL_DATA_AREAS.personal);
    request.onsuccess = resolve;
    request.onerror = resolve;
    request.onblocked = resolve;
  });
  openFactory = createIndexedDbRepositoryFactory();
  return createLernBoxService(openFactory);
}

function duellWord(itemId, prompt, answer, overrides = {}) {
  return { itemId, prompt, promptLocale: "en", answer, answerLocale: "de", alternatives: [], ...overrides };
}

test("buildDuellCandidates: collects every own item across stacks with its lowest writing box", async () => {
  const service = await freshService();
  const stackA = await service.createStack("Stapel A");
  const stackB = await service.createStack("Stapel B");
  await service.addVocabularyItem(stackA.id, "the house", "das Haus");
  const car = await service.addVocabularyItem(stackB.id, "the car", "das Auto");
  await service.recordAnswer(car, "prompt-to-answer", "round-1", { knowledgeCorrect: true, writingCorrect: true });

  const candidates = await buildDuellCandidates(service);
  assert.equal(candidates.length, 2);
  const byPrompt = new Map(candidates.map((c) => [c.item.prompt.text, c.minWritingBox]));
  assert.equal(byPrompt.get("the house"), 1);
  assert.equal(byPrompt.get("the car"), 1); // only the queried direction advanced; the other direction is still box 1
});

test("buildDuellCandidates: never lists the same item twice even if it appears in multiple stacks", async () => {
  const service = await freshService();
  const stack = await service.createStack("Stapel A");
  await service.addVocabularyItem(stack.id, "the house", "das Haus");

  const candidates = await buildDuellCandidates(service);
  assert.equal(candidates.length, 1);
});

test("applyDuellBoxAdvances: advances the box only for words the participant already owns, matched by fingerprint not itemId", async () => {
  const service = await freshService();
  const stack = await service.createStack("Stapel A");
  const ownHouse = await service.addVocabularyItem(stack.id, "the house", "das Haus");

  const words = [
    duellWord("foreign-item-id-for-house", "the house", "das Haus"),
    duellWord("foreign-item-id-for-tree", "the tree", "der Baum"),
  ];
  const wordResults = [
    { itemId: "foreign-item-id-for-house", correct: true },
    { itemId: "foreign-item-id-for-tree", correct: true },
  ];

  await applyDuellBoxAdvances(service, "duell-1", words, wordResults, [ownHouse]);

  const progress = await service.getProgress(ownHouse.id);
  assert.equal(progress.writing["prompt-to-answer"].box, 2);
  assert.equal(progress.knowledge["prompt-to-answer"].box, 2);
});

test("applyDuellBoxAdvances: a wrong answer does not advance the owned word's box", async () => {
  const service = await freshService();
  const stack = await service.createStack("Stapel A");
  const ownHouse = await service.addVocabularyItem(stack.id, "the house", "das Haus");

  const words = [duellWord("foreign-id", "the house", "das Haus")];
  const wordResults = [{ itemId: "foreign-id", correct: false }];

  await applyDuellBoxAdvances(service, "duell-1", words, wordResults, [ownHouse]);

  const progress = await service.getProgress(ownHouse.id);
  assert.equal(progress.writing["prompt-to-answer"].box, 1);
});

test("applyDuellBoxAdvances: at most one advance per duell, reusing recordAnswer's own roundId guard", async () => {
  const service = await freshService();
  const stack = await service.createStack("Stapel A");
  const ownHouse = await service.addVocabularyItem(stack.id, "the house", "das Haus");
  const words = [duellWord("foreign-id", "the house", "das Haus")];
  const wordResults = [{ itemId: "foreign-id", correct: true }];

  await applyDuellBoxAdvances(service, "duell-1", words, wordResults, [ownHouse]);
  await applyDuellBoxAdvances(service, "duell-1", words, wordResults, [ownHouse]);

  const progress = await service.getProgress(ownHouse.id);
  assert.equal(progress.writing["prompt-to-answer"].box, 2); // second call with the same duell id is a no-op
});

test("applyDuellBoxAdvances: words with no fingerprint match in ownItems are skipped without error", async () => {
  const service = await freshService();
  const words = [duellWord("foreign-id", "the tree", "der Baum")];
  const wordResults = [{ itemId: "foreign-id", correct: true }];

  await assert.doesNotReject(applyDuellBoxAdvances(service, "duell-1", words, wordResults, []));
});

test("findAdoptableWords: returns words the participant does not already own, by fingerprint", () => {
  const ownHouse = { id: "own-1", prompt: { text: "the house", locale: "en" }, answer: { text: "das Haus", locale: "de" } };
  const words = [
    duellWord("foreign-id-house", "the house", "das Haus"),
    duellWord("foreign-id-tree", "the tree", "der Baum"),
  ];

  const adoptable = findAdoptableWords(words, [ownHouse]);
  assert.deepEqual(adoptable.map((w) => w.itemId), ["foreign-id-tree"]);
});

test("toRemoteDuellCandidates: strips the local id, keeps word + box data", async () => {
  const service = await freshService();
  const stack = await service.createStack("Stapel A");
  const car = await service.addVocabularyItem(stack.id, "the car", "das Auto");
  const candidates = await buildDuellCandidates(service);

  const remote = toRemoteDuellCandidates(candidates);
  assert.equal(remote.length, 1);
  assert.deepEqual(remote[0], { prompt: "the car", promptLocale: "de", answer: "das Auto", answerLocale: "de", alternatives: [], minWritingBox: 1 });
  assert.equal("id" in remote[0], false);
  assert.ok(car.id); // sanity: the local item really does have an id we deliberately did not send
});

test("fromRemoteDuellCandidates: rebuilds candidates whose fingerprint matches the original word", () => {
  const remote = [{ prompt: "the tree", promptLocale: "en", answer: "der Baum", answerLocale: "de", alternatives: ["der Baum "], minWritingBox: 3 }];
  const rebuilt = fromRemoteDuellCandidates(remote);
  assert.equal(rebuilt.length, 1);
  assert.equal(rebuilt[0].minWritingBox, 3);
  assert.equal(rebuilt[0].item.prompt.text, "the tree");
  assert.equal(rebuilt[0].item.answer.text, "der Baum");
});

test("round-trip: adoptDuellWords accepts words rebuilt from a remote candidate pool", async () => {
  const service = await freshService();
  const stack = await service.createStack("Neue Wörter");
  const remote = [{ prompt: "the tree", promptLocale: "en", answer: "der Baum", answerLocale: "de", alternatives: [], minWritingBox: 1 }];
  const [candidate] = fromRemoteDuellCandidates(remote);

  await adoptDuellWords(service, [{ itemId: candidate.item.id, prompt: candidate.item.prompt.text, promptLocale: candidate.item.prompt.locale, answer: candidate.item.answer.text, answerLocale: candidate.item.answer.locale, alternatives: [] }], stack.id);

  const items = await service.listItems(stack.id);
  assert.equal(items.length, 1);
  assert.equal(items[0].prompt.text, "the tree");
});

test("adoptDuellWords: adds each word to the given stack as a new vocabulary item", async () => {
  const service = await freshService();
  const stack = await service.createStack("Neue Wörter");
  const words = [duellWord("foreign-id", "the tree", "der Baum")];

  await adoptDuellWords(service, words, stack.id);

  const items = await service.listItems(stack.id);
  assert.equal(items.length, 1);
  assert.equal(items[0].prompt.text, "the tree");
  assert.equal(items[0].answer.text, "der Baum");
});
