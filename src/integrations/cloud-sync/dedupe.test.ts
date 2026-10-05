import { describe, expect, it } from "vitest";
import { dedupe } from "./dedupe";
import { contentHash } from "./hash";
import { createClock } from "./hlc";
import type { SyncData, SyncRecord, SyncTable } from "./model";

function entry(table: SyncTable, id: string, data: SyncData): SyncRecord {
  return {
    table,
    id,
    hlc: "000000000000001-00000-a",
    device: "a",
    hash: contentHash(data),
    data,
  };
}

function run(records: SyncRecord[], resolved: string[] = []) {
  const clock = createClock("a");
  return dedupe({
    records,
    tombstones: [],
    resolved,
    device: "a",
    tick: () => clock.tick(5000),
    now: "2026-10-05T10:00:00.000Z",
  });
}

const klasse = (id: string, over: SyncData = {}) =>
  entry("classes", id, {
    id,
    name: "5b",
    schoolYear: "2026/27",
    teacherName: "Frau Lenz",
    enabledModules: ["vocabulary"],
    createdAt: id === "c1" ? "2026-09-01T08:00:00Z" : "2026-09-02T08:00:00Z",
    updatedAt: "2026-09-03T08:00:00Z",
    ...over,
  });

describe("dedupe", () => {
  it("merges identical classes, keeps the older id and rewrites references", () => {
    const result = run([
      klasse("c1"),
      klasse("c2"),
      entry("members", "k1", { classId: "c2", displayName: "Fuchs" }),
      entry("contentPackages", "m1", { title: "X", classIds: ["c2", "c1"] }),
      entry("assignments", "a1", { classIds: ["c2"], materialId: "m1" }),
      entry("submissions", "s1", { classId: "c2" }),
      entry("profiles", "local-teacher", { lastLiveClassId: "c2" }),
    ]);
    expect(result.merged).toEqual([
      { table: "classes", dropped: "c2", kept: "c1" },
    ]);
    expect(result.tombstones).toHaveLength(1);
    expect(result.tombstones[0]).toMatchObject({ table: "classes", id: "c2" });
    const byId = Object.fromEntries(result.records.map((r) => [r.id, r]));
    expect(byId["c2"]).toBeUndefined();
    expect(byId["k1"]?.data["classId"]).toBe("c1");
    expect(byId["m1"]?.data["classIds"]).toEqual(["c1"]);
    expect(byId["a1"]?.data["classIds"]).toEqual(["c1"]);
    expect(byId["s1"]?.data["classId"]).toBe("c1");
    expect(byId["local-teacher"]?.data["lastLiveClassId"]).toBe("c1");
    expect(byId["k1"]?.hash).toBe(contentHash(byId["k1"]?.data));
  });

  it("only suggests classes with the same name but different content", () => {
    const result = run([
      klasse("c1"),
      klasse("c2", { teacherName: "Herr Roth" }),
    ]);
    expect(result.merged).toEqual([]);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]).toMatchObject({
      kind: "duplicate",
      recordId: "c1",
      otherRecordId: "c2",
      label: "Klasse 5b",
    });
    expect(
      run(
        [klasse("c1"), klasse("c2", { teacherName: "Herr Roth" })],
        [result.conflicts[0]?.id as string],
      ).conflicts,
    ).toEqual([]);
  });

  it("normalises names and ignores a different school year only when equal", () => {
    expect(
      run([klasse("c1"), klasse("c2", { name: "  5B " })]).merged,
    ).toHaveLength(1);
    expect(
      run([klasse("c1"), klasse("c2", { schoolYear: "2027/28" })]).conflicts,
    ).toEqual([]);
  });

  it("merges material with identical content despite usage and class differences", () => {
    const material = (id: string, over: SyncData = {}) =>
      entry("contentPackages", id, {
        id,
        title: "Diktat 1",
        source: "Hund;dog",
        kind: "vocabulary",
        revision: 1,
        createdAt:
          id === "m1" ? "2026-09-01T08:00:00Z" : "2026-09-05T08:00:00Z",
        updatedAt: "2026-09-05T08:00:00Z",
        ...over,
      });
    const same = run([
      material("m1"),
      material("m2", { lastUsedAt: "2026-09-09T08:00:00Z", revision: 3 }),
      entry("assignments", "a1", { materialId: "m2", classIds: ["c1"] }),
    ]);
    expect(same.merged).toEqual([
      { table: "contentPackages", dropped: "m2", kept: "m1" },
    ]);
    expect(same.records.find((r) => r.id === "a1")?.data["materialId"]).toBe(
      "m1",
    );
    const different = run([
      material("m1"),
      material("m2", { source: "Katze;cat" }),
    ]);
    expect(different.merged).toEqual([]);
    expect(different.conflicts).toHaveLength(1);
  });

  it("never merges children automatically", () => {
    const result = run([
      entry("members", "k1", { classId: "c1", displayName: "Fuchs" }),
      entry("members", "k2", { classId: "c1", displayName: "fuchs " }),
      entry("members", "k3", { classId: "c2", displayName: "Fuchs" }),
    ]);
    expect(result.merged).toEqual([]);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]?.otherRecordId).toBe("k2");
  });

  it("leaves records without a name or class alone", () => {
    expect(
      run([
        entry("classes", "c1", {}),
        entry("classes", "c2", {}),
        entry("members", "k1", { displayName: "A" }),
        entry("members", "k2", { displayName: "A" }),
      ]).conflicts,
    ).toEqual([]);
  });
});
