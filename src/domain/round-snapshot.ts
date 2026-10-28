import * as z from "zod";

/**
 * Zwischenstand einer laufenden Übungsrunde (Befund C-001): Wer die Runde
 * verlässt, neu lädt oder unterbrochen wird, kann beim nächsten Öffnen des
 * Moduls weitermachen. Dieser Umschlag ist für alle Module gleich; den
 * Inhalt (`state`) prüft jedes Modul mit seinem eigenen Schema.
 *
 * Rein, ohne Speicher und ohne Oberfläche. Gelesen wird tolerant: Unlesbares,
 * Fremdes, Veraltetes oder Abgelaufenes zählt als „kein Zwischenstand“.
 */
export const ROUND_SNAPSHOT_VERSION = 1;

/** Ein Zwischenstand, der älter ist, wird nicht mehr angeboten. */
export const ROUND_SNAPSHOT_MAX_AGE_MS = 24 * 60 * 60_000;
/** Ein Zeitpunkt in der Zukunft (falsche Uhr) wird nur kurz toleriert. */
const FUTURE_TOLERANCE_MS = 5 * 60_000;

export const ROUND_SNAPSHOT_MODULES = [
  "wortspeicher",
  "lernbox",
  "kopfrechnen",
  "laufdiktat",
] as const;
export type RoundSnapshotModule = (typeof ROUND_SNAPSHOT_MODULES)[number];

const instant = z.iso.datetime({ offset: true });

const envelopeSchema = z.object({
  v: z.literal(ROUND_SNAPSHOT_VERSION),
  module: z.enum(ROUND_SNAPSHOT_MODULES),
  /** Kennung der Runde; dieselbe wie bei den gespeicherten Antworten. */
  roundId: z.string().min(1).max(80),
  startedAt: instant,
  savedAt: instant,
  /** Erledigte Aufgaben („3“ in „3 von 10“). */
  done: z.number().int().min(0).max(10_000),
  /** Aufgaben der Runde („10“ in „3 von 10“). */
  total: z.number().int().min(1).max(10_000),
  state: z.unknown(),
});

/** Umschlag, wie er gespeichert wird. */
export type RoundSnapshot<State> = {
  v: typeof ROUND_SNAPSHOT_VERSION;
  module: RoundSnapshotModule;
  roundId: string;
  startedAt: string;
  savedAt: string;
  done: number;
  total: number;
  state: State;
};

/** Baut den Umschlag; `done` wird in den Bereich 0 bis `total` gezwungen. */
export function buildRoundSnapshot<State>(input: {
  module: RoundSnapshotModule;
  roundId: string;
  startedAt: string;
  now: Date;
  done: number;
  total: number;
  state: State;
}): RoundSnapshot<State> {
  const total = Math.max(1, Math.floor(input.total));
  return {
    v: ROUND_SNAPSHOT_VERSION,
    module: input.module,
    roundId: input.roundId,
    startedAt: input.startedAt,
    savedAt: input.now.toISOString(),
    done: Math.min(total, Math.max(0, Math.floor(input.done))),
    total,
    state: input.state,
  };
}

/** Ist der Zwischenstand abgelaufen (oder stammt er aus der Zukunft)? */
export function isRoundSnapshotExpired(savedAt: string, now: Date): boolean {
  const age = now.getTime() - Date.parse(savedAt);
  return !(age >= -FUTURE_TOLERANCE_MS && age <= ROUND_SNAPSHOT_MAX_AGE_MS);
}

/**
 * Liest einen gespeicherten Zwischenstand. `null` bei kaputtem JSON, falscher
 * Version oder fremdem Modul, bei Ablauf und wenn der Inhalt nicht zum
 * Schema des Moduls passt.
 */
export function parseRoundSnapshot<State>(
  raw: string | null,
  options: {
    module: RoundSnapshotModule;
    now: Date;
    state: z.ZodType<State>;
  },
): RoundSnapshot<State> | null {
  if (!raw) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  const envelope = envelopeSchema.safeParse(value);
  if (!envelope.success || envelope.data.module !== options.module) {
    return null;
  }
  if (isRoundSnapshotExpired(envelope.data.savedAt, options.now)) return null;
  const state = options.state.safeParse(envelope.data.state);
  if (!state.success) return null;
  return { ...envelope.data, state: state.data };
}

/** „3 von 10“ für die Schaltfläche „Weitermachen“. */
export function resumeProgressLabel(done: number, total: number): string {
  return `${done} von ${total}`;
}
