import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { PERSONAL_BACKUP_SCHEMA_VERSION } from "../../domain/personal-backup";
import { PersonalLearningDatabase } from "../../storage/personal-learning-events";
import {
  buildPersonalBackup,
  PersonalBackupStorageError,
  readPersonalBackupFile,
  restorePersonalBackupFromDirectory,
  restorePersonalBackupFromFile,
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

  it("maps unsupported devices and unknown write errors", async () => {
    const source = new PersonalLearningDatabase(
      `personal-backup-directory-${crypto.randomUUID()}`,
    );
    databases.push(source);

    const unsupported = fakeDirectory();
    unsupported.setWriteError(new DOMException("nein", "NotSupportedError"));
    await expect(
      savePersonalBackupToDirectory(unsupported.directory, source),
    ).rejects.toMatchObject({ code: "unsupported" });

    const broken = fakeDirectory();
    const cause = new Error("Platte voll");
    broken.setWriteError(cause);
    const error = await savePersonalBackupToDirectory(
      broken.directory,
      source,
    ).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PersonalBackupStorageError);
    expect(error).toMatchObject({ code: "io", cause });
  });

  it("maps a missing backup file on restore to an io error", async () => {
    const target = new PersonalLearningDatabase(
      `personal-backup-directory-${crypto.randomUUID()}`,
    );
    databases.push(target);
    const directory = {
      async getFileHandle() {
        throw new DOMException("fehlt", "NotFoundError");
      },
    } as unknown as FileSystemDirectoryHandle;

    await expect(
      restorePersonalBackupFromDirectory(directory, target),
    ).rejects.toMatchObject({ code: "io" });
  });

  it("reads a backup file and rejects damaged ones", async () => {
    const source = new PersonalLearningDatabase(
      `personal-backup-directory-${crypto.randomUUID()}`,
    );
    databases.push(source);
    const directory = fakeDirectory();
    const saved = await savePersonalBackupToDirectory(
      directory.directory,
      source,
    );

    const handle = await directory.directory.getFileHandle(saved.filename);
    const file = await handle.getFile();
    await expect(readPersonalBackupFile(file)).resolves.toEqual(saved.backup);
    await expect(
      readPersonalBackupFile(new File(["{kaputt"], "x.json")),
    ).rejects.toMatchObject({ code: "corrupt" });
  });

  it("restores a file and reports skipped records or a newer app version", async () => {
    const source = new PersonalLearningDatabase(
      `personal-backup-directory-${crypto.randomUUID()}`,
    );
    const target = new PersonalLearningDatabase(
      `personal-backup-directory-${crypto.randomUUID()}`,
    );
    databases.push(source, target);
    const backup = await buildPersonalBackup(source);
    const file = (value: unknown) =>
      new File([JSON.stringify(value)], "sicherung.json");

    const withUnreadable = {
      ...backup,
      data: {
        ...backup.data,
        wordBoxes: [{ id: "kaputt" }],
      },
    };
    await expect(
      restorePersonalBackupFromFile(file(withUnreadable), target),
    ).resolves.toMatchObject({
      skipped: [{ table: "wordBoxes", id: "kaputt" }],
    });

    await expect(
      restorePersonalBackupFromFile(
        file({ ...backup, schemaVersion: 2 }),
        target,
      ),
    ).rejects.toMatchObject({
      code: "newer-version",
      message:
        "Diese Sicherung stammt aus einer neueren App-Version. Bitte zuerst die App aktualisieren.",
    });
    await expect(
      restorePersonalBackupFromFile(new File(["{kaputt"], "x.json"), target),
    ).rejects.toMatchObject({ code: "corrupt" });
  });

  it("builds an in-memory backup from the database", async () => {
    const source = new PersonalLearningDatabase(
      `personal-backup-directory-${crypto.randomUUID()}`,
    );
    databases.push(source);
    const backup = await buildPersonalBackup(source);
    expect(backup.schemaVersion).toBe(PERSONAL_BACKUP_SCHEMA_VERSION);
  });
});
