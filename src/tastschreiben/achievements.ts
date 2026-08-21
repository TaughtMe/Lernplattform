export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: string;
}

/**
 * Abzeichen, um den Spielcharakter zu erhöhen. Bewusst als Checkliste
 * (jedes einzeln erreichbar), getrennt von der Gesamt-Medaille in
 * medals.ts, die den Lehrplan als Ganzes bewertet.
 */
export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "erste-lektion", title: "Erste Schritte", description: "Die erste Lektion bestanden.", icon: "🌱" },
  { id: "zehn-lektionen", title: "Auf Kurs", description: "10 Lektionen bestanden.", icon: "🚴" },
  { id: "alle-lektionen", title: "Vollständig", description: "Alle Lektionen bestanden.", icon: "🏁" },
  { id: "fehlerfrei-lektion", title: "Fehlerfrei", description: "Eine Lektion mit 100 % Genauigkeit bestanden.", icon: "💎" },
  { id: "praezisionsserie", title: "Präzisionsserie", description: "5 Lektionen mit mindestens 95 % Genauigkeit bestanden.", icon: "🎯" },
  { id: "flotte-finger", title: "Flotte Finger", description: "40 Wörter pro Minute in einer Runde erreicht.", icon: "⚡" },
  { id: "blitzschnell", title: "Blitzschnell", description: "60 Wörter pro Minute in einer Runde erreicht.", icon: "🚀" },
  { id: "regen-fan", title: "Regen-Fan", description: "100 Punkte in einer Buchstabenregen-Runde erreicht.", icon: "🌧️" },
  { id: "serienkoenig", title: "Serienkönig", description: "Eine Serie von 15 Wörtern in Buchstabenregen geschafft.", icon: "👑" },
  { id: "zeitrennen-ass", title: "Zeitrennen-Ass", description: "Im Zeitrennen mindestens 50 Wörter pro Minute erreicht.", icon: "⏱️" },
];

export interface AchievementProgress {
  lessons: Array<{ completed: boolean; bestAccuracy: number; bestWpm: number }>;
  totalLessons: number;
  bestGameScore: number;
  bestGameStreak: number;
  bestTimeAttackWpm: number;
}

export function evaluateAchievements(progress: AchievementProgress): Set<string> {
  const completed = progress.lessons.filter((l) => l.completed);
  const unlocked = new Set<string>();

  if (completed.length >= 1) unlocked.add("erste-lektion");
  if (completed.length >= 10) unlocked.add("zehn-lektionen");
  if (progress.totalLessons > 0 && completed.length >= progress.totalLessons) unlocked.add("alle-lektionen");
  if (completed.some((l) => l.bestAccuracy >= 100)) unlocked.add("fehlerfrei-lektion");
  if (completed.filter((l) => l.bestAccuracy >= 95).length >= 5) unlocked.add("praezisionsserie");
  if (completed.some((l) => l.bestWpm >= 40)) unlocked.add("flotte-finger");
  if (completed.some((l) => l.bestWpm >= 60)) unlocked.add("blitzschnell");
  if (progress.bestGameScore >= 100) unlocked.add("regen-fan");
  if (progress.bestGameStreak >= 15) unlocked.add("serienkoenig");
  if (progress.bestTimeAttackWpm >= 50) unlocked.add("zeitrennen-ass");

  return unlocked;
}
