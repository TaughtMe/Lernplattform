/** Gemeinsames Test-Manifest für die Sprachmodell-Tests (nicht ausgeliefert). */
export const asset = (path: string) => ({
  path,
  sha256: "a".repeat(64),
  size: 10,
});

export const testManifest = {
  version: 1,
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
      espeak: "de",
      model: asset("/speech/kitten/de/model.onnx"),
      voices: asset("/speech/kitten/de/voices.npz"),
      defaultVoice: "v1",
      voiceList: [{ id: "v1", label: "Eins" }],
    },
  },
};
