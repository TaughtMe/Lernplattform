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

test("errorQueue only contains words still at box 1, even though both are due", async () => {
  const service = await freshService();
  const stack = await service.createStack("Englisch Unit 3");
  const advanced = await service.addVocabularyItem(stack.id, "the house", "das Haus");
  const fresh = await service.addVocabularyItem(stack.id, "the car", "das Auto");
  await service.recordAnswer(advanced, "prompt-to-answer", "round-1", { knowledgeCorrect: true, writingCorrect: true });

  const due = await service.dueQueue();
  assert.ok(due.some((e) => e.item.id === advanced.id), "the advanced word is still due in its other direction");

  const errors = await service.errorQueue();
  assert.equal(errors.some((e) => e.item.id === fresh.id), true, "the never-answered word is at box 1");
  assert.equal(errors.some((e) => e.item.id === advanced.id && e.direction === "prompt-to-answer"), false, "the advanced direction is not box 1 anymore");
});

test("stackStats reports due and struggling counts per stack", async () => {
  const service = await freshService();
  const stackA = await service.createStack("Stapel A");
  const stackB = await service.createStack("Stapel B");
  const item = await service.addVocabularyItem(stackA.id, "the house", "das Haus");
  await service.addVocabularyItem(stackB.id, "the car", "das Auto");
  await service.recordAnswer(item, "prompt-to-answer", "round-1", { knowledgeCorrect: true, writingCorrect: true });

  const stats = await service.stackStats();
  assert.equal(stats[stackA.id].dueCount, 1, "still due in the other direction");
  assert.equal(stats[stackA.id].strugglingCount, 1, "still box 1 on three of four tracks");
  assert.equal(stats[stackB.id].dueCount, 1);
  assert.equal(stats[stackB.id].strugglingCount, 1);
});
