import { beforeEach, describe, expect, it } from "vitest";
import {
  forgetTransfers,
  readActiveTransfers,
  rememberTransfer,
  transferTimeLeft,
  type ActiveTransfer,
} from "./active-transfers";

const NOW = Date.parse("2026-10-19T14:05:00");
const HOUR = 3600_000;

const transfer = (
  packageId: string,
  publishedAt: number,
  code = "A".repeat(24),
): ActiveTransfer => ({
  packageId,
  title: packageId,
  pairs: 3,
  code,
  publishedAt: new Date(publishedAt).toISOString(),
  expiresAt: new Date(publishedAt + 24 * HOUR).toISOString(),
});

describe("laufende Freigaben", () => {
  beforeEach(() => window.localStorage.clear());

  it("merkt je Paket die neueste und vergisst abgelaufene", () => {
    rememberTransfer(transfer("alt", NOW - 30 * HOUR), NOW - 30 * HOUR);
    rememberTransfer(transfer("a", NOW - HOUR), NOW);
    rememberTransfer(transfer("a", NOW, "B".repeat(24)), NOW);
    const active = readActiveTransfers(NOW);
    expect(active.map((entry) => entry.code)).toEqual(["B".repeat(24)]);
    expect(forgetTransfers("a", NOW)).toEqual([]);
  });

  it("nennt Restzeit und Ende", () => {
    const entry = transfer("c", NOW - 18 * HOUR);
    const time = transferTimeLeft(entry, NOW);
    expect(time.short).toBe("noch 6 h");
    expect(time.until).toBe("bis 20:05");
    expect(time.fraction).toBeCloseTo(0.25);
    const fresh = transferTimeLeft(transfer("d", NOW), NOW);
    expect(fresh.short).toBe("noch 24 h");
    expect(fresh.until).toBe("bis morgen 14:05");
    expect(transferTimeLeft(entry, NOW + 6 * HOUR - 10 * 60_000).short).toBe(
      "noch 10 min",
    );
  });
});
