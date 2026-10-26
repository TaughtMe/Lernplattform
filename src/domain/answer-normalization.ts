/**
 * Gemeinsame Antwortprüfung für LernBox, Laufdiktat und Live-Laufdiktat
 * (Befunde G-002 und G-003). Reine Funktionen ohne Abhängigkeiten.
 *
 * Nur für den Vergleich einer Eingabe mit der Lösung gedacht. Fingerabdrücke
 * (`normalizeVocabularyText`, `learningBoxFingerprint`) bleiben unverändert,
 * sonst passten bestehende Fingerabdrücke nicht mehr.
 */

const APOSTROPHES = /[’‘ʼ´`′]/gu;
const QUOTES = /[„“”»«‚‹›″]/gu;
const DASHES = /[‐-―−]/gu;

/**
 * Gleicht typografische Varianten an, damit Tastatur und Autokorrektur nicht
 * über richtig oder falsch entscheiden (G-002): Unicode-NFC, Apostrophe
 * (’ ‘ ʼ ´ ` ′) zu „'“, Anführungszeichen („ “ ” » « ‚ ‹ › ″) zu „"“,
 * Bindestriche und Minus (U+2010–2015, U+2212) zu „-“, jeder Leerraum (auch
 * das geschützte Leerzeichen) zu einem Leerzeichen, ohne Rand. Groß- und
 * Kleinschreibung entscheidet die jeweilige Prüfung.
 */
export function normalizeAnswerCharacters(text: string): string {
  return normalizeWordCharacters(text)
    .replace(QUOTES, '"')
    .replace(/\s+/gu, " ")
    .trim();
}

/**
 * Nur NFC sowie Apostroph- und Bindestrich-Varianten gleichgesetzt, für den
 * Buchstabenvergleich einzelner Wörter (`text-compare.ts`).
 */
export function normalizeWordCharacters(word: string): string {
  return word.normalize("NFC").replace(APOSTROPHES, "'").replace(DASHES, "-");
}

export type AnswerKeyOptions = {
  /** Groß-/Kleinschreibung zählt; Standard: nein. */
  caseSensitive?: boolean;
  /** Sprache für die Kleinschreibung („tr“ kennt das punktlose i). */
  locale?: string;
  /** Zusätzlich NFKC (Ligaturen, Vollbreite), wie der alte LernBox-Vergleich. */
  compatibility?: boolean;
};

/** Vergleichsschlüssel einer Antwort: Zeichen angeglichen, ggf. klein. */
export function answerKey(
  value: string,
  {
    caseSensitive = false,
    locale = "de",
    compatibility = false,
  }: AnswerKeyOptions = {},
): string {
  const characters = normalizeAnswerCharacters(
    compatibility ? normalizeAnswerCharacters(value).normalize("NFKC") : value,
  );
  return caseSensitive ? characters : characters.toLocaleLowerCase(locale);
}

// --- Alternativen (G-003) --------------------------------------------------

/** Bis zu so vielen Klammerteilen wird jede Kombination geprüft (3^n). */
const MAX_COMBINED_BRACKETS = 3;

/**
 * Trennt `text` an `|` und `/` außerhalb runder Klammern. Der Schrägstrich
 * trennt nur, wenn er auf beiden Seiten ein Leerzeichen hat („home / house“)
 * oder beidseitig Wörter mit mindestens zwei Buchstaben stehen („home/house“).
 * So bleiben Einheiten und Kürzel wie „km/h“, „m/s“ oder „s/w“ ganz.
 */
function splitAlternatives(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === "(") depth += 1;
    else if (char === ")") depth = Math.max(0, depth - 1);
    else if (depth === 0 && (char === "|" || slashSeparates(text, index))) {
      parts.push(text.slice(start, index));
      start = index + 1;
    }
  }
  parts.push(text.slice(start));
  return parts.map((part) => part.trim()).filter(Boolean);
}

function slashSeparates(text: string, index: number): boolean {
  if (text[index] !== "/") return false;
  if (/\s/u.test(text[index - 1] ?? "") && /\s/u.test(text[index + 1] ?? "")) {
    return true;
  }
  const left = /\p{L}+$/u.exec(text.slice(0, index))?.[0] ?? "";
  const right = /^\p{L}+/u.exec(text.slice(index + 1))?.[0] ?? "";
  return [...left].length >= 2 && [...right].length >= 2;
}

/**
 * Klammerteile sind freiwillig: „(to) go“ gilt als „(to) go“, „to go“ und
 * „go“. Je Klammerteil gibt es drei Fassungen (unverändert, ohne Klammern,
 * weggelassen); bei mehr als drei Teilen nur noch einheitlich für alle.
 */
function bracketVariants(part: string): string[] {
  const groups = [...part.matchAll(/\(([^()]*)\)/gu)];
  if (groups.length === 0) return [part];
  const choices: Array<(group: RegExpMatchArray) => string> = [
    (group) => group[0],
    (group) => group[1] ?? "",
    () => "",
  ];
  const build = (pick: (index: number) => number) => {
    let out = "";
    let last = 0;
    groups.forEach((group, index) => {
      out += part.slice(last, group.index) + choices[pick(index)]!(group);
      last = (group.index ?? 0) + group[0].length;
    });
    return out + part.slice(last);
  };
  const picks: Array<(index: number) => number> = [];
  if (groups.length <= MAX_COMBINED_BRACKETS) {
    const total = 3 ** groups.length;
    for (let code = 0; code < total; code += 1) {
      picks.push((index) => Math.floor(code / 3 ** index) % 3);
    }
  } else {
    for (let choice = 0; choice < 3; choice += 1) picks.push(() => choice);
  }
  return picks.map((pick, order) => {
    const variant = build(pick);
    // Die unveränderte Fassung (erste) bleibt wörtlich erhalten.
    return order === 0
      ? variant
      : variant
          .replace(/\s+/gu, " ")
          .replace(/\s+([.,;:!?])/gu, "$1")
          .trim();
  });
}

/**
 * Alle Schreibweisen, die als richtig gelten (G-003). Der ganze Text zählt
 * immer, dazu seine Teile, getrennt an `|` und `/` (Regel siehe
 * `splitAlternatives`), jeweils auch mit Klammerinhalt ohne Klammern und ganz
 * ohne Klammerteil. Das Komma trennt hier nie; es wird nur nach Bestätigung
 * beim Import zu `|` (`commaToAlternatives`). Der ganze Text steht vorn.
 */
export function answerAlternatives(text: string): string[] {
  const whole = text.trim();
  if (!whole) return [];
  const all = [whole, ...splitAlternatives(whole).flatMap(bracketVariants)];
  return [...new Set(all.filter((entry) => entry.trim() !== ""))];
}

/**
 * Stimmt die Eingabe mit einer der Lösungen (samt Alternativen) überein?
 * Leere Eingaben stimmen nie.
 */
export function answerMatches(
  expected: string | readonly string[],
  input: string,
  options: AnswerKeyOptions = {},
): boolean {
  const given = answerKey(input, options);
  if (given === "") return false;
  return answerKeys(expected, options).includes(given);
}

/** Vergleichsschlüssel aller gültigen Antworten (für Toleranzprüfungen). */
export function answerKeys(
  expected: string | readonly string[],
  options: AnswerKeyOptions = {},
): string[] {
  const list = typeof expected === "string" ? [expected] : expected;
  return [
    ...new Set(
      list
        .flatMap(answerAlternatives)
        .map((answer) => answerKey(answer, options))
        .filter(Boolean),
    ),
  ];
}

// --- Komma als Trenner, nur nach Bestätigung (G-003) -----------------------

/** Kommas außerhalb von Klammern; ein Dezimalkomma („0,5“) zählt nicht. */
function commaParts(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === "(") depth += 1;
    else if (char === ")") depth = Math.max(0, depth - 1);
    else if (
      char === "," &&
      depth === 0 &&
      !(/\d/u.test(text[index - 1] ?? "") && /\d/u.test(text[index + 1] ?? ""))
    ) {
      parts.push(text.slice(start, index));
      start = index + 1;
    }
  }
  parts.push(text.slice(start));
  return parts.map((part) => part.trim()).filter(Boolean);
}

/** Trennt das Komma in `text` Alternativen (außerhalb von Klammern)? */
export function hasAlternativeComma(text: string): boolean {
  return commaParts(text).length > 1;
}

/** „groß, riesig“ wird zu „groß | riesig“; ohne Komma bleibt der Text gleich. */
export function commaToAlternatives(text: string): string {
  const parts = commaParts(text);
  return parts.length > 1 ? parts.join(" | ") : text;
}
