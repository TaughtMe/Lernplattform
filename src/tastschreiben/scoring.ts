/**
 * Punkte für eine einzelne Übungsrunde, wie bei TypingClub. Genauigkeit
 * zählt quadratisch stärker als Geschwindigkeit — passend zum bestehenden
 * Grundsatz "erst Genauigkeit, dann Geschwindigkeit" (siehe "07 - Adaptive
 * Merkstrecke"): 100 % Genauigkeit bei 30 wpm gibt volle 30 Punkte, 80 %
 * Genauigkeit bei denselben 30 wpm nur rund 19. Ein erstmaliges Bestehen
 * einer Lektion gibt zusätzlich einen festen Bonus. Nicht endgültig
 * kalibriert — ein bewusster Startwert wie BOX_INTERVAL_DAYS oder
 * MISTAKE_STAGE_DROP_THRESHOLD an anderer Stelle.
 */
const FIRST_COMPLETION_BONUS = 20;
const WPM_CAP_FOR_SCORING = 200;

export function computePoints(stats: { wpm: number; accuracy: number }, isFirstCompletion: boolean = false): number {
  const accuracyFactor = (stats.accuracy / 100) ** 2;
  const cappedWpm = Math.min(Math.max(stats.wpm, 0), WPM_CAP_FOR_SCORING);
  const base = Math.round(cappedWpm * accuracyFactor);
  return base + (isFirstCompletion ? FIRST_COMPLETION_BONUS : 0);
}
