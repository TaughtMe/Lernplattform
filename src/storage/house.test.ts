import { afterEach, expect, it, vi } from "vitest";
import { createHouseLetterCode, parseHouseLetterCode } from "../domain/houses";
import {
  clearHouseInbox,
  DEFAULT_HOUSE_STATE,
  HOUSE_INBOX_KEY,
  HOUSE_STATE_KEY,
  readHouseInbox,
  readHouseState,
  subscribeHouse,
  writeHouseInbox,
  writeHouseState,
} from "./house";

const classId = "7f4a3c1e-6f2d-4b8a-9c3e-2d1f0a9b8c7d";

afterEach(() => localStorage.clear());

it("keeps the house choice and sequence locally and notifies listeners", () => {
  const listener = vi.fn();
  const unsubscribe = subscribeHouse(listener);
  expect(readHouseState()).toEqual(DEFAULT_HOUSE_STATE);
  writeHouseState((prev) => ({
    ...prev,
    house: "orca",
    sequence: prev.sequence + 1,
  }));
  expect(listener).toHaveBeenCalledOnce();
  expect(readHouseState()).toMatchObject({ house: "orca", sequence: 1 });
  expect(readHouseState()).toBe(readHouseState());
  unsubscribe();
  writeHouseState((prev) => prev);
  expect(listener).toHaveBeenCalledOnce();
});

it("falls back to defaults for damaged data", () => {
  localStorage.setItem(HOUSE_STATE_KEY, "{kaputt");
  expect(readHouseState()).toEqual(DEFAULT_HOUSE_STATE);
  localStorage.setItem(HOUSE_INBOX_KEY, JSON.stringify({ x: "falsch" }));
  expect(readHouseInbox(classId)).toEqual({ letters: {}, log: [] });
});

it("stores letters and the scan log per class and can clear them", async () => {
  const letter = parseHouseLetterCode(
    await createHouseLetterCode(
      {
        version: 1,
        kind: "house",
        classId,
        membershipId: "1b2c3d4e-5f60-4718-8a9b-0c1d2e3f4a5b",
        house: "einhorn",
        week: "2026-W40",
        sequence: 1,
        points: 30,
      },
      "0123456789abcdef0123456789abcdef",
    ),
  );
  const at = new Date().toISOString();
  writeHouseInbox(
    classId,
    { key: letter },
    { alias: "Mia", house: "Einhorn", status: "neu", at },
  );
  writeHouseInbox(classId, { key: letter });
  const inbox = readHouseInbox(classId);
  expect(inbox.letters["key"]?.points).toBe(30);
  expect(inbox.log).toHaveLength(1);
  expect(readHouseInbox("andere-klasse")).toEqual({ letters: {}, log: [] });
  clearHouseInbox(classId);
  expect(readHouseInbox(classId).log).toHaveLength(0);
});
