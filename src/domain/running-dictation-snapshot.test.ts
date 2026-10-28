import { describe, expect, it } from "vitest";
import {
  buildVocabularyItems,
  parseRunningDictationText,
  parseVocabularyTable,
} from "./running-dictation";
import {
  buildRunningDictationSnapshot,
  restoreRunningDictationItems,
  runningDictationSnapshotSchema,
  type RunningDictationSnapshotSource,
} from "./running-dictation-snapshot";
import { buildRoundSnapshot, parseRoundSnapshot } from "./round-snapshot";

const vocabulary = buildVocabularyItems(
  parseVocabularyTable(
    "library;Bibliothek\nclassroom;Klassenzimmer\nschool;Schule\nhouse;Haus|Gebäude",
  ),
  "left-to-right",
);

function source(
  overrides: Partial<RunningDictationSnapshotSource> = {},
): RunningDictationSnapshotSource {
  return {
    mode: "practice",
    transfer: "errors",
    items: vocabulary,
    index: 2,
    wrongForCurrent: 1,
    errorCounts: { [vocabulary[1]!.id]: 2, [vocabulary[2]!.id]: 1 },
    ...overrides,
  };
}

describe("buildRunningDictationSnapshot", () => {
  it("hält Aufgaben, Stelle und Fehlversuche fest", () => {
    const content = buildRunningDictationSnapshot(source())!;
    expect(content).toMatchObject({
      mode: "practice",
      transfer: "errors",
      index: 2,
      wrongForCurrent: 1,
    });
    expect(content.items).toHaveLength(4);
    expect(content.errorCounts[vocabulary[1]!.id]).toBe(2);
  });

  it("lässt Aufgaben ohne Fehlversuch aus der Zählung", () => {
    const content = buildRunningDictationSnapshot(
      source({ errorCounts: { [vocabulary[0]!.id]: 0 } }),
    )!;
    expect(content.errorCounts).toEqual({});
  });

  it("übersteht Speichern und Lesen und liefert gleiche Aufgaben zurück", () => {
    const content = buildRunningDictationSnapshot(source())!;
    const raw = JSON.stringify(
      buildRoundSnapshot({
        module: "laufdiktat",
        roundId: "r",
        startedAt: "2026-10-28T09:00:00.000Z",
        now: new Date("2026-10-28T09:05:00.000Z"),
        done: content.index,
        total: content.items.length,
        state: content,
      }),
    );
    const read = parseRoundSnapshot(raw, {
      module: "laufdiktat",
      now: new Date("2026-10-28T09:10:00.000Z"),
      state: runningDictationSnapshotSchema,
    })!;
    expect(restoreRunningDictationItems(read.state)).toEqual(vocabulary);
  });

  it("behält die Aufgaben eines Textes ohne Vokabelfelder", () => {
    const items = parseRunningDictationText("Der Fuchs läuft. Er springt.");
    const content = buildRunningDictationSnapshot(
      source({ mode: "running-dictation", items, index: 1 }),
    )!;
    expect(restoreRunningDictationItems(content)).toEqual(items);
  });

  it("bietet eine fertige oder leere Runde nicht an", () => {
    expect(buildRunningDictationSnapshot(source({ index: 4 }))).toBeNull();
    expect(buildRunningDictationSnapshot(source({ items: [] }))).toBeNull();
  });
});

describe("runningDictationSnapshotSchema", () => {
  it("verwirft unplausible Werte", () => {
    const content = buildRunningDictationSnapshot(source())!;
    const valid = (patch: Record<string, unknown>) =>
      runningDictationSnapshotSchema.safeParse({ ...content, ...patch })
        .success;
    expect(valid({})).toBe(true);
    expect(valid({ index: -1 })).toBe(false);
    expect(valid({ mode: "schnell" })).toBe(false);
    expect(valid({ errorCounts: { a: 0 } })).toBe(false);
    expect(valid({ items: [{ id: "a", kind: "text" }] })).toBe(false);
  });
});
