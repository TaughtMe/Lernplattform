import { LOCAL_DATA_AREAS, type LocalDataArea, type LocalRepository, type LocalRepositoryFactory } from "./local-data-boundaries.ts";

/**
 * Object stores that must exist in each area's IndexedDB database. Declared up
 * front because IndexedDB can only create stores inside an onupgradeneeded
 * handler, before any `open()` call for a not-yet-known collection.
 */
const AREA_COLLECTIONS: Record<LocalDataArea, readonly string[]> = {
  personal: [
    "vocabulary-stacks",
    "vocabulary-items",
    "learning-progress",
    "learning-events",
    "lernwort-lists",
    "lernwort-items",
    "lernwort-progress",
    "typing-progress",
    "typing-attempts",
    "game-scores",
  ],
  classes: ["class-memberships", "class-standnr"],
  teacher: ["teacher-auth", "teacher-classes", "teacher-students", "teacher-turnus", "teacher-submissions"],
};

/**
 * Bump when AREA_COLLECTIONS gains a collection — IndexedDB only runs
 * onupgradeneeded (where stores get created) when the requested version is
 * higher than what's already on disk. Creation is idempotent per collection,
 * so this never needs per-version migration logic, just the version bump.
 */
const DB_VERSION = 5;

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function openDatabase(area: LocalDataArea): Promise<IDBDatabase> {
  const collections = AREA_COLLECTIONS[area];
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(LOCAL_DATA_AREAS[area], DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const collection of collections) {
        if (!db.objectStoreNames.contains(collection)) {
          db.createObjectStore(collection, { keyPath: "id" });
        }
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Browser-only LocalRepositoryFactory backed by IndexedDB, one database per
 * data area. Must not be constructed or used during server rendering — the
 * `indexedDB` global does not exist there.
 */
export function createIndexedDbRepositoryFactory(): LocalRepositoryFactory & { close(): Promise<void> } {
  const openDatabases = new Map<LocalDataArea, Promise<IDBDatabase>>();

  function getDb(area: LocalDataArea): Promise<IDBDatabase> {
    let promise = openDatabases.get(area);
    if (!promise) {
      promise = openDatabase(area);
      openDatabases.set(area, promise);
    }
    return promise;
  }

  return {
    async close() {
      for (const promise of openDatabases.values()) {
        (await promise).close();
      }
      openDatabases.clear();
    },
    open<T extends { id: string }>(area: LocalDataArea, collection: string): LocalRepository<T> {
      if (!AREA_COLLECTIONS[area].includes(collection)) {
        throw new Error(`Unknown collection "${collection}" for area "${area}"`);
      }
      return {
        async get(id) {
          const db = await getDb(area);
          const store = db.transaction(collection, "readonly").objectStore(collection);
          return promisifyRequest<T | undefined>(store.get(id));
        },
        async list() {
          const db = await getDb(area);
          const store = db.transaction(collection, "readonly").objectStore(collection);
          return promisifyRequest<T[]>(store.getAll());
        },
        async put(value) {
          const db = await getDb(area);
          const store = db.transaction(collection, "readwrite").objectStore(collection);
          await promisifyRequest(store.put(value));
        },
        async remove(id) {
          const db = await getDb(area);
          const store = db.transaction(collection, "readwrite").objectStore(collection);
          await promisifyRequest(store.delete(id));
        },
      };
    },
  };
}
