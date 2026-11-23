import { describe, expect, it } from "vitest";
import { languageEntry, parseSpeechManifest } from "./manifest";
import { testManifest } from "./testing/manifest";
import {
  GAP_SECONDS,
  roundHalfEven,
  styleRow,
  synthesizeText,
  trimChunk,
} from "./synthesis";

const entry = languageEntry(parseSpeechManifest(testManifest), "de");
const vocab = { r: 60, a: 43, t: 62, ",": 3, " ": 16 };

describe("styleRow", () => {
  it("nimmt die Zeile min(Tokenzahl − 1, Zeilen − 1)", () => {
    const voice = { data: Float32Array.of(0, 0, 1, 1, 2, 2), shape: [3, 2] };
    expect(Array.from(styleRow(voice, 2))).toEqual([1, 1]);
    expect(Array.from(styleRow(voice, 40))).toEqual([2, 2]);
    expect(Array.from(styleRow(voice, 0))).toEqual([0, 0]);
  });
});

describe("trimChunk wie kittenml _chunk", () => {
  it("rundet wie Python", () => {
    expect(roundHalfEven(2.5)).toBe(2);
    expect(roundHalfEven(3.5)).toBe(4);
    expect(roundHalfEven(2.4)).toBe(2);
  });

  it("kürzt Ende-Token und (außer beim ersten Stück) den Anfang", () => {
    const wave = new Float32Array(100).fill(0.5);
    // 10 Frames → 10 Samples je Frame; Anfang 3 Frames, Ende 2 Frames.
    const durations = [3, 2, 3, 2];
    expect(trimChunk(wave, durations, true)).toHaveLength(90);
    expect(trimChunk(wave, durations, false)).toHaveLength(70);
  });

  it("begrenzt auf ±1 und blendet ein und aus", () => {
    const wave = new Float32Array(80).fill(2);
    const trimmed = trimChunk(wave, [1, 1], true);
    expect(trimmed[0]).toBe(0);
    expect(trimmed.at(-1)).toBe(0);
    expect(trimmed[40]).toBe(1);
  });
});

describe("synthesizeText", () => {
  if (!entry) throw new Error("Manifest ungültig");
  const voices = {
    anna: { data: Float32Array.of(0, 0, 1, 1), shape: [2, 2] },
    paul: { data: Float32Array.of(7, 7), shape: [1, 2] },
  };

  it("spricht jedes Stück mit Stimme, Stilzeile und Tempo, Pause dazwischen", async () => {
    const runs: { ids: number[]; style: number[]; speed: number }[] = [];
    const audio = await synthesizeText(
      "Rad. Rad",
      { speed: 0.9 },
      {
        entry,
        vocab,
        voices,
        sampleRate: 100,
        frontend: () => ["rat,", "rat"],
        run: ({ ids, style, speed }) => {
          runs.push({ ids, style: Array.from(style), speed });
          return Promise.resolve({
            waveform: new Float32Array(80).fill(0.1),
            durations: [1, 1, 1, 1, 1, 1, 1, 1],
          });
        },
      },
    );
    expect(runs[0]?.ids).toEqual([0, 60, 43, 62, 3, 10, 0]);
    expect(runs[0]?.style).toEqual([1, 1]);
    expect(runs[0]?.speed).toBeCloseTo(0.9);
    expect(audio).toHaveLength(80 + GAP_SECONDS * 100 + 80);
  });

  it("nimmt die gewünschte Stimme", async () => {
    let style: number[] = [];
    await synthesizeText(
      "Ja",
      { speed: 1, voice: "Paul" },
      {
        entry,
        vocab,
        voices,
        sampleRate: 100,
        frontend: () => ["a"],
        run: (input) => {
          style = Array.from(input.style);
          return Promise.resolve({
            waveform: new Float32Array(16),
            durations: [1, 1],
          });
        },
      },
    );
    expect(style).toEqual([7, 7]);
  });

  it("meldet eine fehlende Stimme in der Stimmen-Datei", async () => {
    await expect(
      synthesizeText(
        "Ja",
        { speed: 1 },
        {
          entry,
          vocab,
          voices: {},
          sampleRate: 100,
          frontend: () => ["a"],
          run: () =>
            Promise.resolve({ waveform: new Float32Array(), durations: [] }),
        },
      ),
    ).rejects.toThrow(/Stimme fehlt/);
  });
});
