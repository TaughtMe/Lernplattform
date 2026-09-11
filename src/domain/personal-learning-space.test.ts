import { describe, expect, it } from "vitest";
import {
  findPersonalSubject,
  PERSONAL_SUBJECTS,
} from "./personal-learning-space";

describe("personal learning space", () => {
  it("gives every subject one hub and one free-practice action", () => {
    expect(PERSONAL_SUBJECTS).toHaveLength(4);
    expect(
      new Set(PERSONAL_SUBJECTS.map((subject) => subject.hubRoute)).size,
    ).toBe(PERSONAL_SUBJECTS.length);
    expect(
      PERSONAL_SUBJECTS.every((subject) =>
        subject.practiceLabel.toLocaleLowerCase("de-DE").includes("frei üben"),
      ),
    ).toBe(true);
  });

  it("resolves a subject by its public slug", () => {
    expect(findPersonalSubject("vokabeln")?.id).toBe("vocabulary");
    expect(findPersonalSubject("unbekannt")).toBeUndefined();
  });
});
