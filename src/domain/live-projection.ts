/**
 * Anonymisierte Zusammenfassung des Live-Raums für die Tafel (Befund D-012).
 * Die Lehrerliste zeigt Namen, Fehlerzahlen und „Braucht Hilfe“; wer den
 * Bildschirm projiziert, zeigt das der ganzen Klasse. Die Zusammenfassung
 * kennt deshalb nur Zahlen für den ganzen Raum und nie einzelne Kinder.
 */
export type LiveProjectionSummary = {
  /** Kinder, die fertig sind. */
  finished: number;
  /** Kinder, die in der Runde mitzählen (aktiv und fertig). */
  total: number;
  /** Mittlerer Fortschritt aller in Prozent, 0 bis 100. */
  overall: number;
  /** Text für die Anzeige, z. B. „12 von 24 fertig“. */
  label: string;
};

function wholeBetween(value: number, max: number) {
  return Number.isFinite(value)
    ? Math.min(max, Math.max(0, Math.round(value)))
    : 0;
}

/**
 * Fasst die Kennzahlen der Lehreransicht zusammen. Ungültige Zahlen (negativ,
 * fehlend) werden auf 0 begrenzt.
 */
export function summarizeLiveProjection(overview: {
  active: number;
  finished: number;
  overall: number;
}): LiveProjectionSummary {
  const active = wholeBetween(overview.active, Number.MAX_SAFE_INTEGER);
  const finished = wholeBetween(overview.finished, Number.MAX_SAFE_INTEGER);
  const total = active + finished;
  return {
    finished,
    total,
    overall: wholeBetween(overview.overall, 100),
    label:
      total === 0
        ? "Noch niemand in der Runde"
        : `${finished} von ${total} fertig`,
  };
}
