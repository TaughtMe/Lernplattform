import { describe, expect, it } from "vitest";
import {
  acceptHouseLetter,
  createHouseLetterCode,
  floors,
  houseContribution,
  houseStandings,
  isoWeek,
  parseHouseLetterCode,
  verifyHouseLetter,
  type HouseLetterPayload,
} from "./houses";

const token = "0123456789abcdef0123456789abcdef";
const classId = "7f4a3c1e-6f2d-4b8a-9c3e-2d1f0a9b8c7d";
const membershipId = "1b2c3d4e-5f60-4718-8a9b-0c1d2e3f4a5b";
const now = new Date("2026-09-28T10:00:00Z");

const payload: HouseLetterPayload = {
  version: 1,
  kind: "house",
  classId,
  membershipId,
  house: "orca",
  week: isoWeek(now),
  sequence: 2,
  points: 120,
};

describe("house points", () => {
  it("normalises floors and caps points per day", () => {
    expect(floors(410)).toBe(8);
    const events = Array.from({ length: 40 }, (_, i) => ({
      occurredAt: now.toISOString(),
      roundId: `r${i % 3}`,
      assessment: {
        knowledge: "correct",
        writing: "correct",
        selfCorrected: false,
      } as const,
    }));
    const result = houseContribution(events, now);
    expect(result.todayPoints).toBe(150);
    expect(result.weekPoints).toBe(150);
    expect(result.rounds).toBe(3);
    expect(result.correct).toBe(40);
  });

  it("ignores events from other weeks", () => {
    const result = houseContribution(
      [
        {
          occurredAt: "2026-08-01T10:00:00Z",
          roundId: "x",
          assessment: {
            knowledge: "correct",
            writing: "correct",
            selfCorrected: false,
          },
        },
      ],
      now,
    );
    expect(result.weekPoints).toBe(0);
  });
});

describe("house letter", () => {
  it("signs, parses and verifies with the enrollment token", async () => {
    const code = await createHouseLetterCode(payload, token);
    const letter = parseHouseLetterCode(code);
    expect(await verifyHouseLetter(letter, token)).toBe(true);
    expect(await verifyHouseLetter(letter, "f".repeat(32))).toBe(false);
    expect(await verifyHouseLetter({ ...letter, points: 900 }, token)).toBe(
      false,
    );
  });

  it("accepts only newer sequence numbers per member and week", async () => {
    const letter = parseHouseLetterCode(
      await createHouseLetterCode(payload, token),
    );
    const first = acceptHouseLetter({}, letter, classId);
    expect(first.status).toBe("neu");
    expect(acceptHouseLetter(first.inbox, letter, classId).status).toBe(
      "doppelt",
    );
    expect(
      acceptHouseLetter(first.inbox, { ...letter, sequence: 1 }, classId)
        .status,
    ).toBe("veraltet");
    expect(
      acceptHouseLetter(first.inbox, { ...letter, sequence: 3 }, classId)
        .status,
    ).toBe("aktualisiert");
    expect(
      acceptHouseLetter(
        first.inbox,
        letter,
        "00000000-0000-4000-8000-000000000000",
      ).status,
    ).toBe("klassenfremd");
    const standings = houseStandings(first.inbox, payload.week);
    expect(standings.find((h) => h.id === "orca")).toMatchObject({
      points: 120,
      active: 1,
      perHead: 120,
    });
  });
});
