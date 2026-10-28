/**
 * Zeitmessung des Tagestrainings (Umsetzungsplan Welle 3, D2-5).
 *
 * Gezählt wird nur aktive Zeit, als reine Funktion über Ereignisse. Die Zeit
 * kommt von außen (Millisekunden), die Funktionen lesen keine Uhr.
 *
 * - Eingabe: Die Zeit seit der letzten Eingabe zählt, solange der Abstand
 *   höchstens `ACTIVE_TIME_IDLE_LIMIT_MS` beträgt.
 * - Nach mehr als 3 Minuten ohne Eingabe pausiert die Uhr. Die Zeit seit der
 *   letzten Eingabe zählt dann nicht; auch eine spätere Eingabe holt sie nicht
 *   nach.
 * - Verdeckte Seite: Die Uhr pausiert sofort. Beim Zurückkommen läuft sie
 *   weiter und der Moment des Zurückkommens zählt als Eingabe.
 * - Tick: bringt nur die aktuelle Zeit herein, damit die Anzeige läuft.
 *
 * Es wird nichts verworfen außer Zeit: Antworten speichern die Module selbst.
 */

/** Nach so langer Zeit ohne Eingabe pausiert die Uhr (3 Minuten). */
export const ACTIVE_TIME_IDLE_LIMIT_MS = 3 * 60 * 1000;

export type ActiveTimeEvent = {
  type: "input" | "hidden" | "visible" | "tick";
  /** Zeitpunkt in Millisekunden, von außen. */
  at: number;
};

export type ActiveTimeState = {
  /** Sicher aktive Zeit bis zur letzten Eingabe bzw. bis zum Verdecken. */
  committedMs: number;
  /** Zeit der letzten Eingabe; `null`, solange die Seite verdeckt ist. */
  lastInputAt: number | null;
  /** Neueste bekannte Zeit; Ereignisse mit älterer Zeit werden hierauf gehoben. */
  now: number;
};

export type ActiveTimeStatus = "running" | "idle" | "hidden";

/** Beginn der Messung; der Start (ein Tipp) zählt als erste Eingabe. */
export function startActiveTime(at: number): ActiveTimeState {
  return { committedMs: 0, lastInputAt: at, now: at };
}

/** Zeit seit der letzten Eingabe, wenn sie noch zählen darf; sonst `0`. */
function pendingMs(state: ActiveTimeState): number {
  if (state.lastInputAt === null) return 0;
  const gap = state.now - state.lastInputAt;
  return gap <= ACTIVE_TIME_IDLE_LIMIT_MS ? gap : 0;
}

/** Verarbeitet ein Ereignis; die Zeit läuft nie rückwärts. */
export function reduceActiveTime(
  state: ActiveTimeState,
  event: ActiveTimeEvent,
): ActiveTimeState {
  const at = Math.max(event.at, state.now);
  const advanced = { ...state, now: at };
  switch (event.type) {
    case "tick":
      return advanced;
    case "input": {
      // Verdeckt kommt keine echte Eingabe; sie ändert nichts.
      if (state.lastInputAt === null) return advanced;
      return {
        committedMs: state.committedMs + pendingMs(advanced),
        lastInputAt: at,
        now: at,
      };
    }
    case "hidden": {
      if (state.lastInputAt === null) return advanced;
      return {
        committedMs: state.committedMs + pendingMs(advanced),
        lastInputAt: null,
        now: at,
      };
    }
    case "visible":
      return state.lastInputAt === null
        ? { committedMs: state.committedMs, lastInputAt: at, now: at }
        : advanced;
  }
}

/** Aktive Zeit bis zur neuesten bekannten Zeit (Anzeige und Ende-Regel). */
export function activeMs(state: ActiveTimeState): number {
  return state.committedMs + pendingMs(state);
}

export function activeTimeStatus(state: ActiveTimeState): ActiveTimeStatus {
  if (state.lastInputAt === null) return "hidden";
  return state.now - state.lastInputAt > ACTIVE_TIME_IDLE_LIMIT_MS
    ? "idle"
    : "running";
}

/** Faltet eine Ereignisfolge ab dem Start. */
export function activeTimeOf(
  startAt: number,
  events: readonly ActiveTimeEvent[],
): ActiveTimeState {
  return events.reduce(reduceActiveTime, startActiveTime(startAt));
}
