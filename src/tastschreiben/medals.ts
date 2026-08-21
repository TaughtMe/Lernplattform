export type MedalTier = "none" | "bronze" | "silver" | "gold" | "platinum" | "diamond";

export interface MedalLessonInput {
  completed: boolean;
  bestAccuracy: number;
  bestWpm: number;
}

/**
 * Gesamt-Rang über den ganzen Lehrplan hinweg, von Bronze (alles einmal
 * bestanden) bis Diamant (alles fehlerfrei bestanden — wie gewünscht).
 * `lessons` muss genau einen Eintrag pro echter Lehrplan-Lektion enthalten
 * (keine Spiele/Sonder-Übungen); fehlen noch Lektionen, ist der Rang "none".
 * Schwellenwerte sind ein bewusster Startwert, nicht endgültig kalibriert —
 * derselbe Vorbehalt wie bei BOX_INTERVAL_DAYS oder computePoints.
 */
export function computeMedal(lessons: MedalLessonInput[], totalLessons: number): MedalTier {
  if (totalLessons === 0 || lessons.length < totalLessons) return "none";
  if (!lessons.every((l) => l.completed)) return "none";

  if (lessons.every((l) => l.bestAccuracy >= 100)) return "diamond";

  const avgAccuracy = lessons.reduce((sum, l) => sum + l.bestAccuracy, 0) / lessons.length;
  const avgWpm = lessons.reduce((sum, l) => sum + l.bestWpm, 0) / lessons.length;

  if (avgAccuracy >= 95 && avgWpm >= 45) return "platinum";
  if (avgAccuracy >= 95 && avgWpm >= 30) return "gold";
  if (avgAccuracy >= 90) return "silver";
  return "bronze";
}

export const MEDAL_LABELS: Record<MedalTier, string> = {
  none: "Noch kein Rang",
  bronze: "Bronze",
  silver: "Silber",
  gold: "Gold",
  platinum: "Platin",
  diamond: "Diamant",
};

export const MEDAL_ICONS: Record<MedalTier, string> = {
  none: "⬜",
  bronze: "🥉",
  silver: "🥈",
  gold: "🥇",
  platinum: "🏅",
  diamond: "💎",
};
