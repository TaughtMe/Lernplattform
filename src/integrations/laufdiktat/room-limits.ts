/**
 * Zeitgrenzen eines Live-Raums (Entscheidung 52). Maßgeblich ist der Server:
 * `supabase/migrations/20261003120000_room_time_limits.sql` nutzt dieselben
 * Werte, der Datenbank-Vertragstest prüft das. Die Uhrzeiten hier dienen nur
 * der Anzeige.
 */

/** Neue Beitritte mit Raumcode oder QR sind so lange nach dem Öffnen möglich. */
export const ROOM_JOIN_WINDOW_MINUTES = 90;

/** So lange nach dem Öffnen endet der Raum automatisch. */
export const ROOM_MAX_MINUTES = 120;

/** Ab dieser Minute weist die Lehrkraft auf das nahe Ende hin. */
export const ROOM_CLOSING_NOTICE_MINUTES = 110;

const MINUTE_MS = 60_000;

export type RoomTimeState = "open" | "join-closed" | "closing-soon" | "closed";

export interface RoomTimeline {
  /** Ende der Beitrittsfrist. */
  joinUntil: Date;
  /** Beginn des Schließ-Hinweises. */
  closingNoticeAt: Date;
  /** Zeitpunkt, zu dem der Raum schließt. */
  closesAt: Date;
}

export function roomTimeline(openedAt: Date): RoomTimeline {
  const at = (minutes: number) =>
    new Date(openedAt.getTime() + minutes * MINUTE_MS);
  return {
    joinUntil: at(ROOM_JOIN_WINDOW_MINUTES),
    closingNoticeAt: at(ROOM_CLOSING_NOTICE_MINUTES),
    closesAt: at(ROOM_MAX_MINUTES),
  };
}

export function roomTimeState(openedAt: Date, now: Date): RoomTimeState {
  const timeline = roomTimeline(openedAt);
  const time = now.getTime();
  if (time >= timeline.closesAt.getTime()) return "closed";
  if (time >= timeline.closingNoticeAt.getTime()) return "closing-soon";
  if (time >= timeline.joinUntil.getTime()) return "join-closed";
  return "open";
}
