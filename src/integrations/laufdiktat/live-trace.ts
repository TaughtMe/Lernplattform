import { z } from "zod";

/**
 * Lokaler Schnappschuss einer Live-Runde im sessionStorage. Er enthält Hilfen,
 * die nie an den Server gehen, und überlebt ein Neuladen der Seite.
 */
const liveTraceSchema = z.object({
  sessionId: z.string().min(1),
  currentIndex: z.number().int().min(0),
  finished: z.boolean(),
  wordErrors: z.record(z.string(), z.number().int().min(0)),
  wordHelps: z.record(z.string(), z.literal(true)),
  /** Mit Schreiberleichterung tolerant angenommene Wörter; nur lokal. */
  wordTolerated: z.record(z.string(), z.literal(true)).default({}),
  /**
   * Falsch geschriebene Wörter je Textteil für den Wortspeicher
   * (Schlüssel `liveWordErrorKey`); nur lokal, geht nie an den Raum.
   */
  wordMisspellings: z
    .record(z.string(), z.array(z.string().min(1).max(200)).max(200))
    .default({}),
});

export type LiveTrace = z.output<typeof liveTraceSchema>;

const traceKey = (sessionId: string) => `lernraum:live-trace:${sessionId}`;
const transferDoneKey = (sessionId: string) =>
  `lernraum:live-transfer-done:${sessionId}`;
const wordStoreDoneKey = (sessionId: string) =>
  `lernraum:live-wordstore-done:${sessionId}`;

/** Ergebnis der Übernahme in den Wortspeicher, damit sie nur einmal läuft. */
const wordStoreDoneSchema = z.object({
  added: z.array(z.string().min(1).max(200)).max(1_000),
  full: z.boolean(),
});
export type WordStoreTransferDone = z.infer<typeof wordStoreDoneSchema>;

function storage(): Storage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.sessionStorage;
  } catch {
    return undefined;
  }
}

export function readLiveTrace(sessionId: string): LiveTrace | undefined {
  try {
    const raw = storage()?.getItem(traceKey(sessionId));
    if (!raw) return undefined;
    const parsed = liveTraceSchema.safeParse(JSON.parse(raw));
    return parsed.success && parsed.data.sessionId === sessionId
      ? parsed.data
      : undefined;
  } catch {
    return undefined;
  }
}

export function writeLiveTrace(trace: z.input<typeof liveTraceSchema>) {
  try {
    storage()?.setItem(traceKey(trace.sessionId), JSON.stringify(trace));
  } catch {
    // Ohne Speicher läuft die Runde weiter, nur ohne Hilfen-Information.
  }
}

/** Gespeicherte Meldung einer erfolgreichen Übernahme (Einmaligkeit pro Runde). */
export function readTransferDone(sessionId: string): string | undefined {
  try {
    const raw = storage()?.getItem(transferDoneKey(sessionId));
    return raw === null || raw === undefined
      ? undefined
      : z.string().parse(JSON.parse(raw));
  } catch {
    return undefined;
  }
}

export function markTransferDone(sessionId: string, notice: string) {
  try {
    storage()?.setItem(transferDoneKey(sessionId), JSON.stringify(notice));
  } catch {
    // Ohne Speicher entfällt nur der Schutz vor einer zweiten Übernahme.
  }
}

/** Eigene Markierung, getrennt von der Vokabelübernahme. */
export function readWordStoreTransferDone(
  sessionId: string,
): WordStoreTransferDone | undefined {
  try {
    const raw = storage()?.getItem(wordStoreDoneKey(sessionId));
    if (!raw) return undefined;
    const parsed = wordStoreDoneSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

export function markWordStoreTransferDone(
  sessionId: string,
  done: WordStoreTransferDone,
) {
  try {
    storage()?.setItem(wordStoreDoneKey(sessionId), JSON.stringify(done));
  } catch {
    // Ohne Speicher entfällt nur der Schutz vor einer zweiten Übernahme.
  }
}
