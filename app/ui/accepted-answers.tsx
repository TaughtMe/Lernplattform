import { answerAlternatives } from "../../src/domain/answer-normalization";

/** Weitere gültige Antworten eines Textes, ohne den Text selbst (und ohne `omit`). */
export function acceptedAlsoOf(text: string, omit?: string): string[] {
  const alternatives = answerAlternatives(text);
  if (alternatives.length <= 1) return [];
  const skipped = new Set([text.trim(), omit?.trim()]);
  return alternatives.filter((entry) => !skipped.has(entry));
}

/**
 * Zeigt „Gilt auch: go · to go“, wenn zu einer Antwort mehrere Schreibweisen
 * zählen (G-003: „|“, „/“ und freiwillige Klammerteile). Bei nur einer
 * Antwort erscheint nichts. Normaler Text, kein Live-Bereich.
 *
 * `text` ist der ganze Antworttext; `omit` blendet zusätzlich die Hauptantwort
 * aus, wenn `text` aus Hauptantwort und weiteren Antworten zusammengesetzt ist.
 */
export function AcceptedAnswers({
  text,
  omit,
  className,
}: {
  text: string;
  omit?: string;
  className?: string;
}) {
  const also = acceptedAlsoOf(text, omit);
  if (!also.length) return null;
  return (
    <span className={className ? `ui-accepted ${className}` : "ui-accepted"}>
      Gilt auch: {also.join(" · ")}
    </span>
  );
}
