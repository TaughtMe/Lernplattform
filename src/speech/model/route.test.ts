import { describe, expect, it } from "vitest";
import { chooseSpeechRoute, speechRoutes, type RouteInput } from "./route";

const base: RouteInput = {
  modelAllowed: false,
  modelAvailable: false,
  localSystemVoice: false,
};

describe("Wahl der Stimme", () => {
  it("nimmt ohne Lernraum-Stimme nur eine lokale Gerätestimme", () => {
    expect(speechRoutes({ ...base, localSystemVoice: true })).toEqual([
      "system",
    ]);
    expect(speechRoutes(base)).toEqual([]);
    expect(
      speechRoutes({ ...base, modelAvailable: true, localSystemVoice: true }),
    ).toEqual(["system"]);
  });

  it("bleibt mit Lernraum-Stimme, aber ohne Modell für die Sprache bei der Gerätestimme", () => {
    expect(
      speechRoutes({ ...base, modelAllowed: true, localSystemVoice: true }),
    ).toEqual(["system"]);
    expect(chooseSpeechRoute({ ...base, modelAllowed: true })).toBe("none");
  });

  it("nimmt mit Modell zuerst das Modell, dann nur lokale Stimmen", () => {
    const allowed = { ...base, modelAllowed: true, modelAvailable: true };
    expect(speechRoutes({ ...allowed, localSystemVoice: true })).toEqual([
      "model",
      "system",
    ]);
    expect(speechRoutes(allowed)).toEqual(["model"]);
    expect(chooseSpeechRoute(allowed)).toBe("model");
  });
});
