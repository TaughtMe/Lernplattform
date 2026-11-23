import { describe, expect, it } from "vitest";
import {
  allAssets,
  assetsFor,
  baseLanguage,
  languageEntry,
  parseSpeechManifest,
} from "./manifest";
import { asset, testManifest } from "./testing/manifest";

describe("Manifest des Sprachmodells", () => {
  it("nimmt ein gültiges Manifest an und setzt Vorgaben", () => {
    const manifest = parseSpeechManifest(testManifest);
    const entry = languageEntry(manifest, "de-DE");
    expect(entry?.sampleRate).toBe(24000);
    expect(entry?.trimSamples).toBe(5000);
    expect(entry?.voiceList[0]?.speedPrior).toBe(1);
  });

  it("lehnt fremde Pfade, falsche Prüfsummen und alte Fassungen ab", () => {
    expect(
      parseSpeechManifest({
        ...testManifest,
        ort: {
          ...testManifest.ort,
          wasm: asset("https://cdn.example/ort.wasm"),
        },
      }),
    ).toBeNull();
    expect(
      parseSpeechManifest({
        ...testManifest,
        ort: {
          ...testManifest.ort,
          wasm: { ...testManifest.ort.wasm, sha256: "kurz" },
        },
      }),
    ).toBeNull();
    expect(parseSpeechManifest({ ...testManifest, version: 2 })).toBeNull();
    expect(parseSpeechManifest(null)).toBeNull();
  });

  it("findet die Sprache über den Grundcode", () => {
    const manifest = parseSpeechManifest(testManifest);
    expect(baseLanguage("de-AT")).toBe("de");
    expect(baseLanguage("en")).toBe("en");
    expect(languageEntry(manifest, "de")).not.toBeNull();
    expect(languageEntry(manifest, "en-GB")).toBeNull();
    expect(languageEntry(null, "de")).toBeNull();
  });

  it("nennt alle Dateien einer Sprache und des Manifests", () => {
    const manifest = parseSpeechManifest(testManifest);
    const entry = languageEntry(manifest, "de");
    if (!manifest || !entry) throw new Error("Manifest ungültig");
    expect(assetsFor(manifest, entry).map((item) => item.path)).toHaveLength(7);
    expect(allAssets(manifest).map((item) => item.path)).toContain(
      "/speech/kitten/de/voices.npz",
    );
  });
});
