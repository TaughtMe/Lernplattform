import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ANIMALS,
  animalFileName,
  animalTokenFromDisplayName,
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
  it("keeps an unselected animal explicit as null and rejects external profile values", () => {
    expect(createLearnerProfile(undefined, () => 0.5).animal).toBeNull();
    expect(createLearnerProfile("unknown", () => 0).animal).toBeNull();
    expect(
      learnerProfileSchema.safeParse({
        version: 1,
        animal: null,
        adjective: "Flink",
      }).success,
    ).toBe(true);
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
  it("extracts only an allowed animal token from a legacy display name", () => {
    expect(animalTokenFromDisplayName("Schneller Fuchs 2")).toBe("Fuchs");
    expect(animalTokenFromDisplayName("Mia")).toBeNull();
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
