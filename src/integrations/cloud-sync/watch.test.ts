import "fake-indexeddb/auto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createTeacherContentLibraryRepository,
  TeacherClassDatabase,
} from "../../storage/teacher-class-settings";
import { createTeacherSyncStore } from "../../storage/teacher-sync-store";
import { watchDatabaseChanges } from "./watch";

const databases: TeacherClassDatabase[] = [];
afterEach(async () => {
  await Promise.all(
    databases.splice(0).map(async (database) => {
      database.close();
      await database.delete();
    }),
  );
});

const material = {
  id: "m1",
  revision: 1,
  title: "Diktat",
  source: "Hund;dog",
  promptLocale: "de",
  answerLocale: "en",
  createdAt: "2026-09-02T08:00:00.000Z",
  updatedAt: "2026-09-02T08:00:00.000Z",
};

describe("watchDatabaseChanges", () => {
  it("notices writes through another instance but not the sync bookkeeping", async () => {
    const name = `watch-${crypto.randomUUID()}`;
    const seen = new TeacherClassDatabase(name);
    const writer = new TeacherClassDatabase(name);
    databases.push(seen, writer);
    // Das Anlegen der Datenbank selbst meldet Dexie ebenfalls; erst danach beobachten.
    await seen.open();
    await writer.open();
    await new Promise((resolve) => setTimeout(resolve, 20));
    const onChange = vi.fn();
    const stop = watchDatabaseChanges(name, onChange);
    await createTeacherSyncStore(writer).patchState({ deviceName: "X" });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(onChange).not.toHaveBeenCalled();
    await createTeacherContentLibraryRepository(writer).put(material);
    await vi.waitFor(() => expect(onChange).toHaveBeenCalled());
    stop();
    onChange.mockClear();
    await createTeacherContentLibraryRepository(writer).put({
      ...material,
      title: "Neu",
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("ignores other databases", async () => {
    const other = new TeacherClassDatabase(`other-${crypto.randomUUID()}`);
    databases.push(other);
    const onChange = vi.fn();
    const stop = watchDatabaseChanges(`watch-${crypto.randomUUID()}`, onChange);
    await createTeacherContentLibraryRepository(other).put(material);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(onChange).not.toHaveBeenCalled();
    stop();
  });
});
