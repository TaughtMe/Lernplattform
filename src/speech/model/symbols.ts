/**
 * Symboltabelle und Tokenizer des Sprachmodells KittenTTS
 * (Plan `docs/umsetzungsplan-sprachmodell.md`, 3.3).
 *
 * Die Tabelle stammt aus KittenTTS (`kittentts/onnx_model.py`, `TextCleaner`),
 * Copyright KittenML / Stellon Labs, Apache-2.0. Reihenfolge und Zeichen sind
 * Teil des Modells: Jede Änderung verschiebt die Token-IDs.
 */
const PAD = "$";
const PUNCTUATION = ';:,.!?¡¿—…"«»"" ';
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const LETTERS_IPA =
  "ɑɐɒæɓʙβɔɕçɗɖðʤəɘɚɛɜɝɞɟʄɡɠɢʛɦɧħɥʜɨɪʝɭɬɫɮʟɱɯɰŋɳɲɴøɵɸθœɶʘɹɺɾɻʀʁɽʂʃʈʧʉʊʋⱱʌɣɤʍχʎʏʑʐʒʔʡʕʢǀǁǂǃˈˌːˑʼʴʰʱʲʷˠˤ˞↓↑→↗↘'̩'ᵻ";

export const SYMBOLS: readonly string[] = [
  PAD,
  ...PUNCTUATION,
  ...LETTERS,
  ...LETTERS_IPA,
];

/** Wie das Python-`dict`: Bei doppelten Zeichen gewinnt das letzte. */
const SYMBOL_IDS = new Map<string, number>();
SYMBOLS.forEach((symbol, index) => SYMBOL_IDS.set(symbol, index));

/** Rand-Token des Modells: Anfang, Ende (`…`) und Polster. */
export const START_TOKEN = 0;
export const END_TOKEN = 10;

/** Lautschrift → Token-IDs. Unbekannte Zeichen fallen weg. */
export function symbolsToIds(phonemes: string): number[] {
  const ids: number[] = [];
  for (const character of phonemes) {
    const id = SYMBOL_IDS.get(character);
    if (id !== undefined) ids.push(id);
  }
  return ids;
}

/** Token-Folge für das Modell: `[0, …, 10, 0]` wie `TextCleaner`. */
export function tokenize(phonemes: string): number[] {
  return [START_TOKEN, ...symbolsToIds(phonemes), END_TOKEN, START_TOKEN];
}
