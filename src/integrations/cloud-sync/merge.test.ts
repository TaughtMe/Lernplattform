import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { contentHash } from "./hash";
import { createClock, formatHlc } from "./hlc";
import { mergeStates } from "./merge";
import type {
  LocalSyncRecord,
  SyncData,
  SyncRecord,
  SyncTable,
  SyncTombstone,
} from "./model";
import { markSynced, reconcileLocal, type LocalRow } from "./stamping";

const NOW = "2026-10-05T10:00:00.000Z";
const hlc = (ms: number, device = "a") => formatHlc({ ms, counter: 0, device });

function record(
  table: SyncTable,
  id: string,
  data: SyncData,
  at: number,
  device = "a",
  extra: Partial<LocalSyncRecord> = {},
): LocalSyncRecord {
  return {
    table,
    id,
    hlc: hlc(at, device),
    device,
    hash: contentHash(data),
    data,
    ...extra,
  };
}

const tombstone = (
  table: SyncTable,
  id: string,
  at: number,
  device = "a",
): SyncTombstone => ({ table, id, hlc: hlc(at, device), device });

const empty = { tombstones: [], resolved: [] } as const;

describe("mergeStates", () => {
  it("does nothing when both sides are equal", () => {
    const entry = record("classes", "c1", { name: "5b" }, 1);
    const result = mergeStates({
      local: { ...empty, records: [{ ...entry, baseHash: entry.hash }] },
      remote: { ...empty, records: [entry] },
      now: NOW,
    });
    expect(result.put).toEqual([]);
    expect(result.remove).toEqual([]);
    expect(result.needsUpload).toBe(false);
    expect(result.conflicts).toEqual([]);
  });

  it("uploads a local change and takes a remote change", () => {
    const base = record("classes", "c1", { name: "5b" }, 1);
    const changedLocal = record("classes", "c1", { name: "5c" }, 5, "a", {
      baseHash: base.hash,
    });
    const up = mergeStates({
      local: { ...empty, records: [changedLocal] },
      remote: { ...empty, records: [base] },
      now: NOW,
    });
    expect(up.needsUpload).toBe(true);
    expect(up.put).toEqual([]);
    expect(up.records[0]?.data).toEqual({ name: "5c" });

    const down = mergeStates({
      local: { ...empty, records: [{ ...base, baseHash: base.hash }] },
      remote: { ...empty, records: [{ ...changedLocal, device: "b" }] },
      now: NOW,
    });
    expect(down.put).toHaveLength(1);
    expect(down.needsUpload).toBe(false);
  });

  it("keeps the newer version of a double edit and records the other as conflict", () => {
    const base = record("contentPackages", "m1", { title: "Start" }, 1);
    const mine = record("contentPackages", "m1", { title: "Mein" }, 5, "a", {
      baseHash: base.hash,
    });
    const theirs = record("contentPackages", "m1", { title: "Ihr" }, 9, "b");
    const result = mergeStates({
      local: { ...empty, records: [mine] },
      remote: { ...empty, records: [theirs] },
      now: NOW,
    });
    expect(result.records[0]?.data).toEqual({ title: "Ihr" });
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]).toMatchObject({
      kind: "changed",
      label: "Material „Ihr“",
      kept: { device: "b" },
      other: { device: "a", data: { title: "Mein" } },
    });
    // Die Gegenseite sieht denselben Konflikt mit derselben ID.
    const mirrored = mergeStates({
      local: {
        ...empty,
        records: [{ ...theirs, baseHash: base.hash }],
      },
      remote: { ...empty, records: [mine] },
      now: NOW,
    });
    expect(mirrored.conflicts[0]?.id).toBe(result.conflicts[0]?.id);
    // Entschiedene Konflikte tauchen nicht wieder auf.
    const decided = mergeStates({
      local: {
        records: [mine],
        tombstones: [],
        resolved: [result.conflicts[0]?.id as string],
      },
      remote: { ...empty, records: [theirs] },
      now: NOW,
    });
    expect(decided.conflicts).toEqual([]);
    expect(decided.resolved).toContain(result.conflicts[0]?.id);
  });

  it("lets deletion win unless the change is newer than the deletion", () => {
    const entry = record("classes", "c1", { name: "5b" }, 5);
    const deleted = mergeStates({
      local: { ...empty, records: [{ ...entry, baseHash: entry.hash }] },
      remote: {
        ...empty,
        tombstones: [tombstone("classes", "c1", 9, "b")],
        records: [],
      },
      now: NOW,
    });
    expect(deleted.remove).toEqual([{ table: "classes", id: "c1" }]);
    expect(deleted.tombstones).toHaveLength(1);
    expect(deleted.conflicts).toEqual([]);

    const restored = mergeStates({
      local: {
        ...empty,
        records: [{ ...entry, hlc: hlc(20), baseHash: entry.hash }],
      },
      remote: {
        ...empty,
        tombstones: [tombstone("classes", "c1", 9, "b")],
        records: [],
      },
      now: NOW,
    });
    expect(restored.remove).toEqual([]);
    expect(restored.tombstones).toEqual([]);
    expect(restored.needsUpload).toBe(true);
    expect(restored.conflicts[0]).toMatchObject({
      kind: "deleted",
      label: "Klasse 5b",
    });
  });

  it("takes the submission with the higher sequence without a conflict", () => {
    const low = record("submissions", "s1", { sequence: 1 }, 99, "a", {
      baseHash: "alt",
    });
    const high = record("submissions", "s1", { sequence: 2 }, 1, "b");
    const result = mergeStates({
      local: { ...empty, records: [low] },
      remote: { ...empty, records: [high] },
      now: NOW,
    });
    expect(result.records[0]?.data).toEqual({ sequence: 2 });
    expect(result.conflicts).toEqual([]);
  });

  it("takes the later writing relief grant over the newer record", () => {
    const base = { classId: "c", displayName: "Fuchs" };
    const mine = record(
      "members",
      "k1",
      {
        ...base,
        writingRelief: true,
        writingReliefIssuedAt: "2026-10-02T08:00:00.000Z",
        writingReliefSignature: "neu",
      },
      5,
      "a",
      { baseHash: "alt" },
    );
    const theirs = record(
      "members",
      "k1",
      {
        ...base,
        displayName: "Fuchs B.",
        writingRelief: true,
        writingReliefIssuedAt: "2026-10-01T08:00:00.000Z",
        writingReliefSignature: "alt",
      },
      9,
      "b",
    );
    const result = mergeStates({
      local: { ...empty, records: [mine] },
      remote: { ...empty, records: [theirs] },
      now: NOW,
    });
    expect(result.records[0]?.data).toMatchObject({
      displayName: "Fuchs B.",
      writingReliefSignature: "neu",
    });
    expect(result.records[0]?.hash).toBe(contentHash(result.records[0]?.data));
  });

  it("drops relief fields the newer record revoked only when the other has none", () => {
    const mine = record("members", "k1", { displayName: "A" }, 9, "a", {
      baseHash: "alt",
    });
    const theirs = record(
      "members",
      "k1",
      {
        displayName: "A",
        writingRelief: true,
        writingReliefIssuedAt: "2026-10-01T08:00:00.000Z",
        writingReliefSignature: "x",
      },
      5,
      "b",
    );
    const result = mergeStates({
      local: { ...empty, records: [mine] },
      remote: { ...empty, records: [theirs] },
      now: NOW,
    });
    // Neuere Marke ohne Freigabe: Entzug gilt, weil keine Ausstellung zu vergleichen ist.
    expect(result.records[0]?.data).toMatchObject({
      writingReliefSignature: "x",
    });
  });

  it("never replaces an existing class seal and reports the affected children", () => {
    const seal = (publicKey: string) => ({
      privateJwk: {
        kty: "EC" as const,
        crv: "P-256" as const,
        x: "x",
        y: "y",
        d: publicKey,
      },
      publicKey,
    });
    const cls = record("classes", "c1", { name: "5b" }, 1, "a", {
      baseHash: contentHash({ name: "5b" }),
      secrets: { seal: seal("lokal") },
    });
    const kid = record(
      "members",
      "k1",
      { classId: "c1", writingRelief: true },
      1,
    );
    const result = mergeStates({
      local: { ...empty, records: [cls, kid] },
      remote: {
        ...empty,
        records: [
          { ...cls, device: "b", secrets: { seal: seal("cloud") } },
          kid,
        ],
      },
      now: NOW,
    });
    const merged = result.records.find((r) => r.table === "classes");
    expect(merged?.secrets?.seal?.publicKey).toBe("cloud");
    expect(result.put.map((r) => r.id)).toContain("c1");
    expect(result.conflicts[0]).toMatchObject({
      kind: "seal",
      affectedMemberIds: ["k1"],
    });
    expect(result.needsUpload).toBe(false);
  });

  it("keeps a remote seal when the local side has none", () => {
    const seal = {
      privateJwk: {
        kty: "EC" as const,
        crv: "P-256" as const,
        x: "x",
        y: "y",
        d: "d",
      },
      publicKey: "p",
    };
    const bare = record("classes", "c1", { name: "5b" }, 1);
    const result = mergeStates({
      local: { ...empty, records: [bare] },
      remote: { ...empty, records: [{ ...bare, secrets: { seal } }] },
      now: NOW,
    });
    expect(result.put[0]?.secrets?.seal?.publicKey).toBe("p");
    expect(result.conflicts).toEqual([]);
  });

  it("keeps local-only records and remote-only records", () => {
    const result = mergeStates({
      local: { ...empty, records: [record("classes", "c1", { n: 1 }, 1)] },
      remote: {
        ...empty,
        records: [record("classes", "c2", { n: 2 }, 1, "b")],
      },
      now: NOW,
    });
    expect(result.records.map((r) => r.id)).toEqual(["c1", "c2"]);
    expect(result.put.map((r) => r.id)).toEqual(["c2"]);
    expect(result.needsUpload).toBe(true);
  });

  it("labels every table", () => {
    const labels = (
      [
        ["classes", { name: "5b" }],
        ["members", { displayName: "Fuchs" }],
        ["contentPackages", { title: "T" }],
        ["assignments", { title: "A" }],
        ["profiles", {}],
        ["classSettings", {}],
        ["submissions", {}],
      ] as const
    ).map(([table, data]) => {
      const entry = record(table, "x", data, 1);
      const other = record(table, "x", { ...data, z: 1 }, 9, "b");
      return mergeStates({
        local: { ...empty, records: [{ ...entry, baseHash: "alt" }] },
        remote: { ...empty, records: [other] },
        now: NOW,
      }).conflicts[0]?.label;
    });
    expect(labels).toEqual([
      "Klasse 5b",
      "Kind Fuchs",
      "Material „T“",
      "Aufgabe „A“",
      "Lehrerprofil",
      "Klasseneinstellungen",
      undefined,
    ]);
  });
});

/** Ein simuliertes Gerät mit Datenbank und Stempeln, ohne Dexie. */
class Device {
  rows = new Map<string, SyncData>();
  stamps: LocalSyncRecord[] = [];
  tombstones: SyncTombstone[] = [];
  resolved: string[] = [];
  now = 1000;
  conflicts = 0;
  private readonly clock;
  constructor(readonly id: string) {
    this.clock = createClock(id);
  }
  private static key = (table: SyncTable, id: string) => `${table}:${id}`;
  set(id: string, data: SyncData) {
    this.rows.set(Device.key("contentPackages", id), data);
  }
  delete(id: string) {
    this.rows.delete(Device.key("contentPackages", id));
  }
  advance(ms: number) {
    this.now += ms;
  }
  data() {
    return Object.fromEntries(
      [...this.rows.entries()].sort(([a], [b]) => (a < b ? -1 : 1)),
    );
  }
  sync(cloud: Cloud) {
    const localRows: LocalRow[] = [...this.rows].map(([key, data]) => ({
      table: "contentPackages",
      id: key.slice("contentPackages:".length),
      data,
    }));
    const local = reconcileLocal({
      rows: localRows,
      previous: this.stamps,
      tombstones: this.tombstones,
      device: this.id,
      tick: () => this.clock.tick(this.now),
    });
    for (const entry of [...cloud.records, ...cloud.tombstones]) {
      this.clock.observe(entry.hlc, this.now);
    }
    const merged = mergeStates({
      local: {
        records: local.records,
        tombstones: local.tombstones,
        resolved: this.resolved,
      },
      remote: cloud,
      now: NOW,
    });
    for (const entry of merged.remove) {
      this.rows.delete(Device.key(entry.table, entry.id));
    }
    for (const entry of merged.put) {
      this.rows.set(Device.key(entry.table, entry.id), entry.data);
    }
    this.conflicts += merged.conflicts.length;
    if (merged.needsUpload) {
      cloud.records = merged.records;
      cloud.tombstones = merged.tombstones;
      cloud.resolved = merged.resolved;
    }
    this.stamps = markSynced(merged, true);
    this.tombstones = merged.tombstones;
    this.resolved = merged.resolved;
  }
}

type Cloud = {
  records: SyncRecord[];
  tombstones: SyncTombstone[];
  resolved: string[];
};

describe("convergence across devices", () => {
  it("lets two devices share material, edits and deletions", () => {
    const cloud: Cloud = { records: [], tombstones: [], resolved: [] };
    const home = new Device("home");
    const board = new Device("board");
    home.set("a", { title: "Diktat" });
    home.sync(cloud);
    board.sync(cloud);
    expect(board.data()).toEqual(home.data());
    board.advance(10);
    board.set("a", { title: "Diktat 2" });
    board.set("b", { title: "Neu" });
    board.sync(cloud);
    home.advance(20);
    home.sync(cloud);
    expect(home.data()).toEqual(board.data());
    home.advance(10);
    home.delete("a");
    home.sync(cloud);
    board.advance(20);
    board.sync(cloud);
    expect(board.data()).toEqual({ "contentPackages:b": { title: "Neu" } });
  });

  it("converges for random change sequences on three devices", () => {
    const operation = fc.oneof(
      fc.record({
        kind: fc.constant("set" as const),
        device: fc.integer({ min: 0, max: 2 }),
        id: fc.constantFrom("a", "b", "c"),
        value: fc.integer({ min: 0, max: 3 }),
      }),
      fc.record({
        kind: fc.constant("delete" as const),
        device: fc.integer({ min: 0, max: 2 }),
        id: fc.constantFrom("a", "b", "c"),
      }),
      fc.record({
        kind: fc.constant("sync" as const),
        device: fc.integer({ min: 0, max: 2 }),
      }),
    );
    fc.assert(
      fc.property(fc.array(operation, { maxLength: 40 }), (operations) => {
        const cloud: Cloud = { records: [], tombstones: [], resolved: [] };
        const devices = ["a", "b", "c"].map((id) => new Device(id));
        for (const step of operations) {
          const device = devices[step.device] as Device;
          device.advance(7);
          if (step.kind === "set") device.set(step.id, { v: step.value });
          else if (step.kind === "delete") device.delete(step.id);
          else device.sync(cloud);
        }
        // Am Ende gleichen alle ab, zweimal reihum.
        for (let round = 0; round < 2; round += 1) {
          for (const device of devices) {
            device.advance(50);
            device.sync(cloud);
          }
        }
        const [first, ...rest] = devices as [Device, ...Device[]];
        for (const device of rest) expect(device.data()).toEqual(first.data());
        // Idempotent: ein weiterer Abgleich ändert nichts mehr.
        const before = JSON.stringify(first.data());
        first.advance(50);
        first.sync(cloud);
        expect(JSON.stringify(first.data())).toBe(before);
      }),
      { numRuns: 200 },
    );
  });

  it("loses no edit: every final value was written by some device", () => {
    const cloud: Cloud = { records: [], tombstones: [], resolved: [] };
    const a = new Device("a");
    const b = new Device("b");
    a.set("x", { v: 1 });
    a.sync(cloud);
    b.sync(cloud);
    a.advance(5);
    b.advance(6);
    a.set("x", { v: 2 });
    b.set("x", { v: 3 });
    a.sync(cloud);
    b.sync(cloud);
    a.advance(50);
    a.sync(cloud);
    expect(a.data()).toEqual(b.data());
    expect([{ v: 2 }, { v: 3 }]).toContainEqual(a.data()["contentPackages:x"]);
    expect(a.conflicts + b.conflicts).toBeGreaterThan(0);
  });
});
