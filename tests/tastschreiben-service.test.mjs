import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import test from "node:test";
import { LOCAL_DATA_AREAS } from "../src/storage/local-data-boundaries.ts";
import { createIndexedDbRepositoryFactory } from "../src/storage/indexeddb-repository.ts";
import { createTypingService, COMPLETION_ACCURACY } from "../src/tastschreiben/typing-service.ts";
import { LESSONS } from "../src/tastschreiben/curriculum.ts";

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

function stats({ wpm, accuracy, corrections = 0, problemChars = [] }) {
  return { totalChars: 60, correctChars: 60, errorCount: 0, accuracy, elapsedMs: 60000, cpm: wpm * 5, wpm, corrections, problemChars };
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

test("recordAttempt: logs every round to history with computed points, first completion earns the bonus", async () => {
  const service = await freshService();
  await service.recordAttempt("grundstellung-links", stats({ wpm: 20, accuracy: 60 }));
  await service.recordAttempt("grundstellung-links", stats({ wpm: 20, accuracy: COMPLETION_ACCURACY }));

  const history = await service.getHistory("grundstellung-links");
  assert.equal(history.length, 2);
  assert.ok(history[0].occurredAt <= history[1].occurredAt, "history is sorted oldest first");
  assert.ok(history[1].points > history[0].points, "the completing round earns the first-completion bonus on top");
});

test("getWeakKeys: sums error counts per character across the whole history, worst first", async () => {
  const service = await freshService();
  await service.recordAttempt("l1", stats({ wpm: 10, accuracy: 80, problemChars: [{ char: "q", errors: 2 }, { char: "p", errors: 1 }] }));
  await service.recordAttempt("l2", stats({ wpm: 10, accuracy: 80, problemChars: [{ char: "q", errors: 3 }] }));

  const weak = await service.getWeakKeys();
  assert.deepEqual(weak[0], { char: "q", errors: 5 });
  assert.deepEqual(weak[1], { char: "p", errors: 1 });
});

test("getTotalPoints: sums points across every recorded attempt, including non-lesson games", async () => {
  const service = await freshService();
  const a = await service.recordAttempt("l1", stats({ wpm: 20, accuracy: 100 }));
  const b = await service.recordAttempt("zeitrennen", stats({ wpm: 15, accuracy: 100 }));
  const total = await service.getTotalPoints();
  const history = await service.getHistory();
  assert.equal(total, history.reduce((sum, h) => sum + h.points, 0));
  assert.ok(total > 0);
  assert.ok(a && b);
});

test("recordGameScore / getGameScore: keeps the best score and streak across plays", async () => {
  const service = await freshService();
  await service.recordGameScore("buchstabenregen", 40, 5);
  const second = await service.recordGameScore("buchstabenregen", 30, 12);

  assert.equal(second.bestScore, 40, "keeps the higher score even from an earlier, better round");
  assert.equal(second.bestStreak, 12);
  assert.equal(second.attempts, 2);
});

test("getGameScore: defaults to zero for a game never played", async () => {
  const service = await freshService();
  const score = await service.getGameScore("buchstabenregen");
  assert.deepEqual(score, { id: "buchstabenregen", bestScore: 0, bestStreak: 0, attempts: 0, lastPlayedAt: "" });
});

test("getProgressSnapshot: only includes real curriculum lessons, plus totals from points, games and time attack", async () => {
  const service = await freshService();
  const realLessonId = LESSONS[0].id;
  await service.recordAttempt(realLessonId, stats({ wpm: 20, accuracy: 100 }));
  await service.recordAttempt("schwache-tasten", stats({ wpm: 10, accuracy: 100 }));
  await service.recordAttempt("zeitrennen", stats({ wpm: 45, accuracy: 100 }));
  await service.recordGameScore("buchstabenregen", 80, 20);

  const snapshot = await service.getProgressSnapshot();
  assert.deepEqual(snapshot.lessonProgress.map((p) => p.id), [realLessonId], "only the real lesson shows up, not zeitrennen/schwache-tasten");
  assert.equal(snapshot.totalLessons, LESSONS.length);
  assert.equal(snapshot.bestTimeAttackWpm, 45);
  assert.equal(snapshot.bestGameScore, 80);
  assert.equal(snapshot.bestGameStreak, 20);
  assert.ok(snapshot.totalPoints > 0);
});

test("upgrades an existing v3 database (no typing-attempts/game-scores stores yet) without losing typing-progress data", async () => {
  await openFactory?.close();
  await new Promise((resolve) => {
    const request = indexedDB.deleteDatabase(LOCAL_DATA_AREAS.personal);
    request.onsuccess = resolve;
    request.onerror = resolve;
    request.onblocked = resolve;
  });

  const legacyDb = await new Promise((resolve, reject) => {
    const request = indexedDB.open(LOCAL_DATA_AREAS.personal, 3);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of ["vocabulary-stacks", "vocabulary-items", "learning-progress", "learning-events", "lernwort-lists", "lernwort-items", "lernwort-progress", "typing-progress"]) {
        db.createObjectStore(name, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  await new Promise((resolve, reject) => {
    const tx = legacyDb.transaction("typing-progress", "readwrite");
    tx.objectStore("typing-progress").put({ id: "legacy-lesson", completed: true, bestWpm: 12, bestAccuracy: 90, attempts: 1, lastPracticedAt: "2026-01-01T00:00:00.000Z" });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  legacyDb.close();

  openFactory = createIndexedDbRepositoryFactory();
  const service = createTypingService(openFactory);
  await service.recordGameScore("buchstabenregen", 10, 3);
  assert.equal((await service.getGameScore("buchstabenregen")).bestScore, 10, "the new game-scores store works on an upgraded database");

  const progress = await service.listProgress();
  assert.deepEqual(progress.map((p) => p.id), ["legacy-lesson"], "existing typing-progress data survives the upgrade");
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
