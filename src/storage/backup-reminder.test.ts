import { describe, expect, it } from "vitest";
import {
  backupReminder,
  LAST_BACKUP_KEY,
  readLastBackup,
  writeLastBackup,
} from "./backup-reminder";

function memory() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
  };
}

describe("Sicherungserinnerung", () => {
  it("speichert und liest den Zeitpunkt der letzten Sicherung", () => {
    const storage = memory();
    expect(readLastBackup(() => storage)).toBeNull();
    expect(
      writeLastBackup(new Date("2026-09-01T10:00:00Z"), () => storage),
    ).toBe(true);
    expect(readLastBackup(() => storage)?.toISOString()).toBe(
      "2026-09-01T10:00:00.000Z",
    );
    storage.setItem(LAST_BACKUP_KEY, "kaputt");
    expect(readLastBackup(() => storage)).toBeNull();
  });

  it("bleibt bei gesperrtem Speicher bedienbar", () => {
    const blocked = () => {
      throw new Error("blocked");
    };
    expect(readLastBackup(blocked)).toBeNull();
    expect(writeLastBackup(new Date(), blocked)).toBe(false);
  });

  it("unterscheidet nie, veraltet und aktuell", () => {
    const now = new Date("2026-09-29T12:00:00Z");
    expect(backupReminder(null, now)).toEqual({ level: "never", days: null });
    expect(backupReminder(new Date("2026-09-10T12:00:00Z"), now)).toEqual({
      level: "old",
      days: 19,
    });
    expect(backupReminder(new Date("2026-09-25T12:00:00Z"), now)).toEqual({
      level: "ok",
      days: 4,
    });
  });
});
