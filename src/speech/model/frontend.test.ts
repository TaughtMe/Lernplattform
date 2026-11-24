import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  englishFallback,
  englishG2P,
  espeakG2P,
  foldToVocabulary,
  lexiconLookup,
  MAX_PHON,
  phonemeChunks,
  stripLanguageFlags,
  tokenize,
} from "./frontend";

/**
 * Das Frontend gegen eine nachgebaute eSpeak-Ausgabe. Der Abgleich mit der
 * echten Original-Pipeline läuft in scripts/phonemizer/parity.mjs (CI-Job
 * „Phonemizer“).
 */
const vocab = JSON.parse(
  readFileSync(join(process.cwd(), "public/speech/kitten2/vocab.json"), "utf8"),
) as Record<string, number>;

/** Antworten wie lr_phonemize_tie, Verbindungszeichen schon als `^`. */
const espeak: Record<string, string> = {
  Zeit: "t^sˈa^ɪt",
  "für eine Pause": "fyːɾ ˌa^ɪnə pˈa^ʊzə",
  "Die Straße": "diː ʃtɾˈɑːsə",
  das: "das",
  "im Wald": "ɪm vˈalt",
  Schmetterlinge: "ʃmˈɛtɜlˌɪŋə",
  Lernraum: "lˈɜːnɹa^ʊm",
  hello: "(en)həlˈo^ʊ(de)",
};
const raw = (words: string) => espeak[words] ?? words;

describe("Deutsch wie misaki EspeakG2P", () => {
  it("zieht Verbindungen zusammen und erhält Satzzeichen", () => {
    expect(espeakG2P("Zeit, für eine Pause.", raw)).toBe(
      "ʦˈIt, fyːɾ ˌInə pˈWzə.",
    );
    expect(espeakG2P("Die Straße, das", raw)).toBe("diː ʃtɾˈɑːsə, das");
  });

  it("behält Klammern über die Umwandlung in « » hinweg", () => {
    expect(espeakG2P("Schmetterlinge (im Wald)", raw)).toBe(
      "ʃmˈɛtɜlˌɪŋə (ɪm vˈalt)",
    );
  });

  it("entfernt Sprachwechsel-Marken, auch mit Verbindungszeichen", () => {
    expect(stripLanguageFlags("(en)həlˈo^ʊ(de)")).toBe("həlˈo^ʊ");
    expect(stripLanguageFlags("(e^n)x(d^e)")).toBe("x");
  });
});

describe("Englisch: Wörterbuch, sonst eSpeak-Rückfall", () => {
  const lexicon = { hello: "həlˈO", cat: "kˈæt" };

  it("nimmt das Wörterbuch und erhält Satzzeichen", () => {
    expect(englishG2P("Hello, cat!", lexicon, raw)).toBe("həlˈO, kˈæt!");
  });

  it("bildet das Genitiv-s wie misaki", () => {
    expect(lexiconLookup(lexicon, "cat's")).toBe("kˈæts");
    expect(lexiconLookup({ bus: "bˈʌs" }, "bus's")).toBe("bˈʌsᵻz");
    expect(lexiconLookup(lexicon, "dog")).toBeNull();
  });

  it("schreibt eSpeak für unbekannte Wörter wie EspeakFallback um", () => {
    expect(englishFallback("Lernraum", raw)).toBe("lˈɜɹnɹWm");
  });
});

describe("Vokabular und Stücke", () => {
  it("faltet fremde Zeichen und lässt Unbekanntes weg", () => {
    expect(foldToVocabulary("ɭa€", vocab)).toBe("la");
  });

  it("setzt die Rand-Token und nimmt Klammern aus dem Vokabular", () => {
    // Im KittenTTS-2-Vokabular haben ( und ) eigene IDs (12, 13).
    expect(tokenize("a(t)", vocab)).toEqual([
      0,
      vocab["a"],
      vocab["("],
      vocab["t"],
      vocab[")"],
      10,
      0,
    ]);
  });

  it("macht Klammern ohne eigene ID zum Komma, wie _tokens", () => {
    expect(tokenize("a(t)", { a: 1, t: 2, ",": 3 })).toEqual([
      0, 1, 3, 2, 3, 10, 0,
    ]);
  });

  it("teilt lange Texte an Satzenden in Stücke bis MAX_PHON", () => {
    const sentence = "das das das das das das das das das das.";
    const text = Array.from({ length: 12 }, () => sentence).join(" ");
    const chunks = phonemeChunks(text, { language: "de", vocab, raw });
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks)
      expect(chunk.length).toBeLessThanOrEqual(MAX_PHON);
    expect(phonemeChunks("", { language: "de", vocab, raw })).toEqual([]);
  });
});
