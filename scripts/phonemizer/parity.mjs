// Vergleicht die Lautschrift von Lernraum (eigener eSpeak-Build + src/speech/model/frontend.ts)
// mit der Original-Pipeline von KittenTTS 2 (reference-*.json, eSpeak NG 1.52).
// Aufruf: node parity.mjs <ordner mit p.cjs und p.wasm>
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const nodeDir = resolve(process.argv[2]);
const frontend = await import(join(root, "src/speech/model/frontend.ts"));
const vocab = JSON.parse(readFileSync(join(root, "public/speech/kitten2/vocab.json"), "utf8"));
const create = createRequire(import.meta.url)(join(nodeDir, "p.cjs"));
const phonemizer = await create({ wasmBinary: readFileSync(join(nodeDir, "p.wasm")) });
if (phonemizer.ccall("lr_init", "number", [], []) !== 0) throw new Error("lr_init");

function raw(voice) {
  phonemizer.ccall("lr_set_voice", "number", ["string"], [voice]);
  return (words) =>
    String(phonemizer.ccall("lr_phonemize_tie", "string", ["string"], [words])).replaceAll("͡", "^");
}

let differences = 0;
const de = JSON.parse(readFileSync(join(here, "reference-de.json"), "utf8")).de;
for (const [text, want] of de) {
  const got = frontend.phonemeChunks(text, { language: "de", vocab, raw: raw("de") }).join(" ");
  const ok = got === want;
  if (!ok) differences += 1;
  console.log(`${ok ? "gleich" : "ANDERS"} de ${text}\n  erwartet ${want}\n  erhalten ${got}`);
}
const en = JSON.parse(readFileSync(join(here, "reference-en.json"), "utf8")).en_fallback;
for (const [word, want] of en) {
  const got = frontend.englishFallback(word, raw("en-us"));
  const ok = got === want;
  if (!ok) differences += 1;
  console.log(`${ok ? "gleich" : "ANDERS"} en ${word}: ${want} | ${got}`);
}
console.log(`${differences} Abweichung(en)`);
process.exitCode = differences > 0 ? 1 : 0;
