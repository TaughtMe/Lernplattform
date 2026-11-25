/**
 * Anonymisierte Zusammenfassung des Live-Raums für die Tafel (Befund D-012).
 * Die Lehrerliste zeigt Namen, Fehlerzahlen und „Braucht Hilfe“; wer den
 * Bildschirm projiziert, zeigt das der ganzen Klasse. Die Zusammenfassung
 * kennt deshalb nur Zahlen für den ganzen Raum und nie einzelne Kinder. Dazu
 * gehören die häufigsten Fehler der Klasse (Entscheidung des Entwicklers): Sie
 * hängen am Wort, nicht am Kind, und taugen als gemeinsamer Anlass zum Üben.
 */
export type LiveProjectionMistake = { word: string; count: number };

/**
 * Kleingruppen-Schutz (Entscheidung 65, I31-9): „Häufigste Fehler“ und
 * Fehlerzahlen erscheinen an der Tafel erst ab so vielen Kindern. In einer
 * Förderstunde mit vier Kindern wäre sonst erkennbar, wessen Fehler es ist.
 */
export const LIVE_PROJECTION_MIN_PARTICIPANTS_FOR_MISTAKES = 6;

/** Nur diese Zahlen je Kind gehen in die Summen ein; das Kind selbst nie. */
export type LiveProjectionStudentCounts = {
  progress: number;
  total: number;
  mistakes: number;
};

/** So viele Wörter nennt die Tafel höchstens; die Liste bleibt gut lesbar. */
export const LIVE_PROJECTION_MISTAKES_SHOWN = 5;

export type LiveProjectionSummary<M extends LiveProjectionMistake> = {
  /** Kinder, die fertig sind. */
  finished: number;
  /** Kinder, die in der Runde mitzählen (aktiv und fertig). */
  total: number;
  /** Mittlerer Fortschritt aller in Prozent, 0 bis 100. */
  overall: number;
  /** Text für die Anzeige, z. B. „12 von 24 fertig“. */
  label: string;
  /** Die häufigsten Fehlerwörter der ganzen Klasse, häufigstes zuerst; unter sechs Kindern leer. */
  mistakes: M[];
  /** Wie viele Kinder in die Summen eingehen. */
  participants: number;
  /** Fehler dürfen an die Tafel (ab sechs Kindern). */
  mistakesAllowed: boolean;
  /** Klassenziel (M24-1): richtig gelöste Aufgaben aller gegen alle Aufgaben. */
  goal: { solved: number; target: number; percent: number };
  /** Rundenende: die Runde ist fertig und es gibt etwas zu feiern. */
  roundDone: boolean;
  /** Anteil richtiger Antworten in Prozent; null unter sechs Kindern, ohne geprüfte Antworten oder solange nichts beantwortet ist. */
  correctShare: number | null;
  /** Häufigster Fehler der Klasse; nur ab sechs Kindern, sonst null. */
  topMistake: M | null;
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
export function summarizeLiveProjection<
  M extends LiveProjectionMistake = LiveProjectionMistake,
>(overview: {
  active: number;
  finished: number;
  overall: number;
  /** Fehlerwörter des Raums; nur Wort und Zahl, nie ein Kind. */
  mistakes?: readonly M[];
  /** Zahlen je Kind; sie werden nur summiert, nie ausgegeben. */
  students?: readonly LiveProjectionStudentCounts[];
  /** Der Raum ist beendet; die letzten Ergebnisse gelten als Rundenende. */
  ended?: boolean;
  /**
   * Antworten werden geprüft. Im Stationsspiel nicht: Dort zählt nur das
   * Aufdecken, einen Anteil richtiger Antworten gibt es dann nicht.
   */
  answersChecked?: boolean;
}): LiveProjectionSummary<M> {
  const active = wholeBetween(overview.active, Number.MAX_SAFE_INTEGER);
  const finished = wholeBetween(overview.finished, Number.MAX_SAFE_INTEGER);
  const total = active + finished;
  const counts = overview.students ?? [];
  const participants = counts.length > 0 ? counts.length : total;
  const mistakesAllowed =
    participants >= LIVE_PROJECTION_MIN_PARTICIPANTS_FOR_MISTAKES;
  const solved = counts.reduce(
    (sum, entry) => sum + wholeBetween(entry.progress, entry.total),
    0,
  );
  const target = counts.reduce(
    (sum, entry) => sum + wholeBetween(entry.total, Number.MAX_SAFE_INTEGER),
    0,
  );
  const wrong = counts.reduce(
    (sum, entry) => sum + wholeBetween(entry.mistakes, Number.MAX_SAFE_INTEGER),
    0,
  );
  const mistakes = mistakesAllowed
    ? (overview.mistakes ?? [])
        .filter((entry) => Number.isFinite(entry.count) && entry.count > 0)
        .sort(
          (left, right) =>
            right.count - left.count ||
            left.word.localeCompare(right.word, "de"),
        )
        .slice(0, LIVE_PROJECTION_MISTAKES_SHOWN)
    : [];
  return {
    finished,
    total,
    overall: wholeBetween(overview.overall, 100),
    label:
      total === 0
        ? "Noch niemand in der Runde"
        : `${finished} von ${total} fertig`,
    mistakes,
    participants,
    mistakesAllowed,
    goal: {
      solved,
      target,
      percent: target > 0 ? wholeBetween((solved / target) * 100, 100) : 0,
    },
    roundDone:
      solved > 0 && (overview.ended === true || (finished > 0 && active === 0)),
    // Der Anteil richtiger Antworten ist eine Fehlerzahl: erst ab sechs
    // Kindern an der Tafel (Entscheidung 65), nie ohne geprüfte Antworten.
    correctShare:
      mistakesAllowed && overview.answersChecked !== false && solved + wrong > 0
        ? wholeBetween((solved / (solved + wrong)) * 100, 100)
        : null,
    topMistake: mistakes[0] ?? null,
  };
}
