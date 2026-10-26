import type { LearnerProfile } from "../domain/learner-profile";
import type { PersonalLearningDatabase } from "./personal-learning-events";
import type { StudentClassesDatabase } from "./student-classes";

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

/**
 * Lernstand des ganzen Geräts für den Gastmodus: persönlicher Lernstand
 * (siehe oben), Klassenmitgliedschaften und Aufgaben sowie ein Profil mit
 * eigener Wahl. Das zufällige Tier, das jedes Gerät beim ersten Besuch erhält,
 * zählt nicht; sonst fragte der Gastmodus fast jedes Gerät, obwohl nichts zu
 * verlieren ist. Gelöscht wird es trotzdem.
 */
export async function hasDeviceLearningState(parts: {
  personal: PersonalLearningDatabase;
  classes: StudentClassesDatabase;
  profile: Pick<LearnerProfile, "figure" | "figuresUnlocked"> | null;
}): Promise<boolean> {
  if (parts.profile?.figure || parts.profile?.figuresUnlocked) return true;
  const [personal, memberships, assignments] = await Promise.all([
    hasPersonalLearningState(parts.personal),
    parts.classes.memberships.count(),
    parts.classes.assignments.count(),
  ]);
  return personal || memberships > 0 || assignments > 0;
}
