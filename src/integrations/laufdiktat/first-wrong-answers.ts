/**
 * Erste falsche Antwort je Mathe-Aufgabe im Live-Raum. Sie geht an die
 * Lehrkraft, die daraus auf ihrem Gerät eine vermutete Fehlerart für den
 * CSV-Export ableitet; die Oberfläche zeigt die Fehlerart nicht an.
 */

/** Längste übertragene Antwort; der Server (Migration 20261027120000) lehnt Längeres ab. */
export const FIRST_WRONG_ANSWER_MAX_LENGTH = 32;

/**
 * Kürzt auf Zeichen (nicht UTF-16-Einheiten, damit kein Surrogatpaar zerreißt)
 * und entfernt Steuerzeichen, die der Server nicht als Text speichert.
 */
export function shortenWrongAnswer(answer: string) {
  return [...answer.replace(/\p{Cc}/gu, "").trim()]
    .slice(0, FIRST_WRONG_ANSWER_MAX_LENGTH)
    .join("");
}

/**
 * Merkt die Antwort nur, wenn die Aufgabe noch keine hat („erste“ falsche
 * Antwort) und nach dem Kürzen etwas übrig bleibt. Gibt bei unverändertem Stand
 * dasselbe Objekt zurück.
 */
export function rememberFirstWrongAnswer(
  known: Readonly<Record<string, string>>,
  key: string,
  answer: string,
): Record<string, string> {
  if (!key || Object.hasOwn(known, key)) return known as Record<string, string>;
  const short = shortenWrongAnswer(answer);
  return short ? { ...known, [key]: short } : (known as Record<string, string>);
}
