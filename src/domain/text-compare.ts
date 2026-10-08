import { isWithinOneEdit } from "./spelling-tolerance";

/**
 * Ein Wort oder ein Satzzeichen. `index` zählt innerhalb der eigenen Art:
 * das n-te Wort bzw. das n-te Satzzeichen des Textes.
 */
export type TextToken = { kind: "word" | "punct"; text: string; index: number };

export type WordResultKind =
  "richtig" | "falsch" | "gross-klein" | "fehlt" | "zusaetzlich";

export type WordResult = {
  kind: WordResultKind;
  expected?: string | undefined;
  actual?: string | undefined;
  expectedIndex?: number | undefined;
  /** „fast richtig“: genau ein Buchstabe Abstand, zählt trotzdem als Fehler. */
  nearMiss: boolean;
};

export type RoundScore = {
  percent: number;
  correct: number;
  total: number;
  extra: number;
  byKind: Record<WordResultKind, number>;
  punctuationHints: number;
};

export const WORD_RESULT_KINDS: readonly WordResultKind[] = [
  "richtig",
  "falsch",
  "gross-klein",
  "fehlt",
  "zusaetzlich",
];

// Wort = Buchstaben/Ziffern; Bindestrich und Apostroph zählen nur zwischen
// zwei Wortzeichen dazu („E-Mail“, „geht’s“).
const TOKEN_PATTERN =
  /[\p{L}\p{N}\p{M}]+(?:[-'’][\p{L}\p{N}\p{M}]+)*|[^\s\p{L}\p{N}\p{M}]/gu;
const WORD_START = /^[\p{L}\p{N}\p{M}]/u;

export function tokenizeText(text: string): TextToken[] {
  const tokens: TextToken[] = [];
  let words = 0;
  let punctuation = 0;
  for (const match of text.normalize("NFC").matchAll(TOKEN_PATTERN)) {
    const value = match[0];
    if (WORD_START.test(value)) {
      tokens.push({ kind: "word", text: value, index: words });
      words += 1;
    } else {
      tokens.push({ kind: "punct", text: value, index: punctuation });
      punctuation += 1;
    }
  }
  return tokens;
}

export function wordsOf(tokens: readonly TextToken[]): string[] {
  return tokens.filter((t) => t.kind === "word").map((t) => t.text);
}

function lower(value: string) {
  return value.toLocaleLowerCase("de");
}

function differentWord(
  actual: string,
  expected: string,
  expectedIndex: number,
): WordResult {
  if (lower(actual) === lower(expected)) {
    return {
      kind: "gross-klein",
      expected,
      actual,
      expectedIndex,
      nearMiss: false,
    };
  }
  return {
    kind: "falsch",
    expected,
    actual,
    expectedIndex,
    nearMiss: isWithinOneEdit(actual, expected),
  };
}

/** Kosten einer Ersetzung: ähnliche Wörter werden bevorzugt zugeordnet. */
function substitutionCost(actual: string, expected: string) {
  if (actual === expected) return 0;
  if (lower(actual) === lower(expected)) return 0.5;
  return isWithinOneEdit(actual, expected) ? 0.75 : 1;
}

/**
 * Levenshtein-Ausrichtung auf Wortebene. Bei gleichen Kosten gewinnt die
 * Ersetzung, damit ein falsch geschriebenes Wort nicht als „fehlt“ plus
 * „zusätzlich“ zählt.
 */
export function alignWords(expected: string[], actual: string[]): WordResult[] {
  const rows = expected.length;
  const cols = actual.length;
  const cost: number[][] = Array.from({ length: rows + 1 }, () =>
    new Array<number>(cols + 1).fill(0),
  );
  for (let i = 1; i <= rows; i += 1) cost[i]![0] = i;
  for (let j = 1; j <= cols; j += 1) cost[0]![j] = j;
  for (let i = 1; i <= rows; i += 1) {
    for (let j = 1; j <= cols; j += 1) {
      cost[i]![j] = Math.min(
        cost[i - 1]![j - 1]! +
          substitutionCost(actual[j - 1]!, expected[i - 1]!),
        cost[i - 1]![j]! + 1,
        cost[i]![j - 1]! + 1,
      );
    }
  }

  const results: WordResult[] = [];
  let i = rows;
  let j = cols;
  while (i > 0 || j > 0) {
    const here = cost[i]![j]!;
    if (
      i > 0 &&
      j > 0 &&
      here ===
        cost[i - 1]![j - 1]! +
          substitutionCost(actual[j - 1]!, expected[i - 1]!)
    ) {
      const want = expected[i - 1]!;
      const got = actual[j - 1]!;
      results.push(
        got === want
          ? {
              kind: "richtig",
              expected: want,
              actual: got,
              expectedIndex: i - 1,
              nearMiss: false,
            }
          : differentWord(got, want, i - 1),
      );
      i -= 1;
      j -= 1;
    } else if (i > 0 && here === cost[i - 1]![j]! + 1) {
      results.push({
        kind: "fehlt",
        expected: expected[i - 1]!,
        expectedIndex: i - 1,
        nearMiss: false,
      });
      i -= 1;
    } else {
      results.push({
        kind: "zusaetzlich",
        actual: actual[j - 1]!,
        nearMiss: false,
      });
      j -= 1;
    }
  }
  return results.reverse();
}

/** Lückentext: Eingabe `i` gehört zum erwarteten Wort `i`. Leer heißt „fehlt“. */
export function compareGaps(
  expected: string[],
  inputs: string[],
): WordResult[] {
  return expected.map((want, index) => {
    const got = (inputs[index] ?? "").normalize("NFC").trim();
    if (got === "") {
      return {
        kind: "fehlt",
        expected: want,
        expectedIndex: index,
        nearMiss: false,
      };
    }
    if (got === want) {
      return {
        kind: "richtig",
        expected: want,
        actual: got,
        expectedIndex: index,
        nearMiss: false,
      };
    }
    return differentWord(got, want, index);
  });
}

/**
 * Anzahl der Satzzeichen-Hinweise (fehlt, falsch oder zusätzlich). Die
 * Satzzeichen werden als Folge verglichen; sie fließen nicht in die Wertung.
 */
export function comparePunctuation(
  expected: TextToken[],
  actual: TextToken[],
): number {
  const want = expected.filter((t) => t.kind === "punct").map((t) => t.text);
  const got = actual.filter((t) => t.kind === "punct").map((t) => t.text);
  let previous = Array.from({ length: got.length + 1 }, (_, j) => j);
  for (let i = 1; i <= want.length; i += 1) {
    const row = [i];
    for (let j = 1; j <= got.length; j += 1) {
      row[j] = Math.min(
        previous[j - 1]! + (want[i - 1] === got[j - 1] ? 0 : 1),
        previous[j]! + 1,
        row[j - 1]! + 1,
      );
    }
    previous = row;
  }
  return previous[got.length]!;
}

/**
 * Prozentwert: (richtig − zusätzlich) ÷ Wörter im Original, auf ganze Prozent
 * gerundet und auf 0–100 begrenzt. Satzzeichen zählen nicht.
 */
export function scoreWords(
  results: WordResult[],
  total: number,
  punctuationHints = 0,
): RoundScore {
  const byKind: Record<WordResultKind, number> = {
    richtig: 0,
    falsch: 0,
    "gross-klein": 0,
    fehlt: 0,
    zusaetzlich: 0,
  };
  for (const result of results) byKind[result.kind] += 1;
  const correct = byKind.richtig;
  const extra = byKind.zusaetzlich;
  const raw = total > 0 ? ((correct - extra) / total) * 100 : 0;
  return {
    percent: Math.min(100, Math.max(0, Math.round(raw))),
    correct,
    total,
    extra,
    byKind,
    punctuationHints,
  };
}
