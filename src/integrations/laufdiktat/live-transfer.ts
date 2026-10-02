import type {
  LiveVocabularyOutcome,
  PlacementRules,
} from "../../domain/live-vocabulary-placement";
import type { RunningDictationImportResult } from "../../storage/personal-learning-events";
import type { LearningBundleV1 } from "../../domain/learning-bundle";
import type { LearningBoxSource } from "../../domain/learning-box";
import type { LiveSession } from "./live-session";
import { markTransferDone, readTransferDone } from "./live-trace";
import {
  buildLiveVocabularyTransfer,
  type LiveTransferTrace,
} from "./vocabulary-transfer";

export type LiveTransferResult =
  { status: "none" } | { status: "success" | "error"; notice: string };

type TransferRepository = {
  ingestBundle: (input: {
    bundle: LearningBundleV1;
    title: string;
    alternativeTitles?: readonly string[];
    source: LearningBoxSource;
    placements?: Readonly<Record<string, LiveVocabularyOutcome>>;
  }) => Promise<RunningDictationImportResult>;
};

export const LIVE_TRANSFER_ERROR =
  "Die Vokabeln konnten auf diesem Gerät nicht übernommen werden.";

/** Kindgerechte Meldung nach der Übernahme, ohne „zurückgestuft“ o. Ä. */
export function liveTransferNotice(result: {
  added: number;
  reused: number;
  practiceAgain: number;
}): string {
  const parts: string[] = [];
  if (result.added > 0) {
    parts.push(
      result.added === 1
        ? "1 neue Vokabel ist jetzt in deiner LernBox."
        : `${result.added} neue Vokabeln sind jetzt in deiner LernBox.`,
    );
  }
  if (result.practiceAgain > 0) {
    parts.push(
      result.practiceAgain === 1
        ? "1 Vokabel üben wir noch einmal."
        : `${result.practiceAgain} Vokabeln üben wir noch einmal.`,
    );
  }
  return parts.length > 0
    ? parts.join(" ")
    : "Diese Vokabeln waren schon in deiner LernBox.";
}

const inFlight = new Map<string, Promise<LiveTransferResult>>();

/**
 * Übernimmt die Vokabeln einer Runde in die LernBox, höchstens einmal pro Runde
 * und Gerät. Läuft auch, wenn die Lehrkraft die Runde vorzeitig beendet hat.
 */
export function runLiveVocabularyTransfer(
  repository: TransferRepository,
  session: LiveSession,
  trace: LiveTransferTrace,
  rules?: PlacementRules,
): Promise<LiveTransferResult> {
  // Im Stationsmodus teilen sich mehrere Kinder ein Gerät: nie übernehmen.
  if (session.stationMode) return Promise.resolve({ status: "none" });
  const done = readTransferDone(session.sessionId);
  if (done !== undefined) {
    return Promise.resolve({ status: "success", notice: done });
  }
  const running = inFlight.get(session.sessionId);
  if (running) return running;

  const transfer = buildLiveVocabularyTransfer(session, trace, rules);
  if (!transfer) return Promise.resolve({ status: "none" });

  const promise = repository
    .ingestBundle({
      bundle: transfer.bundle,
      title: transfer.title,
      alternativeTitles: transfer.alternativeTitles,
      placements: transfer.placements,
      source: { kind: "running-dictation", sourceId: session.sessionId },
    })
    .then((result): LiveTransferResult => {
      const notice = liveTransferNotice(result);
      markTransferDone(session.sessionId, notice);
      return { status: "success", notice };
    })
    .catch((): LiveTransferResult => ({
      status: "error",
      notice: LIVE_TRANSFER_ERROR,
    }))
    .finally(() => inFlight.delete(session.sessionId));
  inFlight.set(session.sessionId, promise);
  return promise;
}
