import { describe, expect, it } from "vitest";
import { parseSpeechManifest } from "./manifest";
import { testManifest } from "./testing/manifest";
import { synthesizeText, resolveVoice } from "./synthesis";
import { SYMBOLS } from "./symbols";

const entry = parseSpeechManifest({
  ...testManifest,
  languages: {
    de: {
      ...testManifest.languages.de,
      trimSamples: 1,
      voiceList: [
        { id: "v1", label: "Eins" },
        { id: "v2", label: "Zwei", speedPrior: 0.5 },
      ],
    },
  },
})?.languages["de"];

describe("synthesizeText", () => {
  if (!entry) throw new Error("Manifest ungültig");
  const voices = {
    v1: { data: Float32Array.of(0, 0, 1, 1), shape: [2, 2] },
    v2: { data: Float32Array.of(7, 7), shape: [1, 2] },
  };

  it("phonemisiert jedes Stück, nimmt Stilzeile und Tempo und schneidet das Ende ab", async () => {
    const runs: { ids: number[]; style: number[]; speed: number }[] = [];
    const audio = await synthesizeText(
      "Rad. Sonne",
      { speed: 0.9 },
      {
        entry,
        voices,
        phonemize: (words) => (words === "Rad" ? "rˈɑːt" : "zˈɔnə"),
        run: ({ ids, style, speed }) => {
          runs.push({ ids, style: Array.from(style), speed });
          return Promise.resolve(Float32Array.of(runs.length, runs.length, 9));
        },
      },
    );
    expect(runs).toHaveLength(2);
    expect(runs[0]?.ids).toEqual([
      0,
      ...[..."rˈɑːt ,"].map((s) => SYMBOLS.lastIndexOf(s)),
      10,
      0,
    ]);
    expect(runs[0]?.style).toEqual([1, 1]);
    expect(runs[0]?.speed).toBeCloseTo(0.9);
    // Je Stück fällt das letzte Sample weg (trimSamples = 1).
    expect(Array.from(audio)).toEqual([1, 1, 2, 2]);
  });

  it("nimmt die gewünschte Stimme mit ihrem Tempo-Faktor", async () => {
    let usedSpeed = 0;
    await synthesizeText(
      "Ja",
      { speed: 1, voice: "Zwei" },
      {
        entry,
        voices,
        phonemize: () => "jaː",
        run: ({ speed, style }) => {
          usedSpeed = speed;
          expect(Array.from(style)).toEqual([7, 7]);
          return Promise.resolve(new Float32Array(2));
        },
      },
    );
    expect(usedSpeed).toBe(0.5);
    expect(resolveVoice(entry, "fehlt")?.id).toBe("v1");
  });

  it("meldet eine fehlende Stimme in der Stimmen-Datei", async () => {
    await expect(
      synthesizeText(
        "Ja",
        { speed: 1 },
        {
          entry,
          voices: {},
          phonemize: () => "jaː",
          run: () => Promise.resolve(new Float32Array()),
        },
      ),
    ).rejects.toThrow(/Stimme fehlt/);
  });
});
