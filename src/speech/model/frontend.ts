/**
 * Text → Lautschrift für KittenTTS 2 Nano, wie im Training
 * (kittenml 0.9.8, `kittentts2_tiny/frontend`, Apache-2.0). Rein: eSpeak NG
 * kommt als Funktion herein (im Worker der Lernraum-Phonemizer).
 *
 * - Deutsch und weitere eSpeak-Sprachen: `EspeakG2P` aus misaki (Verbindungen
 *   wie `t^s` → `ʦ`), danach `FOLD` aus `phonemize_v1.py`.
 * - Englisch: Wörterbuch `cmu_misaki_us.json` (misaki-Alphabet), für unbekannte
 *   Wörter eSpeak mit der Umschreibung von misakis `EspeakFallback`. Das kleine
 *   BART-Modell des Originals für unbekannte Wörter fehlt (Plan, Abschnitt 9).
 * - Zeichen außerhalb des Vokabulars fallen weg.
 */

/** Phonem-Grenze je Stück, wie `MAX_PHON` im Original. */
export const MAX_PHON = 350;

/**
 * eSpeak mit Verbindungszeichen (`lr_phonemize_tie`), schon mit `^` statt
 * U+0361, ohne Satzzeichen.
 */
export type RawPhonemize = (words: string) => string;

/** Satzzeichen, die `phonemizer` erhält (`Punctuation.default_marks()`). */
const MARKS = ';:,.!?¡¿—…"«»“”(){}[]';
const MARK_RUN = new RegExp(
  `(\\s*[${MARKS.replace(/[\]\\[^-]/g, "\\$&")}]+\\s*)+`,
  "gu",
);

/** misaki `EspeakG2P.e2m`, in Pythons `sorted()`-Reihenfolge. */
const ESPEAK_MERGES: readonly [string, string][] = [
  ["a^ɪ", "I"],
  ["a^ʊ", "W"],
  ["d^z", "ʣ"],
  ["d^ʒ", "ʤ"],
  ["e^ɪ", "A"],
  ["o^ʊ", "O"],
  ["s^s", "S"],
  ["t^s", "ʦ"],
  ["t^ʃ", "ʧ"],
  ["ɔ^ɪ", "Y"],
  ["ə^ʊ", "Q"],
];

/** misaki `EspeakFallback.E2M` (Englisch), längste Schlüssel zuerst. */
const FALLBACK_MERGES: readonly [string, string][] = (
  [
    ["ʔˌn̩", "ʔn"],
    ["ʔn̩", "ʔn"],
    ["a^ɪ", "I"],
    ["a^ʊ", "W"],
    ["d^ʒ", "ʤ"],
    ["e^ɪ", "A"],
    ["e", "A"],
    ["t^ʃ", "ʧ"],
    ["ɔ^ɪ", "Y"],
    ["ə^l", "ᵊl"],
    ["ʲo", "jo"],
    ["ʲə", "jə"],
    ["ʲ", ""],
    ["ɚ", "əɹ"],
    ["r", "ɹ"],
    ["x", "k"],
    ["ç", "k"],
    ["ɐ", "ə"],
    ["ɬ", "l"],
    ["̃", ""],
  ] as [string, string][]
).sort((a, b) => b[0].length - a[0].length);

/** `phonemize_v1.FOLD`: Zeichen ohne eigene Zeile im Vokabular. */
const FOLD: readonly [string, string][] = [
  ["̪", ""],
  ["̩", ""],
  ["̍", ""],
  ["̯", ""],
  ["ɭ", "l"],
  ["ɫ", "l"],
  ["ɵ", "ø"],
  ["ε", "ɛ"],
  ["\u0005", ""],
  ["\u0006", ""],
  ["\u0007", ""],
  ["\u0008", ""],
  ["{", ""],
  ["}", ""],
  ["[", ""],
  ["]", ""],
  ["¿", ""],
  ["¡", ""],
  [" ", " "],
];

function replaceEach(text: string, pairs: readonly [string, string][]) {
  let result = text;
  for (const [from, to] of pairs) result = result.split(from).join(to);
  return result;
}

/** eSpeak markiert Sprachwechsel als `(en)`; mit Verbindungszeichen als `(e^n)`. */
export function stripLanguageFlags(phonemes: string): string {
  return phonemes.replace(/\([a-z^]{2,8}(?:-[a-z0-9^]+)?\)/gi, "");
}

/**
 * Wie `phonemizer` mit `preserve_punctuation=True`: Wortteile gehen an eSpeak,
 * Satzzeichen bleiben mit ihren Leerzeichen stehen.
 */
export function phonemizePreservingPunctuation(
  text: string,
  raw: RawPhonemize,
): string {
  let result = "";
  let last = 0;
  const words = (part: string) => {
    if (!part.trim()) return part;
    const phonemes = stripLanguageFlags(raw(part.trim()))
      .replace(/\s+/g, " ")
      .trim();
    const before = /^\s/.test(part) ? " " : "";
    const after = /\s$/.test(part) ? " " : "";
    return `${before}${phonemes}${after}`;
  };
  for (const match of text.matchAll(MARK_RUN)) {
    result += words(text.slice(last, match.index));
    result += match[0];
    last = match.index + match[0].length;
  }
  result += words(text.slice(last));
  return result.trim();
}

/** misaki `EspeakG2P` (Version 1) für Deutsch und andere eSpeak-Sprachen. */
export function espeakG2P(text: string, raw: RawPhonemize): string {
  const prepared = text
    .replaceAll("«", "“")
    .replaceAll("»", "”")
    .replaceAll("(", "«")
    .replaceAll(")", "»");
  let phonemes = phonemizePreservingPunctuation(prepared, raw).trim();
  phonemes = replaceEach(phonemes, ESPEAK_MERGES)
    .replaceAll("^", "")
    .replaceAll("-", "");
  return phonemes.replaceAll("«", "(").replaceAll("»", ")");
}

/** misaki `EspeakFallback` (Englisch, US) für ein Wort. */
export function englishFallback(word: string, raw: RawPhonemize): string {
  let phonemes = stripLanguageFlags(raw(word)).trim();
  phonemes = replaceEach(phonemes, FALLBACK_MERGES);
  phonemes = phonemes.replace(/(\S)̩/gu, "ᵊ$1").replaceAll("̩", "");
  phonemes = phonemes
    .replaceAll("o^ʊ", "O")
    .replaceAll("ɜːɹ", "ɜɹ")
    .replaceAll("ɜː", "ɜɹ")
    .replaceAll("ɪə", "iə")
    .replaceAll("ː", "")
    .replaceAll("o", "ɔ")
    .replaceAll("ɾ", "T")
    .replaceAll("ʔ", "t");
  return phonemes.replaceAll("^", "");
}

export type Lexicon = Readonly<Record<string, string>>;

/** Wörterbuch wie `Fallback._cmu`: Kleinschreibung, Genitiv-s nach misaki. */
export function lexiconLookup(lexicon: Lexicon, word: string): string | null {
  const lower = word.toLowerCase();
  const direct = lexicon[lower];
  if (direct !== undefined) return direct;
  if (lower.endsWith("'s")) {
    const stem = lexicon[lower.slice(0, -2)];
    if (stem) {
      const end = stem.at(-1) ?? "";
      return (
        stem +
        ("ptkfθ".includes(end) ? "s" : "szʃʒʧʤ".includes(end) ? "ᵻz" : "z")
      );
    }
  }
  return null;
}

/** Englisch: Wörterbuch, sonst eSpeak-Rückfall; Satzzeichen und Leerzeichen bleiben. */
export function englishG2P(
  text: string,
  lexicon: Lexicon,
  raw: RawPhonemize,
): string {
  const normalized = text.replaceAll("’", "'");
  const say = (word: string): string => {
    const known = lexiconLookup(lexicon, word);
    if (known !== null) return known;
    if (word.includes("-")) {
      return word
        .split("-")
        .filter(Boolean)
        .map((part) => say(part))
        .join(" ");
    }
    return englishFallback(word, raw);
  };
  return normalized
    .replace(/[\p{L}\p{N}][\p{L}\p{N}'-]*/gu, (word) =>
      say(word.replace(/['-]+$/, "")),
    )
    .trim();
}

/** `FOLD` anwenden und nur Zeichen des Vokabulars behalten. */
export function foldToVocabulary(
  phonemes: string,
  vocab: Readonly<Record<string, number>>,
): string {
  const folded = replaceEach(phonemes.trim(), FOLD);
  return [...folded].filter((symbol) => symbol in vocab).join("");
}

function* wrap(phonemes: string): Generator<string> {
  let rest = phonemes;
  while (rest.length > MAX_PHON) {
    const space = rest.lastIndexOf(" ", MAX_PHON);
    const cut = space > 0 ? space : MAX_PHON;
    yield rest.slice(0, cut);
    rest = rest.slice(cut).trim();
  }
  if (rest) yield rest;
}

const SENTENCE_END = /(?<=[.!?…।])\s+/u;

export type FrontendParts = {
  /** `de`, `en`, … */
  language: string;
  vocab: Readonly<Record<string, number>>;
  raw: RawPhonemize;
  /** Nur Englisch. */
  lexicon?: Lexicon | undefined;
};

function phonemizeOnce(text: string, parts: FrontendParts): string {
  const phonemes =
    parts.language === "en"
      ? englishG2P(text, parts.lexicon ?? {}, parts.raw)
      : espeakG2P(text, parts.raw);
  return foldToVocabulary(phonemes, parts.vocab);
}

/**
 * Text → Lautschrift-Stücke wie `front_end`: bis `MAX_PHON` ein Stück, sonst
 * an Satzenden (und notfalls an Leerzeichen) geteilt.
 */
export function phonemeChunks(text: string, parts: FrontendParts): string[] {
  const whole = phonemizeOnce(text, parts);
  if (whole.length <= MAX_PHON) return whole ? [whole] : [];
  const chunks: string[] = [];
  let current = "";
  for (const sentence of text.split(SENTENCE_END)) {
    if (!sentence.trim()) continue;
    for (const phonemes of wrap(phonemizeOnce(sentence, parts))) {
      if (current && current.length + 1 + phonemes.length > MAX_PHON) {
        chunks.push(current);
        current = phonemes;
      } else {
        current = `${current} ${phonemes}`.trim();
      }
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

/** Ende-Token des Modells. */
export const END_TOKEN = 10;

/** Lautschrift → Token-IDs wie `_tokens`: `(` und `)` werden zum Komma. */
export function tokenize(
  phonemes: string,
  vocab: Readonly<Record<string, number>>,
): number[] {
  const ids: number[] = [];
  const comma = vocab[","];
  for (const symbol of phonemes) {
    const id = vocab[symbol];
    if (id !== undefined) ids.push(id);
    else if ((symbol === "(" || symbol === ")") && comma !== undefined)
      ids.push(comma);
  }
  return [0, ...ids, END_TOKEN, 0];
}
