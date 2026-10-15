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
      {
        prompt: "school",
        answer: "Schule",
        promptAlternatives: [],
        answerAlternatives: [],
      },
      {
        prompt: "classroom",
        answer: "Klassenzimmer",
        promptAlternatives: [],
        answerAlternatives: [],
      },
    ]);
  });

  it("reads the tag column and alternatives like the Laufdiktat", () => {
    expect(
      parseTeacherVocabularyPairs(
        "school;Schule;Unit 3\nhouse|home\tHaus|Zuhause\tUnit 4\ncat;Katze; ",
      ),
    ).toEqual([
      {
        prompt: "school",
        answer: "Schule",
        promptAlternatives: [],
        answerAlternatives: [],
        tag: "Unit 3",
      },
      {
        prompt: "house",
        answer: "Haus",
        promptAlternatives: ["home"],
        answerAlternatives: ["Zuhause"],
        tag: "Unit 4",
      },
      {
        prompt: "cat",
        answer: "Katze",
        promptAlternatives: [],
        answerAlternatives: [],
      },
    ]);
  });

  it("puts the tag and alternatives into the bundle, never into the answer", () => {
    const bundle = buildTeacherVocabularyBundle({
      id: "teacher-package-1",
      revision: 0,
      title: "Unit 3",
      source: "school;Schule|Lehranstalt;Unit 3\nclassroom;Klassenzimmer",
      now: "2026-08-25T12:00:00.000Z",
    });
    expect(bundle.vocabulary[0]).toMatchObject({
      prompt: { text: "school" },
      answer: { text: "Schule", alternatives: ["Lehranstalt"] },
      tagIds: ["Unit 3"],
    });
    expect(bundle.vocabulary[0]?.prompt.alternatives).toBeUndefined();
    // Ohne Tag bleibt die Karte ohne Tag, statt die Paket-ID zu tragen.
    expect(bundle.vocabulary[1]?.tagIds).toEqual([]);
    expect(bundle.vocabulary[1]?.answer.alternatives).toBeUndefined();
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
