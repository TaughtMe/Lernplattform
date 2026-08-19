import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import test from "node:test";
import { LOCAL_DATA_AREAS } from "../src/storage/local-data-boundaries.ts";
import { createIndexedDbRepositoryFactory } from "../src/storage/indexeddb-repository.ts";
import { createLernBoxService } from "../src/domain/lernbox-service.ts";

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

test("creates a stack and adds vocabulary to it", async () => {
  const service = await freshService();
  const stack = await service.createStack("Englisch Unit 3");
  await service.addVocabularyItem(stack.id, "the house", "das Haus");
  await service.addVocabularyItem(stack.id, "the car", "das Auto");

  const items = await service.listItems(stack.id);
  assert.equal(items.length, 2);
  assert.deepEqual(items.map((item) => item.prompt.text).sort(), ["the car", "the house"]);
});

test("does not add the same vocabulary pair to a stack twice", async () => {
  const service = await freshService();
  const stack = await service.createStack("Englisch Unit 3");
  await service.addVocabularyItem(stack.id, "the house", "das Haus");
  const duplicate = await service.addVocabularyItem(stack.id, "  The House  ", "Das Haus");

  assert.equal(duplicate, undefined);
  assert.equal((await service.listItems(stack.id)).length, 1);
});

test("a freshly added word is due for practice in both directions", async () => {
  const service = await freshService();
  const stack = await service.createStack("Englisch Unit 3");
  await service.addVocabularyItem(stack.id, "the house", "das Haus");

  const due = await service.dueQueue();
  assert.equal(due.length, 2);
  assert.deepEqual(due.map((entry) => entry.direction).sort(), ["answer-to-prompt", "prompt-to-answer"]);
});

test("a correct, self-reliant answer advances the box and removes the word from the due queue", async () => {
  const service = await freshService();
  const stack = await service.createStack("Englisch Unit 3");
  const item = await service.addVocabularyItem(stack.id, "the house", "das Haus");

  const roundId = "round-1";
  const progress = await service.recordAnswer(item, "prompt-to-answer", roundId, { knowledgeCorrect: true, writingCorrect: true });
  assert.equal(progress.knowledge["prompt-to-answer"].box, 2);
  assert.equal(progress.writing["prompt-to-answer"].box, 2);

  const due = await service.dueQueue();
  assert.equal(due.some((entry) => entry.direction === "prompt-to-answer"), false, "prompt-to-answer is no longer due right after advancing");
});

test("a wrong meaning keeps the word due and resets its box", async () => {
  const service = await freshService();
  const stack = await service.createStack("Englisch Unit 3");
  const item = await service.addVocabularyItem(stack.id, "the house", "das Haus");

  await service.recordAnswer(item, "prompt-to-answer", "round-1", { knowledgeCorrect: true, writingCorrect: true });
  const progress = await service.recordAnswer(item, "prompt-to-answer", "round-2", { knowledgeCorrect: false, writingCorrect: false });

  assert.equal(progress.knowledge["prompt-to-answer"].box, 1);
  const due = await service.dueQueue();
  assert.ok(due.some((entry) => entry.direction === "prompt-to-answer"));
});

test("export and import round-trips vocabulary without creating duplicates", async () => {
  const service = await freshService();
  const stack = await service.createStack("Englisch Unit 3");
  await service.addVocabularyItem(stack.id, "the house", "das Haus");

  const bundle = await service.exportBundle();
  assert.equal(bundle.vocabulary.length, 1);
  assert.equal(bundle.stacks.length, 1);

  const result = await service.importBundle(bundle);
  assert.deepEqual(result, { importedItems: 0, importedStacks: 0 }, "re-importing the same export changes nothing");
  assert.equal((await service.listItems(stack.id)).length, 1);
});

test("importing a bundle into an empty store recreates stacks and vocabulary", async () => {
  const source = await freshService();
  const sourceStack = await source.createStack("Englisch Unit 3");
  await source.addVocabularyItem(sourceStack.id, "the house", "das Haus");
  const bundle = await source.exportBundle();

  const target = await freshService();
  const result = await target.importBundle(bundle);

  assert.deepEqual(result, { importedItems: 1, importedStacks: 1 });
  const stacks = await target.listStacks();
  assert.equal(stacks.length, 1);
  assert.equal((await target.listItems(stacks[0].id)).length, 1);
});

test("rejects a file that is not a valid learning bundle", async () => {
  const service = await freshService();
  await assert.rejects(() => service.importBundle({ not: "a bundle" }));
});
