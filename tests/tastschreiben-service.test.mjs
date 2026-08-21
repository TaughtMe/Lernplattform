import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import test from "node:test";
import { LOCAL_DATA_AREAS } from "../src/storage/local-data-boundaries.ts";
import { createIndexedDbRepositoryFactory } from "../src/storage/indexeddb-repository.ts";
import { createTypingService, COMPLETION_ACCURACY } from "../src/tastschreiben/typing-service.ts";

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
  return createTypingService(openFactory);
}

function stats({ wpm, accuracy }) {
  return { totalChars: 60, correctChars: 60, errorCount: 0, accuracy, elapsedMs: 60000, cpm: wpm * 5, wpm, corrections: 0, problemChars: [] };
}

test("getProgress: a never-practiced lesson defaults to not completed, zeroed stats", async () => {
  const service = await freshService();
  const progress = await service.getProgress("grundstellung-links");
  assert.deepEqual(progress, {
    id: "grundstellung-links",
    completed: false,
    bestWpm: 0,
    bestAccuracy: 0,
    attempts: 0,
    lastPracticedAt: "",
  });
});

test("recordAttempt: tracks attempts and keeps the best wpm/accuracy across rounds", async () => {
  const service = await freshService();
  await service.recordAttempt("grundstellung-links", stats({ wpm: 10, accuracy: 80 }));
  const second = await service.recordAttempt("grundstellung-links", stats({ wpm: 15, accuracy: 70 }));

  assert.equal(second.attempts, 2);
  assert.equal(second.bestWpm, 15, "keeps the higher wpm even though it came from a less accurate round");
  assert.equal(second.bestAccuracy, 80, "keeps the higher accuracy even though it came from an earlier round");
});

test(`recordAttempt: reaching ${COMPLETION_ACCURACY}% accuracy marks the lesson completed, and it stays completed afterwards`, async () => {
  const service = await freshService();
  let progress = await service.recordAttempt("grundstellung-links", stats({ wpm: 5, accuracy: 60 }));
  assert.equal(progress.completed, false);

  progress = await service.recordAttempt("grundstellung-links", stats({ wpm: 5, accuracy: COMPLETION_ACCURACY }));
  assert.equal(progress.completed, true);

  progress = await service.recordAttempt("grundstellung-links", stats({ wpm: 5, accuracy: 10 }));
  assert.equal(progress.completed, true, "a later bad round does not un-complete an already-passed lesson");
});

test("listProgress: returns progress for every lesson that has been attempted", async () => {
  const service = await freshService();
  await service.recordAttempt("grundstellung-links", stats({ wpm: 10, accuracy: 95 }));
  await service.recordAttempt("grundstellung-rechts", stats({ wpm: 8, accuracy: 91 }));

  const all = await service.listProgress();
  assert.equal(all.length, 2);
  assert.deepEqual(all.map((p) => p.id).sort(), ["grundstellung-links", "grundstellung-rechts"]);
});

test("upgrades an existing v2 database (no typing-progress store yet) without losing its Lernwort data", async () => {
  await openFactory?.close();
  await new Promise((resolve) => {
    const request = indexedDB.deleteDatabase(LOCAL_DATA_AREAS.personal);
    request.onsuccess = resolve;
    request.onerror = resolve;
    request.onblocked = resolve;
  });

  const legacyDb = await new Promise((resolve, reject) => {
    const request = indexedDB.open(LOCAL_DATA_AREAS.personal, 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of ["vocabulary-stacks", "vocabulary-items", "learning-progress", "learning-events", "lernwort-lists", "lernwort-items", "lernwort-progress"]) {
        db.createObjectStore(name, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  await new Promise((resolve, reject) => {
    const tx = legacyDb.transaction("lernwort-lists", "readwrite");
    tx.objectStore("lernwort-lists").put({ id: "legacy-list", title: "Alte Liste", itemIds: [], tagIds: [] });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  legacyDb.close();

  openFactory = createIndexedDbRepositoryFactory();
  const service = createTypingService(openFactory);
  await service.recordAttempt("grundstellung-links", stats({ wpm: 10, accuracy: 95 }));
  assert.equal((await service.listProgress()).length, 1, "the new typing-progress store works on an upgraded database");

  const { createLernwortService } = await import("../src/domain/lernwort-service.ts");
  const lernwort = createLernwortService(openFactory);
  const lists = await lernwort.listLists();
  assert.deepEqual(lists.map((l) => l.id), ["legacy-list"], "existing Lernwort data survives the upgrade");
});
