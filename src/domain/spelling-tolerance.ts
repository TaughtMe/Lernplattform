/** Kürzere Lösungen sind schon bei einem Buchstaben Unterschied ein anderes Wort. */
export const MIN_TOLERANT_LENGTH = 4;

/**
 * Wahr, wenn sich zwei Schreibweisen um höchstens einen Buchstaben
 * unterscheiden: einer falsch, fehlend, zusätzlich oder zwei benachbarte
 * vertauscht (Damerau-Levenshtein-Abstand ≤ 1).
 */
export function isWithinOneEdit(actual: string, expected: string) {
  if (actual === expected) return true;
  const a = Array.from(actual);
  const b = Array.from(expected);
  if (Math.abs(a.length - b.length) > 1) return false;
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) {
    start += 1;
  }
  let endA = a.length - 1;
  let endB = b.length - 1;
  while (endA >= start && endB >= start && a[endA] === b[endB]) {
    endA -= 1;
    endB -= 1;
  }
  const restA = endA - start + 1;
  const restB = endB - start + 1;
  if (restA <= 1 && restB <= 1) return true; // ersetzt, fehlend oder zusätzlich
  // Zwei benachbarte Buchstaben vertauscht.
  return (
    restA === 2 &&
    restB === 2 &&
    a[start] === b[start + 1] &&
    a[start + 1] === b[start]
  );
}

/** Gilt die Toleranz für diese Lösung? Sehr kurze Wörter bleiben streng. */
export function toleratesSpelling(actual: string, expected: string) {
  return (
    Array.from(expected).length >= MIN_TOLERANT_LENGTH &&
    isWithinOneEdit(actual, expected)
  );
}
