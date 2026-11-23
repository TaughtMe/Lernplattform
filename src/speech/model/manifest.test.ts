import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  allAssets,
  assetsFor,
  baseLanguage,
  languageAssets,
  languageEntry,
  parseSpeechManifest,
  resolveVoice,
} from "./manifest";
import { asset, testManifest } from "./testing/manifest";

describe("Manifest des Sprachmodells", () => {
  it("nimmt ein gültiges Manifest an", () => {
    const manifest = parseSpeechManifest(testManifest);
    expect(languageEntry(manifest, "de-DE")?.label).toBe("Deutsch");
    expect(manifest?.model.sampleRate).toBe(24000);
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
        model: {
          ...testManifest.model,
          vocab: { ...testManifest.model.vocab, sha256: "kurz" },
        },
      }),
    ).toBeNull();
    expect(parseSpeechManifest({ ...testManifest, version: 1 })).toBeNull();
    expect(parseSpeechManifest(null)).toBeNull();
  });

  it("findet die Sprache über den Grundcode", () => {
    const manifest = parseSpeechManifest(testManifest);
    expect(baseLanguage("de-AT")).toBe("de");
    expect(languageEntry(manifest, "de")).not.toBeNull();
    expect(languageEntry(manifest, "en-GB")).toBeNull();
    expect(languageEntry(null, "de")).toBeNull();
  });

  it("nennt geteilte und sprachbezogene Dateien", () => {
    const manifest = parseSpeechManifest(testManifest);
    const entry = languageEntry(manifest, "de");
    if (!manifest || !entry) throw new Error("Manifest ungültig");
    expect(languageAssets(entry).map((item) => item.path)).toEqual([
      "/speech/kitten2/de/model.onnx",
      "/speech/kitten2/de/voices.npz",
    ]);
    expect(assetsFor(manifest, entry)).toHaveLength(8);
    expect(allAssets(manifest).map((item) => item.path)).toContain(
      "/speech/kitten2/vocab.json",
    );
  });

  it("wählt Stimmen nach Kennung oder Name, sonst die Vorgabe", () => {
    const entry = languageEntry(parseSpeechManifest(testManifest), "de");
    if (!entry) throw new Error("Manifest ungültig");
    expect(resolveVoice(entry, "paul").id).toBe("paul");
    expect(resolveVoice(entry, "Paul").id).toBe("paul");
    expect(resolveVoice(entry, "fehlt").id).toBe("anna");
    expect(resolveVoice(entry, null).id).toBe("anna");
  });

  it("die mitgelieferte Herkunftsdatei nennt Lizenz, Revision und Stimmen", async () => {
    const sources = JSON.parse(
      await readFile(
        join(process.cwd(), "src/speech/model/sources.json"),
        "utf8",
      ),
    ) as {
      model: { license: string; revision: string };
      languages: Record<
        string,
        { voiceList: { id: string }[]; defaultVoice: string }
      >;
    };
    expect(sources.model.license).toBe("Apache-2.0");
    expect(sources.model.revision).toMatch(/^[0-9a-f]{40}$/);
    for (const entry of Object.values(sources.languages)) {
      expect(entry.voiceList.map((voice) => voice.id)).toContain(
        entry.defaultVoice,
      );
    }
  });
});
