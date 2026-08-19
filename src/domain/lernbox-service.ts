import type { LocalRepositoryFactory } from "../storage/local-data-boundaries.ts";
import { applyLearningEvent, dueDirections, initialLearningProgress, isDue } from "./leitner.ts";
import {
  isLearningBundleV1,
  vocabularyFingerprint,
  type EntityId,
  type IsoDateTime,
  type LearningBundleV1,
  type LearningDirection,
  type LearningEventV1,
  type LearningProgressV1,
  type VocabularyItemV1,
  type VocabularyStackV1,
} from "./learning-bundle.ts";

/** LearningProgressV1 is keyed by learningObjectId; storage needs an explicit `id` to satisfy LocalRepository<T>. */
type StoredProgressV1 = LearningProgressV1 & { id: EntityId };

export interface DueEntry {
  item: VocabularyItemV1;
  stack: VocabularyStackV1;
  direction: LearningDirection;
  progress: LearningProgressV1;
}

export interface AnswerResult {
  knowledgeCorrect: boolean;
  writingCorrect: boolean;
  help?: LearningEventV1["help"];
  selfCorrected?: boolean;
}

function newId(): EntityId {
  return crypto.randomUUID();
}

function nowIso(): IsoDateTime {
  return new Date().toISOString();
}

export function createLernBoxService(factory: LocalRepositoryFactory) {
  const stacks = factory.open<VocabularyStackV1>("personal", "vocabulary-stacks");
  const items = factory.open<VocabularyItemV1>("personal", "vocabulary-items");
  const progressRepo = factory.open<StoredProgressV1>("personal", "learning-progress");
  const eventsRepo = factory.open<LearningEventV1>("personal", "learning-events");

  async function getProgress(learningObjectId: EntityId, now: IsoDateTime = nowIso()): Promise<LearningProgressV1> {
    const stored = await progressRepo.get(learningObjectId);
    return stored ?? initialLearningProgress(learningObjectId, now);
  }

  async function saveProgress(progress: LearningProgressV1): Promise<void> {
    await progressRepo.put({ ...progress, id: progress.learningObjectId });
  }

  async function createStack(title: string): Promise<VocabularyStackV1> {
    const trimmed = title.trim();
    if (!trimmed) throw new Error("Stapelname darf nicht leer sein");
    const stack: VocabularyStackV1 = { id: newId(), title: trimmed, itemIds: [], tagIds: [] };
    await stacks.put(stack);
    return stack;
  }

  async function deleteStack(stackId: EntityId): Promise<void> {
    const stack = await stacks.get(stackId);
    if (!stack) return;
    for (const itemId of stack.itemIds) {
      const stillUsed = (await stacks.list()).some((other) => other.id !== stackId && other.itemIds.includes(itemId));
      if (!stillUsed) await items.remove(itemId);
    }
    await stacks.remove(stackId);
  }

  async function listStacks(): Promise<VocabularyStackV1[]> {
    return stacks.list();
  }

  async function listItems(stackId: EntityId): Promise<VocabularyItemV1[]> {
    const stack = await stacks.get(stackId);
    if (!stack) return [];
    const resolved = await Promise.all(stack.itemIds.map((id) => items.get(id)));
    return resolved.filter((item): item is VocabularyItemV1 => Boolean(item));
  }

  /** Skips the item if a vocabulary pair with the same fingerprint already exists in this stack ("dublettenfreie Übergabe"). */
  async function addVocabularyItem(
    stackId: EntityId,
    promptText: string,
    answerText: string,
    locale = "de",
  ): Promise<VocabularyItemV1 | undefined> {
    const stack = await stacks.get(stackId);
    if (!stack) throw new Error("Stapel nicht gefunden");
    const prompt = promptText.trim();
    const answer = answerText.trim();
    if (!prompt || !answer) throw new Error("Frage und Antwort dürfen nicht leer sein");

    const existingItems = await listItems(stackId);
    const fingerprint = vocabularyFingerprint({
      prompt: { text: prompt, locale },
      answer: { text: answer, locale },
    });
    if (existingItems.some((item) => vocabularyFingerprint(item) === fingerprint)) {
      return undefined;
    }

    const now = nowIso();
    const item: VocabularyItemV1 = {
      kind: "vocabulary",
      id: newId(),
      prompt: { text: prompt, locale },
      answer: { text: answer, locale },
      tagIds: [],
      createdAt: now,
      updatedAt: now,
    };
    await items.put(item);
    await stacks.put({ ...stack, itemIds: [...stack.itemIds, item.id] });
    return item;
  }

  async function removeVocabularyItem(stackId: EntityId, itemId: EntityId): Promise<void> {
    const stack = await stacks.get(stackId);
    if (!stack) return;
    await stacks.put({ ...stack, itemIds: stack.itemIds.filter((id) => id !== itemId) });
    await items.remove(itemId);
  }

  /** Every direction of every item whose knowledge or writing track is due, earliest first. */
  async function dueQueue(now: IsoDateTime = nowIso()): Promise<DueEntry[]> {
    const allStacks = await stacks.list();
    const entries: DueEntry[] = [];
    for (const stack of allStacks) {
      for (const itemId of stack.itemIds) {
        const item = await items.get(itemId);
        if (!item) continue;
        const progress = await getProgress(itemId, now);
        const due = dueDirections(progress, now);
        const directions = new Set(due.map((d) => d.direction));
        for (const direction of directions) {
          entries.push({ item, stack, direction, progress });
        }
      }
    }
    entries.sort((a, b) => {
      const aDue = a.progress.knowledge[a.direction].dueAt;
      const bDue = b.progress.knowledge[b.direction].dueAt;
      return aDue < bDue ? -1 : aDue > bDue ? 1 : 0;
    });
    return entries;
  }

  /**
   * Records one review: a wrong meaning implies a wrong writing result too
   * ("Bedeutung falsch | beide fallen"), so writingCorrect is only asked
   * for in the UI when knowledgeCorrect is true.
   */
  async function recordAnswer(
    item: VocabularyItemV1,
    direction: LearningDirection,
    roundId: EntityId,
    result: AnswerResult,
  ): Promise<LearningProgressV1> {
    const event: LearningEventV1 = {
      id: newId(),
      learningObjectId: item.id,
      occurredAt: nowIso(),
      source: "learning-box",
      roundId,
      direction,
      answerMode: "typed",
      help: result.help ?? "none",
      assessment: {
        knowledge: result.knowledgeCorrect ? "correct" : "incorrect",
        writing: result.knowledgeCorrect ? (result.writingCorrect ? "correct" : "incorrect") : "incorrect",
        selfCorrected: result.selfCorrected ?? false,
      },
    };
    const progress = await getProgress(item.id);
    const updated = applyLearningEvent(progress, event);
    await saveProgress(updated);
    await eventsRepo.put(event);
    return updated;
  }

  async function exportBundle(): Promise<LearningBundleV1> {
    const [allStacks, allItems] = await Promise.all([stacks.list(), items.list()]);
    return {
      schemaVersion: "1.0.0",
      id: newId(),
      revision: 1,
      createdAt: nowIso(),
      source: { kind: "self" },
      vocabulary: allItems,
      stacks: allStacks,
    };
  }

  /**
   * Merges a bundle into local storage. Vocabulary is deduplicated globally by
   * fingerprint (not per stack) so the same word list imported twice, or
   * imported after already being learned, does not create a second progress
   * track for it. Existing learning progress is never touched by an import.
   */
  async function importBundle(data: unknown): Promise<{ importedItems: number; importedStacks: number }> {
    if (!isLearningBundleV1(data)) throw new Error("Ungültige Sicherungsdatei");

    const existingItems = await items.list();
    const fingerprintToId = new Map(existingItems.map((item) => [vocabularyFingerprint(item), item.id]));
    const idRemap = new Map<EntityId, EntityId>();
    let importedItems = 0;

    for (const incoming of data.vocabulary) {
      const fingerprint = vocabularyFingerprint(incoming);
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

    let importedStacks = 0;
    for (const incoming of data.stacks) {
      const remappedItemIds = Array.from(new Set(incoming.itemIds.map((id) => idRemap.get(id) ?? id)));
      const existing = await stacks.get(incoming.id);
      const merged: VocabularyStackV1 = existing
        ? { ...existing, itemIds: Array.from(new Set([...existing.itemIds, ...remappedItemIds])) }
        : { ...incoming, itemIds: remappedItemIds };
      await stacks.put(merged);
      if (!existing) importedStacks += 1;
    }

    return { importedItems, importedStacks };
  }

  return {
    createStack,
    deleteStack,
    listStacks,
    listItems,
    addVocabularyItem,
    removeVocabularyItem,
    dueQueue,
    recordAnswer,
    getProgress,
    exportBundle,
    importBundle,
  };
}

export type LernBoxService = ReturnType<typeof createLernBoxService>;
export { isDue };
