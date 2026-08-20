import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import test from "node:test";
import { LOCAL_DATA_AREAS } from "../src/storage/local-data-boundaries.ts";
import { createIndexedDbRepositoryFactory } from "../src/storage/indexeddb-repository.ts";
import { createLernwortService } from "../src/domain/lernwort-service.ts";

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
  return createLernwortService(openFactory);
}

test("creates a list and adds Lernwörter to it", async () => {
  const service = await freshService();
  const list = await service.createList("Doppelkonsonant");
  await service.addLernwort(list.id, "Sommer", ["doppelkonsonant"]);
  await service.addLernwort(list.id, "Hammer", ["doppelkonsonant"]);

  const items = await service.listItems(list.id);
  assert.equal(items.length, 2);
  assert.deepEqual(items.map((i) => i.targetWord).sort(), ["Hammer", "Sommer"]);
});

test("does not add the same word to a list twice, case-insensitively", async () => {
  const service = await freshService();
  const list = await service.createList("Doppelkonsonant");
  await service.addLernwort(list.id, "Sommer");
  const duplicate = await service.addLernwort(list.id, "  sommer  ");

  assert.equal(duplicate, undefined);
  assert.equal((await service.listItems(list.id)).length, 1);
});

test("a freshly added word is due immediately, at stage 1 and box 1", async () => {
  const service = await freshService();
  const list = await service.createList("Doppelkonsonant");
  await service.addLernwort(list.id, "Sommer");

  const due = await service.dueQueue();
  assert.equal(due.length, 1);
  assert.equal(due[0].progress.stage, 1);
  assert.equal(due[0].progress.box, 1);
});

test("a clean correct answer advances stage and box, but stays due immediately (stage < 5, Merkstrecke walkable in one sitting)", async () => {
  const service = await freshService();
  const list = await service.createList("Doppelkonsonant");
  const item = await service.addLernwort(list.id, "Sommer");

  const progress = await service.recordResult(item, { correct: true, usedHelp: false, selfCorrected: false });
  assert.equal(progress.stage, 2);
  assert.equal(progress.box, 2);

  const due = await service.dueQueue();
  assert.equal(due.length, 1, "still due — only stage 5 gets the multi-day Leitner spacing");
});

test("reaching stage 5 stays due immediately, so the word's first block exercise is reachable — only a passed block finally spaces it out", async () => {
  const service = await freshService();
  const list = await service.createList("Doppelkonsonant");
  const item = await service.addLernwort(list.id, "Sommer");

  let progress;
  for (let i = 0; i < 4; i++) {
    progress = await service.recordResult(item, { correct: true, usedHelp: false, selfCorrected: false });
  }
  assert.equal(progress.stage, 5);
  assert.equal((await service.dueQueue()).length, 1, "still due — no stage-5 block exercise has been passed yet");

  progress = await service.recordResult(item, { correct: true, usedHelp: false, selfCorrected: false });
  assert.equal(progress.stage, 5);
  assert.equal((await service.dueQueue()).length, 0, "box 5 (14 days) is not due the same instant a passed block sets it");
});

test("a wrong answer resets the box and keeps the word in the due/error queue", async () => {
  const service = await freshService();
  const list = await service.createList("Doppelkonsonant");
  const item = await service.addLernwort(list.id, "Sommer");

  await service.recordResult(item, { correct: true, usedHelp: false, selfCorrected: false });
  await service.recordResult(item, { correct: false, usedHelp: false, selfCorrected: false });

  const errors = await service.errorQueue();
  assert.equal(errors.length, 1);
  assert.equal(errors[0].item.id, item.id);
});

test("recordBlockResult scores a stage-5 block and applies each word's own result", async () => {
  const service = await freshService();
  const list = await service.createList("Block");
  const a = await service.addLernwort(list.id, "Haus");
  const b = await service.addLernwort(list.id, "Baum");

  const [progressA, progressB] = await service.recordBlockResult([a, b], ["Baum", "Haus"]);
  assert.equal(progressA.stage, 2, "order-independent match still counts as correct");
  assert.equal(progressB.stage, 2);
});

test("listStats reports due and struggling counts per list", async () => {
  const service = await freshService();
  const listA = await service.createList("Liste A");
  const listB = await service.createList("Liste B");
  const item = await service.addLernwort(listA.id, "Sommer");
  await service.addLernwort(listB.id, "Winter");
  await service.recordResult(item, { correct: true, usedHelp: false, selfCorrected: false });

  const stats = await service.listStats();
  assert.equal(stats[listA.id].dueCount, 1, "stage 2 is still due immediately, only stage 5 gets real spacing");
  assert.equal(stats[listA.id].strugglingCount, 0, "box advanced past 1, so it is no longer 'struggling'");
  assert.equal(stats[listB.id].dueCount, 1);
  assert.equal(stats[listB.id].strugglingCount, 1);
});

test("export and import round-trips Lernwörter without creating duplicates", async () => {
  const service = await freshService();
  const list = await service.createList("Doppelkonsonant");
  await service.addLernwort(list.id, "Sommer");

  const bundle = await service.exportBundle();
  assert.equal(bundle.lernwoerter.length, 1);
  assert.equal(bundle.lernwortLists.length, 1);

  const result = await service.importBundle(bundle);
  assert.deepEqual(result, { importedItems: 0, importedLists: 0 });
  assert.equal((await service.listItems(list.id)).length, 1);
});

test("importing a bundle into an empty store recreates lists and words", async () => {
  const source = await freshService();
  const sourceList = await source.createList("Doppelkonsonant");
  await source.addLernwort(sourceList.id, "Sommer");
  const bundle = await source.exportBundle();

  const target = await freshService();
  const result = await target.importBundle(bundle);

  assert.deepEqual(result, { importedItems: 1, importedLists: 1 });
  const lists = await target.listLists();
  assert.equal(lists.length, 1);
  assert.equal((await target.listItems(lists[0].id)).length, 1);
});

test("rejects a file that is not a valid learning bundle", async () => {
  const service = await freshService();
  await assert.rejects(() => service.importBundle({ not: "a bundle" }));
});

test("upgrades an existing v1 database (vocabulary stores only, no Lernwort stores) without losing its data", async () => {
  await openFactory?.close();
  await new Promise((resolve) => {
    const request = indexedDB.deleteDatabase(LOCAL_DATA_AREAS.personal);
    request.onsuccess = resolve;
    request.onerror = resolve;
    request.onblocked = resolve;
  });

  // Simulate a device that already has a v1 database, from before Lernwörter existed.
  const legacyDb = await new Promise((resolve, reject) => {
    const request = indexedDB.open(LOCAL_DATA_AREAS.personal, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore("vocabulary-stacks", { keyPath: "id" });
      db.createObjectStore("vocabulary-items", { keyPath: "id" });
      db.createObjectStore("learning-progress", { keyPath: "id" });
      db.createObjectStore("learning-events", { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  await new Promise((resolve, reject) => {
    const tx = legacyDb.transaction("vocabulary-stacks", "readwrite");
    tx.objectStore("vocabulary-stacks").put({ id: "legacy-stack", title: "Alter Stapel", itemIds: [], tagIds: [] });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  legacyDb.close();

  openFactory = createIndexedDbRepositoryFactory();
  const service = createLernwortService(openFactory);
  const list = await service.createList("Neu nach dem Upgrade");
  await service.addLernwort(list.id, "Sommer");
  assert.equal((await service.listItems(list.id)).length, 1, "the new Lernwort stores work on an upgraded database");

  // The old vocabulary store and its data must still be there, untouched.
  const { createLernBoxService } = await import("../src/domain/lernbox-service.ts");
  const lernBox = createLernBoxService(openFactory);
  const stacks = await lernBox.listStacks();
  assert.deepEqual(stacks.map((s) => s.id), ["legacy-stack"]);
});

test("importing a vocabulary-only LernBox bundle (no lernwoerter field) is a harmless no-op", async () => {
  const service = await freshService();
  const result = await service.importBundle({
    schemaVersion: "1.0.0",
    id: "b1",
    revision: 1,
    createdAt: new Date().toISOString(),
    source: { kind: "self" },
    vocabulary: [],
    stacks: [],
  });
  assert.deepEqual(result, { importedItems: 0, importedLists: 0 });
});
