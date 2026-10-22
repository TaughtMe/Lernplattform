import type { PersonalLearningDatabase } from "./personal-learning-events";

/**
 * Hat dieses Gerät irgendeinen Lernstand? Gezählt wird über alle Tabellen, die
 * in die Sicherung eingehen (Tagespläne sind kurzlebig und zählen nicht).
 * Datensätze werden nicht gelesen oder geprüft: Auch ein beschädigter Eintrag
 * ist Lernstand, den ein Kind nicht durch „Sicherung einspielen“ ersetzen soll.
 * Ein leeres Gerät ist lokal nicht von einem gelöschten zu unterscheiden
 * (Red-Team-Bericht, Gegenprüfung B-002); darum bietet die Startseite dort das
 * Einspielen einer Sicherung an.
 */
export async function hasPersonalLearningState(
  database: PersonalLearningDatabase,
): Promise<boolean> {
  const counts = await Promise.all([
    database.learningEvents.count(),
    database.learningBoxDecks.count(),
    database.learningBoxCards.count(),
    database.learningBoxFolders.count(),
    database.learningWordProgress.count(),
    database.typingProgress.count(),
    database.textboxSessions.count(),
    database.wordBoxes.count(),
    database.wordRounds.count(),
  ]);
  return counts.some((count) => count > 0);
}
