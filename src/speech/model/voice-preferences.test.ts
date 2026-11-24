import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isModelSpeechEnabled,
  preferredVoice,
  readVoicePreferences,
  setModelSpeechEnabled,
  setPreferredVoice,
  subscribeVoicePreferences,
} from "./voice-preferences";

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("Vorlesestimme je Sprache", () => {
  it("speichert die Wahl je Sprache auf dem Gerät", () => {
    setPreferredVoice("de", "lukas");
    setPreferredVoice("en", "max");
    expect(preferredVoice("de")).toBe("lukas");
    expect(readVoicePreferences()).toEqual({ de: "lukas", en: "max" });
    expect(preferredVoice("fr")).toBeNull();
  });

  it("meldet Änderungen an offene Einstellungen", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeVoicePreferences(listener);
    setPreferredVoice("de", "mia");
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    setPreferredVoice("de", "paul");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("übersteht unlesbare oder fremde Einträge", () => {
    window.localStorage.setItem("lernraum:vorlesestimme", "{kaputt");
    expect(readVoicePreferences()).toEqual({});
    window.localStorage.setItem(
      "lernraum:vorlesestimme",
      JSON.stringify({ de: "anna", en: 3 }),
    );
    expect(readVoicePreferences()).toEqual({ de: "anna" });
  });

  it("arbeitet ohne Speicher weiter", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("voll");
    });
    expect(() => setPreferredVoice("de", "anna")).not.toThrow();
  });
});

describe("Lernraum-Stimme an oder aus", () => {
  it("ist ohne Wahl an und lässt sich je Gerät ausschalten", () => {
    expect(isModelSpeechEnabled()).toBe(true);
    const listener = vi.fn();
    const unsubscribe = subscribeVoicePreferences(listener);
    setModelSpeechEnabled(false);
    expect(isModelSpeechEnabled()).toBe(false);
    expect(listener).toHaveBeenCalledTimes(1);
    setModelSpeechEnabled(true);
    expect(isModelSpeechEnabled()).toBe(true);
    unsubscribe();
  });
});
