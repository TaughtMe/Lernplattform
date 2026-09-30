// Solange der Laufdiktat-Pilot läuft, speichert das Live-Spiel keine
// persönlichen Lernereignisse. Vokabeln gehen nur in die LernBox, wenn die
// Lehrkraft das im Vokabelheft einschaltet. Die
// Sichtbarkeit der Bereiche regelt das Freigaberegister (src/domain/release.ts).
export const LAUFDIKTAT_PILOT = true as const;
