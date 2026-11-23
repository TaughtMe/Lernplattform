import { describe, expect, it } from "vitest";
import { chooseSpeechRoute, speechRoutes, type RouteInput } from "./route";

const base: RouteInput = {
  modelAllowed: false,
  modelAvailable: false,
  localSystemVoice: false,
  anySystemVoice: false,
  localOnly: false,
};

describe("Wahl der Stimme", () => {
  it("bleibt ohne Freigabe wie vor dem Sprachmodell", () => {
    expect(speechRoutes({ ...base, anySystemVoice: true })).toEqual(["system"]);
    expect(
      speechRoutes({ ...base, anySystemVoice: true, localOnly: true }),
    ).toEqual([]);
    expect(
      speechRoutes({
        ...base,
        modelAvailable: true,
        localSystemVoice: true,
        anySystemVoice: true,
        localOnly: true,
      }),
    ).toEqual(["system"]);
  });

  it("bleibt mit Freigabe, aber ohne Modell für die Sprache wie vorher", () => {
    expect(
      speechRoutes({ ...base, modelAllowed: true, anySystemVoice: true }),
    ).toEqual(["system"]);
    expect(chooseSpeechRoute({ ...base, modelAllowed: true })).toBe("none");
  });

  it("nimmt mit Modell zuerst das Modell, dann nur lokale Stimmen", () => {
    const allowed = { ...base, modelAllowed: true, modelAvailable: true };
    expect(
      speechRoutes({
        ...allowed,
        localSystemVoice: true,
        anySystemVoice: true,
      }),
    ).toEqual(["model", "system"]);
    // Nur eine Netzwerkstimme: nie als Rückfall (B-012).
    expect(speechRoutes({ ...allowed, anySystemVoice: true })).toEqual([
      "model",
    ]);
    expect(chooseSpeechRoute(allowed)).toBe("model");
  });
});
