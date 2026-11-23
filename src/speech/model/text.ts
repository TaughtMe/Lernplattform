/**
 * Textaufbereitung für das Sprachmodell (Plan 3.3): Stücke bilden,
 * Satzzeichen erhalten und die Lautschrift für den Tokenizer vorbereiten.
 * Rein, ohne Browserzugriff.
 */

/** Längere Sätze werden an Wortgrenzen auf höchstens so viele Zeichen geteilt. */
export const MAX_CHUNK_CHARS = 400;

const SENTENCE_END = /[.!?]+/;
const CLOSING = new Set([".", "!", "?", ",", ";", ":"]);

/** Ein Stück ohne Satzende bekommt ein Komma, damit die Stimme nicht abbricht. */
export function ensureClosingPunctuation(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  return CLOSING.has(trimmed.at(-1) ?? "") ? trimmed : `${trimmed},`;
}

/**
 * Teilt einen Text in Sätze und lange Sätze in Stücke von höchstens
 * `MAX_CHUNK_CHARS` Zeichen. Wie `chunk_text` in KittenTTS.
 */
export function chunkText(text: string, max = MAX_CHUNK_CHARS): string[] {
  const chunks: string[] = [];
  for (const part of text.split(SENTENCE_END)) {
    const sentence = part.trim();
    if (!sentence) continue;
    if (sentence.length <= max) {
      chunks.push(ensureClosingPunctuation(sentence));
      continue;
    }
    let current = "";
    for (const word of sentence.split(/\s+/)) {
      if (current && current.length + word.length + 1 > max) {
        chunks.push(ensureClosingPunctuation(current));
        current = word;
      } else {
        current = current ? `${current} ${word}` : word;
      }
    }
    if (current) chunks.push(ensureClosingPunctuation(current));
  }
  return chunks;
}

const PUNCTUATION_MARKS = ';:,.!?¡¿—…"«»“”„‚‘’()[]{}';
const PUNCTUATION_RUN = new RegExp(
  `(\\s*[${PUNCTUATION_MARKS.replace(/[\]\\[^-]/g, "\\$&")}]+\\s*)+`,
  "gu",
);

export type TextPiece = { punctuation: boolean; text: string };

/** Zerlegt den Text in Wortteile und Satzzeichenfolgen (beide in Reihenfolge). */
export function splitPunctuation(text: string): TextPiece[] {
  const pieces: TextPiece[] = [];
  let last = 0;
  for (const match of text.matchAll(PUNCTUATION_RUN)) {
    const index = match.index;
    if (index > last) {
      pieces.push({ punctuation: false, text: text.slice(last, index) });
    }
    pieces.push({ punctuation: true, text: match[0] });
    last = index + match[0].length;
  }
  if (last < text.length) {
    pieces.push({ punctuation: false, text: text.slice(last) });
  }
  return pieces;
}

/** eSpeak markiert Sprachwechsel mit `(en)` oder `(de)`; das Modell kennt sie nicht. */
export function stripLanguageFlags(phonemes: string): string {
  return phonemes.replace(/\([a-z]{2,3}(?:-[a-z0-9]+)?\)/gi, "");
}

/**
 * Wörter und Satzzeichen durch genau ein Leerzeichen trennen, wie
 * `re.findall(r"\w+|[^\w\s]")` in KittenTTS. Pythons `\w` umfasst Buchstaben
 * (auch `ˈ` und `ː`, Kategorie Lm), Ziffern und `_`.
 */
export function spaceTokens(phonemes: string): string {
  return (phonemes.match(/[\p{L}\p{N}_]+|[^\p{L}\p{N}_\s]/gu) ?? []).join(" ");
}

/**
 * Lautschrift für ein Stück: Wortteile gehen an den Phonemizer, Satzzeichen
 * bleiben stehen (wie `preserve_punctuation` in `phonemizer`).
 */
export function phonemizeWithPunctuation(
  text: string,
  phonemize: (words: string) => string,
): string {
  let result = "";
  for (const piece of splitPunctuation(text)) {
    if (piece.punctuation) {
      result += piece.text;
    } else if (piece.text.trim()) {
      const leading = /^\s/.test(piece.text) ? " " : "";
      const trailing = /\s$/.test(piece.text) ? " " : "";
      const phonemes = stripLanguageFlags(phonemize(piece.text.trim()))
        .replace(/_/g, "")
        .replace(/\s+/g, " ")
        .trim();
      result += `${leading}${phonemes}${trailing}`;
    } else {
      result += piece.text;
    }
  }
  return spaceTokens(result.trim());
}
