// Prüft die Node-Variante des Phonemizers gegen erwartete Lautschrift.
// Aufruf: node check.mjs <pfad/zu/p.cjs>
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";

const modulePath = resolve(process.argv[2]);
// Emscripten erzeugt für Node ein CommonJS-Modul.
const create = createRequire(import.meta.url)(modulePath);

const expected = [
  ["de", "Das Haus ist groß.", "das hˈaʊs ɪst ɡɾˈoːs"],
  ["de", "Die Straße", "diː ʃtɾˈɑːsə"],
  ["de", "Ich esse Brötchen mit Käse.", "ɪç ˈɛsə bɾˈøːtçən mɪt kˈɛːzə"],
  ["de", "12 Äpfel", "tsvˈœlf ˈɛpfəl"],
  ["en-us", "Hello, how are you?", "həlˈoʊ hˈaʊ ɑːɹ juː"],
];

create({
  wasmBinary: readFileSync(join(dirname(modulePath), "p.wasm")),
}).then((phonemizer) => {
  if (phonemizer.ccall("lr_init", "number", [], []) !== 0) {
    throw new Error("lr_init fehlgeschlagen");
  }
  let failed = 0;
  for (const [voice, text, want] of expected) {
    if (phonemizer.ccall("lr_set_voice", "number", ["string"], [voice]) !== 0) {
      throw new Error(`Sprache ${voice} fehlt`);
    }
    const got = phonemizer.ccall("lr_phonemize", "string", ["string"], [text]);
    const ok = got === want;
    if (!ok) failed += 1;
    console.log(`${ok ? "ok  " : "FEHL"} ${voice} ${text} -> ${got}`);
  }
  // Verbindungszeichen wie phonemizer mit tie=True (KittenTTS 2).
  const tied = [
    ["de", "Zeit", "t͡sˈa͡ɪt"],
    ["de", "Haus", "hˈa͡ʊs"],
  ];
  for (const [voice, text, want] of tied) {
    phonemizer.ccall("lr_set_voice", "number", ["string"], [voice]);
    const got = phonemizer.ccall("lr_phonemize_tie", "string", ["string"], [text]);
    const ok = got === want;
    if (!ok) failed += 1;
    console.log(`${ok ? "ok  " : "FEHL"} tie ${voice} ${text} -> ${got}`);
  }
  if (failed > 0) process.exit(1);
});
