/**
 * Welche Stimme spricht? (Plan 2.2 und 3.4). Rein.
 *
 * - `model`: das Sprachmodell im Browser (nur mit Vorschau „sprachmodell“)
 * - `system`: eine Stimme des Geräts
 * - `none`: keine passende Stimme, es bleibt stumm
 */
export type SpeechRoute = "model" | "system" | "none";

export type RouteInput = {
  /** Freigabe `sprachmodell` sichtbar (Vorschau). */
  modelAllowed: boolean;
  /** Das Manifest enthält diese Sprache. */
  modelAvailable: boolean;
  /** Gibt es eine Gerätestimme, die auf dem Gerät läuft (`localService`)? */
  localSystemVoice: boolean;
  /** Gibt es überhaupt eine Gerätestimme (auch Netzwerkstimmen)? */
  anySystemVoice: boolean;
  /** Aufrufer verlangt Stimmen, die auf dem Gerät laufen (B-012). */
  localOnly: boolean;
};

/** Reihenfolge der Wege, beste zuerst. Leer heißt: keine Stimme. */
export function speechRoutes(
  input: RouteInput,
): Exclude<SpeechRoute, "none">[] {
  // Ohne Freigabe oder ohne Modell für die Sprache: wie vor dem Plan (3.2).
  if (!input.modelAllowed || !input.modelAvailable) {
    const system = input.localOnly
      ? input.localSystemVoice
      : input.anySystemVoice;
    return system ? ["system"] : [];
  }
  // Vorschau mit Modell: Modell zuerst, dann nur Stimmen, die auf dem Gerät
  // laufen. Eine Netzwerkstimme kommt nie (B-012).
  return input.localSystemVoice ? ["model", "system"] : ["model"];
}

/** Bester Weg oder `none`. */
export function chooseSpeechRoute(input: RouteInput): SpeechRoute {
  return speechRoutes(input)[0] ?? "none";
}
