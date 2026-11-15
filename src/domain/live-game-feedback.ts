// Rules from Laufdiktat 6c2ade4: speed is display-only, never learning progress.
export function speedPoints(length: number, durationMs: number) {
  return durationMs > 0 && length > 0
    ? Math.max(0, Math.round((length / (durationMs / 1000)) * 100))
    : 0;
}

/**
 * Battle lädt über Genauigkeit statt Tempo (Vision, Nachtrag nach Phase 2,
 * Nr. 7; Bericht 24, M24-4): Nur eine Antwort, die beim ersten Versuch
 * stimmt, verlängert die Richtig-Serie. Ein Fehler setzt die Serie zurück,
 * nie die Ladung. Wer vorne liegt, bekommt keinen Vorteil; früher gab es
 * 25 je richtige Antwort und 34 für Zurückliegende (Platz = Tempo).
 */
export const BATTLE_CHARGE_BY_STREAK = [0, 20, 25, 34] as const;

/** Serie nach einer richtigen Antwort: +1 beim ersten Versuch, sonst 0. */
export function nextBattleStreak(streak: number, firstTry: boolean) {
  return firstTry ? Math.max(0, streak) + 1 : 0;
}

/** Ladung für eine Serie dieser Länge (ab drei in Folge die volle Stufe). */
export function battleChargeGain(streak: number) {
  if (streak <= 0) return 0;
  return BATTLE_CHARGE_BY_STREAK[Math.min(streak, 3)] ?? 0;
}
