import { afterEach, describe, expect, it, vi } from "vitest";
import {
  markTransferDone,
  markWordStoreTransferDone,
  readLiveTrace,
  readTransferDone,
  readWordStoreTransferDone,
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
    writeLiveTrace({ ...trace, wordTolerated: { "a → b": true } });
    expect(readLiveTrace("s1")).toEqual({
      ...trace,
      wordTolerated: { "a → b": true },
      wordMisspellings: {},
    });
  });

  it("schreibt und liest falsch geschriebene Wörter für den Wortspeicher", () => {
    writeLiveTrace({ ...trace, wordMisspellings: { "Satz 1": ["Hund"] } });
    expect(readLiveTrace("s1")?.wordMisspellings).toEqual({
      "Satz 1": ["Hund"],
    });
  });

  it("liest Schnappschüsse ohne tolerierte Wörter (ältere Geräte)", () => {
    window.sessionStorage.setItem(
      "lernraum:live-trace:s1",
      JSON.stringify(trace),
    );
    expect(readLiveTrace("s1")).toEqual({
      ...trace,
      wordTolerated: {},
      wordMisspellings: {},
    });
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

describe("Markierung der Wortspeicher-Übernahme", () => {
  it("merkt sich das Ergebnis getrennt von der Vokabelübernahme", () => {
    markWordStoreTransferDone("s1", { added: ["Hund"], full: true });
    expect(readWordStoreTransferDone("s1")).toEqual({
      added: ["Hund"],
      full: true,
    });
    expect(readTransferDone("s1")).toBeUndefined();
    expect(readWordStoreTransferDone("s2")).toBeUndefined();
  });

  it("verwirft kaputte Einträge", () => {
    window.sessionStorage.setItem("lernraum:live-wordstore-done:s1", "{kaputt");
    expect(readWordStoreTransferDone("s1")).toBeUndefined();
    window.sessionStorage.setItem(
      "lernraum:live-wordstore-done:s1",
      JSON.stringify({ added: "nein" }),
    );
    expect(readWordStoreTransferDone("s1")).toBeUndefined();
  });
});
