// Solange der Laufdiktat-Pilot läuft, übernimmt das Live-Spiel keine Fehler
// in die LernBox und speichert keine persönlichen Lernereignisse. Die
// Sichtbarkeit der Bereiche regelt das Freigaberegister (src/domain/release.ts).
export const LAUFDIKTAT_PILOT = true as const;
