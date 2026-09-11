import { describe, expect, it } from "vitest";
import {
  createTeacherContentLibraryFile,
  parseTeacherContentLibraryFile,
  type TeacherContentPackage,
} from "./teacher-content-library";

const entry: TeacherContentPackage = {
  id: "package-1",
  revision: 2,
  title: "Englisch · Schule",
  source: "school;Schule",
  promptLocale: "en",
  answerLocale: "de",
  createdAt: "2026-08-25T10:00:00.000Z",
  updatedAt: "2026-08-25T11:00:00.000Z",
};

describe("teacher content library file", () => {
  it("creates a versioned, stable and sorted export", () => {
    const file = createTeacherContentLibraryFile(
      [{ ...entry, id: "package-z" }, entry],
      "2026-08-25T12:00:00.000Z",
    );

    expect(file).toMatchObject({
      format: "lernraum.teacher-content-library",
      version: 1,
      exportedAt: "2026-08-25T12:00:00.000Z",
    });
    expect(file.packages.map(({ id }) => id)).toEqual([
      "package-1",
      "package-z",
    ]);
  });

  it("rejects duplicate package IDs and unknown file versions", () => {
    expect(() => createTeacherContentLibraryFile([entry, entry])).toThrow(
      /Doppelte Paket-ID/,
    );
    expect(() =>
      parseTeacherContentLibraryFile({
        format: "lernraum.teacher-content-library",
        version: 2,
        exportedAt: "2026-08-25T12:00:00.000Z",
        packages: [],
      }),
    ).toThrow();
  });
});
