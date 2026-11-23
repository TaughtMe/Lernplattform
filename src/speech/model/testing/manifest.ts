/** Gemeinsames Test-Manifest für die Sprachmodell-Tests (nicht ausgeliefert). */
export const asset = (path: string) => ({
  path,
  sha256: "a".repeat(64),
  size: 10,
});

export const testManifest = {
  version: 2,
  model: {
    name: "Kitten TTS 2 Nano",
    revision: "test",
    sampleRate: 24000,
    vocab: asset("/speech/kitten2/vocab.json"),
  },
  ort: {
    version: "1.31.1",
    wasm: asset("/speech/ort/1.31.1/ort-wasm-simd-threaded.wasm"),
    mjs: asset("/speech/ort/1.31.1/ort-wasm-simd-threaded.mjs"),
  },
  phonemizer: {
    js: asset("/speech/phonemizer/lernraum-phonemizer.js"),
    wasm: asset("/speech/phonemizer/lernraum-phonemizer.wasm"),
    data: asset("/speech/phonemizer/lernraum-phonemizer.data"),
  },
  languages: {
    de: {
      label: "Deutsch",
      espeak: "de",
      model: asset("/speech/kitten2/de/model.onnx"),
      voices: asset("/speech/kitten2/de/voices.npz"),
      defaultVoice: "anna",
      voiceList: [
        { id: "anna", label: "Anna", description: "weiblich" },
        { id: "paul", label: "Paul", description: "männlich" },
      ],
    },
  },
};
