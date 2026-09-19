import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ANIMALS,
  animalFileName,
  createLearnerProfile,
  learnerDisplayName,
  learnerProfileSchema,
  studentAnimalFileName,
} from "./learner-profile";

describe("animal profile", () => {
  it("offers every original SVG once", () => {
    expect(ANIMALS).toHaveLength(60);
    expect(
      new Set(ANIMALS.map((animal) => animalFileName(animal.name))).size,
    ).toBe(60);
    for (const animal of ANIMALS)
      expect(
        existsSync(`public/animals/${animalFileName(animal.name)}.svg`),
        animal.name,
      ).toBe(true);
  });
  it.each([
    ["Fuchs", "Schneller Fuchs"],
    ["Katze", "Schnelle Katze"],
    ["Einhorn", "Schnelles Einhorn"],
  ])("keeps %s and forms its name", (animal, name) => {
    expect(learnerDisplayName(createLearnerProfile(animal, () => 0))).toBe(
      name,
    );
  });
  it("generates a valid random fallback and rejects external profile values", () => {
    expect(
      learnerProfileSchema.safeParse(createLearnerProfile(undefined, () => 0.5))
        .success,
    ).toBe(true);
    expect(createLearnerProfile("unknown", () => 0).animal).toBe("Koala");
    expect(createLearnerProfile(undefined, () => 1).animal).toBe("Perserkatze");
    expect(
      learnerProfileSchema.safeParse({
        version: 2,
        animal: "Fuchs",
        adjective: "Flink",
      }).success,
    ).toBe(false);
    expect(
      learnerProfileSchema.safeParse({
        version: 1,
        animal: "../../secret",
        adjective: "Flink",
      }).success,
    ).toBe(false);
    expect(
      learnerProfileSchema.safeParse({
        version: 1,
        animal: "Fuchs",
        adjective: "secret",
      }).success,
    ).toBe(false);
  });
  it.each([
    ["Flinker Roter Panda 2", "roter_panda"],
    ["Mutige Sphynx-Katze 123", "sphynxkatze"],
    ["Schlauer Schäferhund", "deutscher_schaeferhund"],
    ["Flinker Hund 2", "dackel"],
    ["Hund", "dackel"],
    ["Fuchs", "fuchs"],
    ["Unknown", "koala"],
  ])("keeps the right SVG for %s", (name, file) => {
    expect(studentAnimalFileName(name)).toBe(file);
  });
});
