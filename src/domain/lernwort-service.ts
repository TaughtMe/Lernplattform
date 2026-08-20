import type { LocalRepositoryFactory } from "../storage/local-data-boundaries.ts";
import {
  applyLernwortResult,
  initialLernwortProgress,
  isDue,
  scoreBlockAnswers,
  type LernwortProgressV1,
  type LernwortResult,
} from "./lernwort.ts";
import {
  isLearningBundleV1,
  lernwortFingerprint,
  type EntityId,
  type IsoDateTime,
  type LearningBundleV1,
  type LernwortItemV1,
  type LernwortListV1,
  type LernwortOrigin,
} from "./learning-bundle.ts";

/** LernwortProgressV1 is keyed by learningObjectId; storage needs an explicit `id` to satisfy LocalRepository<T>. */
type StoredLernwortProgressV1 = LernwortProgressV1 & { id: EntityId };

export interface DueLernwort {
  item: LernwortItemV1;
  list: LernwortListV1;
  progress: LernwortProgressV1;
}

export interface LernwortListStats {
  dueCount: number;
  strugglingCount: number;
}

function newId(): EntityId {
  return crypto.randomUUID();
}

function nowIso(): IsoDateTime {
  return new Date().toISOString();
}

export function createLernwortService(factory: LocalRepositoryFactory) {
  const lists = factory.open<LernwortListV1>("personal", "lernwort-lists");
  const items = factory.open<LernwortItemV1>("personal", "lernwort-items");
  const progressRepo = factory.open<StoredLernwortProgressV1>("personal", "lernwort-progress");

  async function getProgress(learningObjectId: EntityId, now: IsoDateTime = nowIso()): Promise<LernwortProgressV1> {
    const stored = await progressRepo.get(learningObjectId);
    return stored ?? initialLernwortProgress(learningObjectId, now);
  }

  async function saveProgress(progress: LernwortProgressV1): Promise<void> {
    await progressRepo.put({ ...progress, id: progress.learningObjectId });
  }

  async function createList(title: string): Promise<LernwortListV1> {
    const trimmed = title.trim();
    if (!trimmed) throw new Error("Listenname darf nicht leer sein");
    const list: LernwortListV1 = { id: newId(), title: trimmed, itemIds: [], tagIds: [] };
    await lists.put(list);
    return list;
  }

  async function deleteList(listId: EntityId): Promise<void> {
    const list = await lists.get(listId);
    if (!list) return;
    for (const itemId of list.itemIds) {
      const stillUsed = (await lists.list()).some((other) => other.id !== listId && other.itemIds.includes(itemId));
      if (!stillUsed) await items.remove(itemId);
    }
    await lists.remove(listId);
  }

  async function listLists(): Promise<LernwortListV1[]> {
    return lists.list();
  }

  async function listItems(listId: EntityId): Promise<LernwortItemV1[]> {
    const list = await lists.get(listId);
    if (!list) return [];
    const resolved = await Promise.all(list.itemIds.map((id) => items.get(id)));
    return resolved.filter((item): item is LernwortItemV1 => Boolean(item));
  }

  /** Skips the word if it (fingerprint-)already exists in this list. */
  async function addLernwort(
    listId: EntityId,
    targetWord: string,
    phenomenonTags: string[] = [],
    origin: LernwortOrigin = "self",
  ): Promise<LernwortItemV1 | undefined> {
    const list = await lists.get(listId);
    if (!list) throw new Error("Liste nicht gefunden");
    const word = targetWord.trim();
    if (!word) throw new Error("Das Lernwort darf nicht leer sein");

    const existingItems = await listItems(listId);
    const fingerprint = lernwortFingerprint({ targetWord: word });
    if (existingItems.some((item) => lernwortFingerprint(item) === fingerprint)) {
      return undefined;
    }

    const now = nowIso();
    const item: LernwortItemV1 = {
      kind: "lernwort",
      id: newId(),
      targetWord: word,
      phenomenonTags: phenomenonTags.map((t) => t.trim()).filter(Boolean),
      origin,
      tagIds: [],
      createdAt: now,
      updatedAt: now,
    };
    await items.put(item);
    await lists.put({ ...list, itemIds: [...list.itemIds, item.id] });
    return item;
  }

  async function removeLernwort(listId: EntityId, itemId: EntityId): Promise<void> {
    const list = await lists.get(listId);
    if (!list) return;
    await lists.put({ ...list, itemIds: list.itemIds.filter((id) => id !== itemId) });
    await items.remove(itemId);
  }

  async function dueQueue(now: IsoDateTime = nowIso()): Promise<DueLernwort[]> {
    const allLists = await lists.list();
    const entries: DueLernwort[] = [];
    for (const list of allLists) {
      for (const itemId of list.itemIds) {
        const item = await items.get(itemId);
        if (!item) continue;
        const progress = await getProgress(itemId, now);
        if (isDue(progress, now)) entries.push({ item, list, progress });
      }
    }
    entries.sort((a, b) => (a.progress.dueAt < b.progress.dueAt ? -1 : a.progress.dueAt > b.progress.dueAt ? 1 : 0));
    return entries;
  }

  /** Words currently at box 1 — freshly added or recently gotten wrong ("Fehler jetzt üben"), same idea as the LernBox error queue. */
  async function errorQueue(now: IsoDateTime = nowIso()): Promise<DueLernwort[]> {
    const due = await dueQueue(now);
    return due.filter((entry) => entry.progress.box === 1);
  }

  async function listStats(now: IsoDateTime = nowIso()): Promise<Record<EntityId, LernwortListStats>> {
    const allLists = await lists.list();
    const result: Record<EntityId, LernwortListStats> = {};
    for (const list of allLists) {
      let dueCount = 0;
      let strugglingCount = 0;
      for (const itemId of list.itemIds) {
        const progress = await getProgress(itemId, now);
        if (isDue(progress, now)) dueCount += 1;
        if (progress.box === 1) strugglingCount += 1;
      }
      result[list.id] = { dueCount, strugglingCount };
    }
    return result;
  }

  async function recordResult(item: LernwortItemV1, result: LernwortResult, now: IsoDateTime = nowIso()): Promise<LernwortProgressV1> {
    const progress = await getProgress(item.id, now);
    const updated = applyLernwortResult(progress, result, now);
    await saveProgress(updated);
    return updated;
  }

  /**
   * Records a stage-5 block round: each target word is scored independently
   * against the pool of typed answers (order doesn't matter), then applied
   * exactly like a single-word result per word.
   */
  async function recordBlockResult(
    blockItems: LernwortItemV1[],
    typedAnswers: string[],
    now: IsoDateTime = nowIso(),
  ): Promise<LernwortProgressV1[]> {
    const correctByItem = scoreBlockAnswers(
      blockItems.map((item) => item.targetWord),
      typedAnswers,
    );
    const updates: LernwortProgressV1[] = [];
    for (let i = 0; i < blockItems.length; i++) {
      const progress = await getProgress(blockItems[i].id, now);
      const updated = applyLernwortResult(progress, { correct: correctByItem[i], usedHelp: false, selfCorrected: false }, now);
      await saveProgress(updated);
      updates.push(updated);
    }
    return updates;
  }

  async function exportBundle(): Promise<LearningBundleV1> {
    const [allLists, allItems] = await Promise.all([lists.list(), items.list()]);
    return {
      schemaVersion: "1.0.0",
      id: newId(),
      revision: 1,
      createdAt: nowIso(),
      source: { kind: "self" },
      vocabulary: [],
      stacks: [],
      lernwoerter: allItems,
      lernwortLists: allLists,
    };
  }

  /** Merges a bundle's Lernwörter into local storage, deduplicated globally by fingerprint, same pattern as the LernBox vocabulary import. */
  async function importBundle(data: unknown): Promise<{ importedItems: number; importedLists: number }> {
    if (!isLearningBundleV1(data)) throw new Error("Ungültige Sicherungsdatei");
    const incomingItems = data.lernwoerter ?? [];
    const incomingLists = data.lernwortLists ?? [];

    const existingItems = await items.list();
    const fingerprintToId = new Map(existingItems.map((item) => [lernwortFingerprint(item), item.id]));
    const idRemap = new Map<EntityId, EntityId>();
    let importedItems = 0;

    for (const incoming of incomingItems) {
      const fingerprint = lernwortFingerprint(incoming);
      const existingId = fingerprintToId.get(fingerprint);
      if (existingId) {
        idRemap.set(incoming.id, existingId);
        continue;
      }
      await items.put(incoming);
      fingerprintToId.set(fingerprint, incoming.id);
      idRemap.set(incoming.id, incoming.id);
      importedItems += 1;
    }

    let importedLists = 0;
    for (const incoming of incomingLists) {
      const remappedItemIds = Array.from(new Set(incoming.itemIds.map((id) => idRemap.get(id) ?? id)));
      const existing = await lists.get(incoming.id);
      const merged: LernwortListV1 = existing
        ? { ...existing, itemIds: Array.from(new Set([...existing.itemIds, ...remappedItemIds])) }
        : { ...incoming, itemIds: remappedItemIds };
      await lists.put(merged);
      if (!existing) importedLists += 1;
    }

    return { importedItems, importedLists };
  }

  return {
    createList,
    deleteList,
    listLists,
    listItems,
    addLernwort,
    removeLernwort,
    dueQueue,
    errorQueue,
    listStats,
    recordResult,
    recordBlockResult,
    getProgress,
    exportBundle,
    importBundle,
  };
}

export type LernwortService = ReturnType<typeof createLernwortService>;
