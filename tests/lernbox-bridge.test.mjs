import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import test from "node:test";
import { vocabularyWordsToBundle } from "../src/laufdiktat/lernbox-bridge.ts";
import { isLearningBundleV1, vocabularyFingerprint } from "../src/domain/learning-bundle.ts";
import { LOCAL_DATA_AREAS } from "../src/storage/local-data-boundaries.ts";
import { createIndexedDbRepositoryFactory } from "../src/storage/indexeddb-repository.ts";
import { createLernBoxService } from "../src/domain/lernbox-service.ts";

const NOW = "2026-08-20T10:00:00.000Z";

test("vocabularyWordsToBundle: returns null when there is no vocabulary content", () => {
  const words = [{ id: "1", kind: "text", targetWord: "Baum" }, { id: "2", kind: "math", targetWord: "8", prompt: "4+4" }];
  assert.equal(vocabularyWordsToBundle(words, "Stapel", NOW), null);
});

test("vocabularyWordsToBundle: builds a valid LearningBundleV1 from vocabulary words only", () => {
  const words = [
    { id: "1", kind: "vocabulary", prompt: "the house", targetWord: "das Haus" },
    { id: "2", kind: "text", targetWord: "Baum" },
    { id: "3", kind: "vocabulary", prompt: "the car", targetWord: "das Auto", acceptedAnswers: ["der Wagen"] },
  ];
  const bundle = vocabularyWordsToBundle(words, "Aus dem Laufdiktat", NOW);
  assert.ok(isLearningBundleV1(bundle));
  assert.equal(bundle.vocabulary.length, 2, "the text word is not vocabulary and must be excluded");
  assert.equal(bundle.stacks.length, 1);
  assert.equal(bundle.stacks[0].title, "Aus dem Laufdiktat");
  assert.deepEqual(bundle.stacks[0].itemIds.sort(), bundle.vocabulary.map((v) => v.id).sort());

  const car = bundle.vocabulary.find((v) => v.prompt.text === "the car");
  assert.deepEqual(car.answer.alternatives, ["der Wagen"]);
});

test("vocabularyWordsToBundle: fingerprints match what LernBox's own dedup would compute", () => {
  const words = [{ id: "1", kind: "vocabulary", prompt: "the house", targetWord: "das Haus" }];
  const bundle = vocabularyWordsToBundle(words, "Stapel", NOW);
  const fp = vocabularyFingerprint(bundle.vocabulary[0]);
  assert.equal(fp, "the house::das haus");
});

test("end to end: a finished Laufdiktat vocabulary round lands in the LernBox, deduplicated on a repeat", async () => {
  await new Promise((resolve) => {
    const request = indexedDB.deleteDatabase(LOCAL_DATA_AREAS.personal);
    request.onsuccess = resolve;
    request.onerror = resolve;
    request.onblocked = resolve;
  });
  const service = createLernBoxService(createIndexedDbRepositoryFactory());

  const words = [
    { id: "1", kind: "vocabulary", prompt: "the house", targetWord: "das Haus" },
    { id: "2", kind: "vocabulary", prompt: "the car", targetWord: "das Auto" },
  ];
  const bundle = vocabularyWordsToBundle(words, "Laufdiktat · Testtag", NOW);
  const first = await service.importBundle(bundle);
  assert.deepEqual(first, { importedItems: 2, importedStacks: 1 });

  const stacks = await service.listStacks();
  assert.equal(stacks.length, 1);
  assert.equal(stacks[0].title, "Laufdiktat · Testtag");
  assert.equal((await service.listItems(stacks[0].id)).length, 2);

  // The same round finishing again (e.g. a second student, or a retry) must not duplicate vocabulary.
  const bundleAgain = vocabularyWordsToBundle(words, "Laufdiktat · Testtag (2)", NOW);
  const second = await service.importBundle(bundleAgain);
  assert.deepEqual(second, { importedItems: 0, importedStacks: 1 }, "vocabulary is deduplicated globally, even though it's a new stack");
  assert.equal((await service.listItems((await service.listStacks()).find((s) => s.title.includes("(2)")).id)).length, 2, "the new stack still references the (shared) existing items");
});
