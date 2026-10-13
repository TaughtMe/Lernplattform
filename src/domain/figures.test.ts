import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  FIGURES,
  UNLOCK_SEQUENCE,
  advanceUnlock,
  isUnlockComplete,
} from "./figures";
import {
  avatarSrc,
  createLearnerProfile,
  learnerDisplayName,
  learnerProfileSchema,
  profileAvatar,
} from "./learner-profile";

function tap(names: string[]) {
  return names.reduce(advanceUnlock, 0);
}

describe("secret figures", () => {
  it("has a unique SVG file for every figure", () => {
    expect(new Set(FIGURES.map((figure) => figure.id)).size).toBe(
      FIGURES.length,
    );
    for (const figure of FIGURES)
      expect(existsSync(`public/figuren/${figure.id}.svg`), figure.id).toBe(
        true,
      );
  });

  it("unlocks after each of Koala, Tiefseefisch, Löwin tapped twice in order", () => {
    expect(isUnlockComplete(tap([...UNLOCK_SEQUENCE]))).toBe(true);
  });

  it.each([
    [
      "wrong order",
      ["Koala", "Koala", "Löwin", "Löwin", "Tiefseefisch", "Tiefseefisch"],
    ],
    ["only once each", ["Koala", "Tiefseefisch", "Löwin"]],
    [
      "interrupted",
      [
        "Koala",
        "Koala",
        "Tiefseefisch",
        "Fuchs",
        "Tiefseefisch",
        "Löwin",
        "Löwin",
      ],
    ],
  ])("does not unlock for %s", (_label, taps) => {
    expect(isUnlockComplete(tap(taps))).toBe(false);
  });

  it("restarts when the first animal is tapped after a wrong tap", () => {
    expect(isUnlockComplete(tap(["Fuchs", ...UNLOCK_SEQUENCE]))).toBe(true);
    expect(
      isUnlockComplete(
        tap(["Koala", "Fuchs", "Koala", ...UNLOCK_SEQUENCE.slice(1)]),
      ),
    ).toBe(true);
  });

  it("shows a chosen figure instead of the animal and keeps older profiles valid", () => {
    const base = createLearnerProfile("Fuchs", () => 0);
    expect(profileAvatar(base)).toBe("Fuchs");
    const profile = { ...base, figuresUnlocked: true, figure: "yoda-1" };
    expect(learnerProfileSchema.safeParse(profile).success).toBe(true);
    expect(avatarSrc(profileAvatar(profile))).toBe("/figuren/yoda-1.svg");
    // Der Name folgt der Figur, nicht dem vorher gewählten Tier.
    expect(learnerDisplayName(base)).toBe("Schneller Fuchs");
    expect(learnerDisplayName(profile)).toBe("Yoda 1");
    expect(
      learnerProfileSchema.safeParse({ ...base, figure: "unbekannt" }).success,
    ).toBe(false);
  });
});
