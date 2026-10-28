import * as z from "zod";
import { describe, expect, it } from "vitest";
import {
  ROUND_SNAPSHOT_MAX_AGE_MS,
  buildRoundSnapshot,
  isRoundSnapshotExpired,
  parseRoundSnapshot,
  resumeProgressLabel,
} from "./round-snapshot";

const now = new Date("2026-10-28T10:00:00.000Z");
const schema = z.object({ index: z.number().int() });

function snapshot(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    ...buildRoundSnapshot({
      module: "kopfrechnen",
      roundId: "runde-1",
      startedAt: "2026-10-28T09:50:00.000Z",
      now: new Date("2026-10-28T09:59:00.000Z"),
      done: 3,
      total: 10,
      state: { index: 3 },
    }),
    ...overrides,
  });
}

function read(raw: string | null) {
  return parseRoundSnapshot(raw, { module: "kopfrechnen", now, state: schema });
}

describe("buildRoundSnapshot", () => {
  it("setzt Version, Zeitpunkt und Stand", () => {
    expect(
      buildRoundSnapshot({
        module: "lernbox",
        roundId: "r",
        startedAt: "2026-10-28T09:00:00.000Z",
        now,
        done: 2,
        total: 5,
        state: { a: 1 },
      }),
    ).toEqual({
      v: 1,
      module: "lernbox",
      roundId: "r",
      startedAt: "2026-10-28T09:00:00.000Z",
      savedAt: "2026-10-28T10:00:00.000Z",
      done: 2,
      total: 5,
      state: { a: 1 },
    });
  });

  it("zwingt done in den Bereich 0 bis total und total auf mindestens 1", () => {
    const base = {
      module: "lernbox" as const,
      roundId: "r",
      startedAt: "2026-10-28T09:00:00.000Z",
      now,
      state: {},
    };
    expect(buildRoundSnapshot({ ...base, done: 99, total: 5 }).done).toBe(5);
    expect(buildRoundSnapshot({ ...base, done: -2, total: 5 }).done).toBe(0);
    expect(buildRoundSnapshot({ ...base, done: 0, total: 0 }).total).toBe(1);
  });
});

describe("parseRoundSnapshot", () => {
  it("liest einen gültigen Zwischenstand", () => {
    expect(read(snapshot())).toMatchObject({
      roundId: "runde-1",
      done: 3,
      total: 10,
      state: { index: 3 },
    });
  });

  it("verwirft fehlende, kaputte und fremde Einträge", () => {
    expect(read(null)).toBeNull();
    expect(read("")).toBeNull();
    expect(read("{kaputt")).toBeNull();
    expect(read("[]")).toBeNull();
    expect(read(JSON.stringify({ v: 1 }))).toBeNull();
  });

  it("verwirft eine andere Version und ein anderes Modul", () => {
    expect(read(snapshot({ v: 2 }))).toBeNull();
    expect(read(snapshot({ module: "lernbox" }))).toBeNull();
    expect(read(snapshot({ module: "unbekannt" }))).toBeNull();
  });

  it("verwirft Inhalt, der nicht zum Schema des Moduls passt", () => {
    expect(read(snapshot({ state: { index: "drei" } }))).toBeNull();
    expect(read(snapshot({ state: null }))).toBeNull();
  });

  it("verwirft unplausible Zähler und Zeitangaben", () => {
    expect(read(snapshot({ done: -1 }))).toBeNull();
    expect(read(snapshot({ total: 0 }))).toBeNull();
    expect(read(snapshot({ savedAt: "gestern" }))).toBeNull();
  });

  it("verwirft einen Zwischenstand nach 24 Stunden", () => {
    const old = new Date(now.getTime() - ROUND_SNAPSHOT_MAX_AGE_MS - 1);
    expect(read(snapshot({ savedAt: old.toISOString() }))).toBeNull();
    const fresh = new Date(now.getTime() - ROUND_SNAPSHOT_MAX_AGE_MS + 60_000);
    expect(read(snapshot({ savedAt: fresh.toISOString() }))).not.toBeNull();
  });
});

describe("isRoundSnapshotExpired", () => {
  it("lässt kleine Uhrabweichungen zu, nicht aber weit in der Zukunft", () => {
    const soon = new Date(now.getTime() + 60_000).toISOString();
    const later = new Date(now.getTime() + 3_600_000).toISOString();
    expect(isRoundSnapshotExpired(soon, now)).toBe(false);
    expect(isRoundSnapshotExpired(later, now)).toBe(true);
  });
});

describe("resumeProgressLabel", () => {
  it("nennt den Stand in Kindersprache", () => {
    expect(resumeProgressLabel(3, 10)).toBe("3 von 10");
  });
});
