/**
 * Buchstabenvergleich nach einem Fehler (Plan 3.4): Levenshtein-Ausrichtung
 * auf Buchstabenebene, graphemsicher über `Array.from` nach NFC.
 */
export type LetterDiff = {
  kind: "gleich" | "falsch" | "fehlt" | "zuviel";
  expected?: string;
  actual?: string;
  /**
   * 1-basiert: Stelle im richtigen Wort (gleich, falsch, fehlt) bzw. in der
   * Eingabe (zuviel).
   */
  position: number;
};

function lettersOf(value: string) {
  return Array.from(value.normalize("NFC").trim());
}

function sameLetterIgnoringCase(left: string, right: string) {
  return (
    left !== right &&
    left.toLocaleLowerCase("de-DE") === right.toLocaleLowerCase("de-DE")
  );
}

function substitutionCost(expected: string, actual: string) {
  if (expected === actual) return 0;
  return sameLetterIgnoringCase(expected, actual) ? 0.5 : 1;
}

export function diffLetters(expected: string, actual: string): LetterDiff[] {
  const want = lettersOf(expected);
  const got = lettersOf(actual);
  const rows = want.length;
  const cols = got.length;
  const cost: number[][] = Array.from({ length: rows + 1 }, () =>
    new Array<number>(cols + 1).fill(0),
  );
  for (let i = 1; i <= rows; i += 1) cost[i]![0] = i;
  for (let j = 1; j <= cols; j += 1) cost[0]![j] = j;
  for (let i = 1; i <= rows; i += 1) {
    for (let j = 1; j <= cols; j += 1) {
      cost[i]![j] = Math.min(
        cost[i - 1]![j - 1]! + substitutionCost(want[i - 1]!, got[j - 1]!),
        cost[i - 1]![j]! + 1,
        cost[i]![j - 1]! + 1,
      );
    }
  }

  const result: LetterDiff[] = [];
  let i = rows;
  let j = cols;
  while (i > 0 || j > 0) {
    const here = cost[i]![j]!;
    if (
      i > 0 &&
      j > 0 &&
      here ===
        cost[i - 1]![j - 1]! + substitutionCost(want[i - 1]!, got[j - 1]!)
    ) {
      const same = want[i - 1] === got[j - 1];
      result.push({
        kind: same ? "gleich" : "falsch",
        expected: want[i - 1]!,
        actual: got[j - 1]!,
        position: i,
      });
      i -= 1;
      j -= 1;
    } else if (i > 0 && here === cost[i - 1]![j]! + 1) {
      result.push({ kind: "fehlt", expected: want[i - 1]!, position: i });
      i -= 1;
    } else {
      result.push({ kind: "zuviel", actual: got[j - 1]!, position: j });
      j -= 1;
    }
  }
  return result.reverse();
}

function caseOf(letter: string) {
  return letter === letter.toLocaleLowerCase("de-DE") ? "klein" : "groß";
}

/** Sätze für Screenreader, nur für abweichende Stellen („3. Buchstabe: m statt n“). */
export function describeLetterDiff(diff: readonly LetterDiff[]): string[] {
  const texts: string[] = [];
  for (const entry of diff) {
    if (entry.kind === "gleich") continue;
    if (entry.kind === "fehlt") {
      texts.push(`${entry.position}. Buchstabe fehlt: ${entry.expected}`);
    } else if (entry.kind === "zuviel") {
      texts.push(`${entry.position}. Buchstabe zu viel: ${entry.actual}`);
    } else if (sameLetterIgnoringCase(entry.expected!, entry.actual!)) {
      texts.push(
        `${entry.position}. Buchstabe: ${caseOf(entry.actual!)} statt ${caseOf(entry.expected!)}`,
      );
    } else {
      texts.push(
        `${entry.position}. Buchstabe: ${entry.actual} statt ${entry.expected}`,
      );
    }
  }
  return texts;
}
