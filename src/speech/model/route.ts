/**
 * Welche Stimme spricht? (Plan 2.2 und 3.4). Rein.
 *
 * - `model`: die Lernraum-Stimme (Sprachmodell im Browser)
 * - `system`: eine Stimme, die auf dem Gerät läuft (nie eine Netzstimme, B-012)
 * - `none`: keine passende Stimme; die Stelle zeigt einen Hinweis
 */
export type SpeechRoute = "model" | "system" | "none";

export type RouteInput = {
  /** Lernraum-Stimme erlaubt (Freigabe und Schalter je Gerät). */
  modelAllowed: boolean;
  /** Das Manifest enthält diese Sprache. */
  modelAvailable: boolean;
  /** Gibt es eine Gerätestimme, die auf dem Gerät läuft (`localService`)? */
  localSystemVoice: boolean;
};

/** Reihenfolge der Wege, beste zuerst. Leer heißt: keine Stimme. */
export function speechRoutes(
  input: RouteInput,
): Exclude<SpeechRoute, "none">[] {
  // Ohne Lernraum-Stimme oder ohne Modell für die Sprache: Gerätestimme.
  if (!input.modelAllowed || !input.modelAvailable) {
    return input.localSystemVoice ? ["system"] : [];
  }
  // Modell zuerst, dann nur Stimmen, die auf dem Gerät laufen.
  return input.localSystemVoice ? ["model", "system"] : ["model"];
}

/** Bester Weg oder `none`. */
export function chooseSpeechRoute(input: RouteInput): SpeechRoute {
  return speechRoutes(input)[0] ?? "none";
}
