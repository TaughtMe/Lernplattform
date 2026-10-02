import { afterEach, describe, expect, it, vi } from "vitest";
import {
  markTransferDone,
  readLiveTrace,
  readTransferDone,
  writeLiveTrace,
} from "./live-trace";

const trace = {
  sessionId: "s1",
  currentIndex: 2,
  finished: false,
  wordErrors: { "a → b": 1 },
  wordHelps: { "a → b": true as const },
};

afterEach(() => {
  window.sessionStorage.clear();
  vi.restoreAllMocks();
});

describe("live trace storage", () => {
  it("schreibt und liest den Schnappschuss", () => {
    writeLiveTrace(trace);
    expect(readLiveTrace("s1")).toEqual(trace);
  });

  it("liefert nichts für fremde oder fehlende Runden", () => {
    writeLiveTrace(trace);
    expect(readLiveTrace("s2")).toBeUndefined();
  });

  it("verwirft kaputte oder ungültige Einträge", () => {
    window.sessionStorage.setItem("lernraum:live-trace:s1", "{kaputt");
    expect(readLiveTrace("s1")).toBeUndefined();
    window.sessionStorage.setItem(
      "lernraum:live-trace:s1",
      JSON.stringify({ ...trace, wordHelps: { x: false } }),
    );
    expect(readLiveTrace("s1")).toBeUndefined();
    window.sessionStorage.setItem(
      "lernraum:live-trace:s1",
      JSON.stringify({ ...trace, sessionId: "s9" }),
    );
    expect(readLiveTrace("s1")).toBeUndefined();
  });

  it("merkt sich die erfolgreiche Übernahme", () => {
    expect(readTransferDone("s1")).toBeUndefined();
    markTransferDone("s1", "3 neue Vokabeln sind jetzt in deiner LernBox.");
    expect(readTransferDone("s1")).toBe(
      "3 neue Vokabeln sind jetzt in deiner LernBox.",
    );
    window.sessionStorage.setItem("lernraum:live-transfer-done:s2", "[1]");
    expect(readTransferDone("s2")).toBeUndefined();
  });

  it("läuft ohne Speicher weiter", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("voll");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("gesperrt");
    });
    expect(() => writeLiveTrace(trace)).not.toThrow();
    expect(() => markTransferDone("s1", "x")).not.toThrow();
    expect(readLiveTrace("s1")).toBeUndefined();
    expect(readTransferDone("s1")).toBeUndefined();
  });
});
