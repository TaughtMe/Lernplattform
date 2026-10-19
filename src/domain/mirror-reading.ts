/** Spiegelschrift im Lesetext: Dauer und reine Zeitfunktionen (ohne Speicher). */
export const MIRROR_READING_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Ablaufzeitpunkt (ISO), wenn die Spiegelschrift jetzt eingeschaltet wird. */
export function mirrorReadingUntil(now: Date): string {
  return new Date(now.getTime() + MIRROR_READING_DAYS * DAY_MS).toISOString();
}

function untilTime(untilIso: string | null | undefined): number | null {
  if (!untilIso) return null;
  const time = Date.parse(untilIso);
  return Number.isNaN(time) ? null : time;
}

/** Aktiv, solange der Ablauf in der Zukunft liegt; ungültige Werte gelten als aus. */
export function isMirrorReadingActive(
  untilIso: string | null | undefined,
  now: Date,
): boolean {
  const time = untilTime(untilIso);
  return time !== null && time > now.getTime();
}

/** Verbleibende Tage, aufgerundet; 0 wenn aus oder abgelaufen. */
export function mirrorReadingDaysLeft(
  untilIso: string | null | undefined,
  now: Date,
): number {
  const time = untilTime(untilIso);
  if (time === null || time <= now.getTime()) return 0;
  return Math.ceil((time - now.getTime()) / DAY_MS);
}
