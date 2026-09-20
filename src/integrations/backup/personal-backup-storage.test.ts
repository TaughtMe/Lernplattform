import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { PersonalLearningDatabase } from "../../storage/personal-learning-events";
import {
  restorePersonalBackupFromDirectory,
  savePersonalBackupToDirectory,
} from "./personal-backup-storage";

function fakeDirectory(initialText = "") {
  let text = initialText;
  let writeError: unknown;
  const fileHandle = {
    async createWritable() {
      if (writeError) throw writeError;
      return {
        async write(value: string) {
          text = value;
        },
        async close() {},
      };
    },
    async getFile() {
      return new File([text], "lernraum-personal-v1.json", {
        type: "application/json",
      });
    },
  };
  const directory = {
    async getFileHandle() {
      return fileHandle;
    },
  } as unknown as FileSystemDirectoryHandle;
  return {
    directory,
    setText(value: string) {
      text = value;
    },
    setWriteError(error: unknown) {
      writeError = error;
    },
  };
}

describe("personal backup directory storage", () => {
  const databases: PersonalLearningDatabase[] = [];

  afterEach(async () => {
    await Promise.all(databases.map((database) => database.delete()));
  });

  it("writes, verifies, and restores a local directory backup", async () => {
    const source = new PersonalLearningDatabase(
      `personal-backup-directory-${crypto.randomUUID()}`,
    );
    const target = new PersonalLearningDatabase(
      `personal-backup-directory-${crypto.randomUUID()}`,
    );
    databases.push(source, target);
    const directory = fakeDirectory();

    await source.learningWordProgress.add({
      id: "word-1",
      word: "library",
      stage: 2,
      box: 2,
      dueAt: "2026-08-25T12:00:00.000Z",
      attempts: 2,
      incorrectAttempts: 1,
      helpUses: 0,
      lastPracticedAt: "2026-08-25T12:00:00.000Z",
    });

    const saved = await savePersonalBackupToDirectory(
      directory.directory,
      source,
    );
    expect(saved.filename).toBe("lernraum-personal-v1.json");
    expect(saved.bytes).toBeGreaterThan(0);
    await expect(
      restorePersonalBackupFromDirectory(directory.directory, target),
    ).resolves.toMatchObject({ added: 1, conflicts: [] });
    await expect(target.learningWordProgress.get("word-1")).resolves.toEqual(
      expect.objectContaining({ word: "library" }),
    );
  });

  it("rejects damaged local backup files", async () => {
    const directory = fakeDirectory();
    directory.setText("{not-json");
    const target = new PersonalLearningDatabase(
      `personal-backup-directory-${crypto.randomUUID()}`,
    );
    databases.push(target);

    await expect(
      restorePersonalBackupFromDirectory(directory.directory, target),
    ).rejects.toMatchObject({
      name: "PersonalBackupStorageError",
      code: "corrupt",
    });
  });

  it("maps storage quota failures without changing the backup contract", async () => {
    const directory = fakeDirectory();
    directory.setWriteError(new DOMException("quota", "QuotaExceededError"));
    const source = new PersonalLearningDatabase(
      `personal-backup-directory-${crypto.randomUUID()}`,
    );
    databases.push(source);

    await expect(
      savePersonalBackupToDirectory(directory.directory, source),
    ).rejects.toMatchObject({
      name: "PersonalBackupStorageError",
      code: "quota-exceeded",
    });
  });
});
