/** Fragen aus dem Konzept (§8.3); sie erscheinen erst ab zwei Ergebnissen. */
export const REFLECTION_QUESTIONS = [
  "Bei welcher Übung war dein Ergebnis am besten?",
  "Wie stark hast du dich verbessert?",
  "Ist dein Ergebnis bei jeder Übung gestiegen?",
  "Was fällt dir an deinem Diagramm auf?",
] as const;

/** Gemeinsam für Textbox und Wortspeicher: Fragen gibt es ab zwei Ergebnissen. */
export function reflectionQuestionsFor(
  history: readonly { percent: number }[],
): string[] {
  return history.length < 2 ? [] : [...REFLECTION_QUESTIONS];
}
