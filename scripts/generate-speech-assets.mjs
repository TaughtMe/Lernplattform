// Erzeugt die Dateien für das Vorlesen mit dem Sprachmodell
// (docs/umsetzungsplan-sprachmodell.md, 3.2):
// - kopiert Lade-Code und WASM von onnxruntime-web nach public/speech/ort/<version>/
// - prüft die Modelldateien unter public/speech/kitten2/ gegen die SHA-256-Werte
//   aus src/speech/model/sources.json (Revision von Hugging Face)
// - schreibt public/speech/manifest.json mit Größe und SHA-256 jeder Datei
// ONNX-Kopie und Manifest sind erzeugt und nicht eingecheckt (.gitignore).
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(projectRoot, "public");
// onnxruntime-web gibt package.json nicht über "exports" frei: direkt lesen.
const ortPackage = join(
  projectRoot,
  "node_modules",
  "onnxruntime-web",
  "package.json",
);
const ortVersion = JSON.parse(await readFile(ortPackage, "utf8")).version;
// Lade-Code (.mjs) und WASM gehören zusammen; der Worker nutzt die Variante
// ohne eingebettete Verweise (Alias in vite.config.ts).
const ortFiles = ["ort-wasm-simd-threaded.wasm", "ort-wasm-simd-threaded.mjs"];
const ortTargetDir = join(publicDir, "speech", "ort", ortVersion);

await rm(join(publicDir, "speech", "ort"), { recursive: true, force: true });
await mkdir(ortTargetDir, { recursive: true });
for (const name of ortFiles) {
  await copyFile(
    join(dirname(ortPackage), "dist", name),
    join(ortTargetDir, name),
  );
}

/** Größe und Prüfsumme einer Datei unter public/; mit `expected` wird verglichen. */
async function asset(path, expected) {
  const file = join(publicDir, path);
  const bytes = await readFile(file).catch(() => {
    throw new Error(`Sprachmodell-Datei fehlt: public${path}`);
  });
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (expected && sha256 !== expected) {
    throw new Error(
      `Prüfsumme weicht ab: public${path} (${sha256}, erwartet ${expected})`,
    );
  }
  return { path, sha256, size: (await stat(file)).size };
}

const sources = JSON.parse(
  await readFile(
    join(projectRoot, "src", "speech", "model", "sources.json"),
    "utf8",
  ),
);

const languages = {};
for (const [code, entry] of Object.entries(sources.languages)) {
  languages[code] = {
    label: entry.label,
    espeak: entry.espeak,
    model: await asset(entry.model.path, entry.model.sha256),
    voices: await asset(entry.voices.path, entry.voices.sha256),
    ...(entry.lexicon
      ? { lexicon: await asset(entry.lexicon.path, entry.lexicon.sha256) }
      : {}),
    defaultVoice: entry.defaultVoice,
    voiceList: entry.voiceList,
  };
}

const manifest = {
  version: 2,
  model: {
    name: sources.model.name,
    revision: sources.model.revision,
    sampleRate: sources.model.sampleRate,
    vocab: await asset(sources.model.vocab.path, sources.model.vocab.sha256),
  },
  ort: {
    version: ortVersion,
    wasm: await asset(`/speech/ort/${ortVersion}/${ortFiles[0]}`),
    mjs: await asset(`/speech/ort/${ortVersion}/${ortFiles[1]}`),
  },
  phonemizer: {
    js: await asset("/speech/phonemizer/lernraum-phonemizer.js"),
    wasm: await asset("/speech/phonemizer/lernraum-phonemizer.wasm"),
    data: await asset("/speech/phonemizer/lernraum-phonemizer.data"),
  },
  languages,
};

await writeFile(
  join(publicDir, "speech", "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
