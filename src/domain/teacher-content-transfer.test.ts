import { describe, expect, it } from "vitest";
import {
  buildTeacherVocabularyBundle,
  parseTeacherVocabularyPairs,
} from "./teacher-content-transfer";

describe("teacher content transfer", () => {
  it("parses semicolon and tab separated vocabulary pairs", () => {
    expect(
      parseTeacherVocabularyPairs(
        "school;Schule\nclassroom\tKlassenzimmer\nkaputt\n;leer",
      ),
    ).toEqual([
      { prompt: "school", answer: "Schule" },
      { prompt: "classroom", answer: "Klassenzimmer" },
    ]);
  });

  it("builds a valid content-only LearningBundle", () => {
    expect(
      buildTeacherVocabularyBundle({
        id: "teacher-package-1",
        revision: 2,
        title: "Unit 1",
        source: "school;Schule\nclassroom;Klassenzimmer",
        sourceId: "teacher-device",
        now: "2026-08-25T12:00:00.000Z",
      }),
    ).toMatchObject({
      schemaVersion: "1.0.0",
      id: "teacher-package-1",
      revision: 2,
      source: { kind: "teacher", id: "teacher-device" },
      vocabulary: [
        { prompt: { text: "school" }, answer: { text: "Schule" } },
        {
          prompt: { text: "classroom" },
          answer: { text: "Klassenzimmer" },
        },
      ],
      stacks: [{ title: "Unit 1" }],
    });
  });

  it("rejects an empty or malformed vocabulary list", () => {
    expect(() =>
      buildTeacherVocabularyBundle({
        id: "empty",
        revision: 1,
        title: "Leer",
        source: "keine Trennung",
      }),
    ).toThrow("mindestens ein gültiges Vokabelpaar");
  });
});
