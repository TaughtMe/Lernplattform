import * as z from "zod";
import type {
  LearningBoxCard,
  LearningBoxDirection,
  LearningBoxMode,
} from "./learning-box";

/**
 * Zwischenstand einer LernBox-Runde (Befund C-001). Gespeichert wird nur die
 * Reihenfolge (Karte und Richtung je Aufgabe), die Stelle in der Runde, die
 * bisherige Zählung und welche Karten schon bewertet sind. Die Karten selbst
 * und ihre Boxen liegen längst in der Datenbank: Jede bewertete Antwort wurde
 * dort gespeichert, bevor der Zwischenstand sie erwähnt. Nach dem Fortsetzen
 * zählt für schon bewertete Karte+Richtung weiter nur der erste Versuch
 * (`attempted`), nichts wird doppelt gewertet.
 */
const direction = z.enum(["forward", "reverse"]);

export const learningBoxSnapshotSchema = z
  .object({
    title: z.string().min(1).max(120),
    mode: z.enum(["oral", "writing"]),
    /** Übungsrunde einer Box: nichts wird verschoben oder gespeichert. */
    practice: z.boolean(),
    queue: z
      .array(z.object({ cardId: z.string().min(1).max(100), direction }))
      .min(1)
      .max(2000),
    /** Erledigte Aufgaben der Runde; die nächste steht an dieser Stelle. */
    done: z.number().int().min(0).max(2000),
    stats: z.object({
      correct: z.number().int().min(0).max(4000),
      wrong: z.number().int().min(0).max(4000),
    }),
    attempted: z.array(z.string().min(1).max(220)).max(4000),
  })
  .refine(
    (value) => value.done < value.queue.length,
    "Die Runde ist schon vorbei.",
  );

export type LearningBoxSnapshot = z.infer<typeof learningBoxSnapshotSchema>;

/** Was die Runde im Container zum Speichern hergibt. */
export type LearningBoxSnapshotSource = {
  title: string;
  mode: LearningBoxMode;
  practice: boolean;
  queue: readonly {
    card: Pick<LearningBoxCard, "id">;
    direction: LearningBoxDirection;
  }[];
  index: number;
  /** Die Antwort auf die Karte an dieser Stelle ist schon bewertet (Rückmeldung steht). */
  answered: boolean;
  stats: { correct: number; wrong: number };
  attempted: readonly string[];
  finished: boolean;
};

/** Erledigte Aufgaben („3 von 10“): eine bewertete Antwort zählt sofort. */
export function learningBoxRoundProgress(source: {
  queueLength: number;
  index: number;
  answered: boolean;
}): { done: number; total: number } {
  const total = Math.max(1, source.queueLength);
  return {
    done: Math.min(total, source.index + (source.answered ? 1 : 0)),
    total,
  };
}

/** Inhalt des Zwischenstands; `null`, wenn die Runde vorbei ist oder nichts mehr zu tun bleibt. */
export function buildLearningBoxSnapshot(
  source: LearningBoxSnapshotSource,
): LearningBoxSnapshot | null {
  if (source.finished) return null;
  const { done } = learningBoxRoundProgress({
    queueLength: source.queue.length,
    index: source.index,
    answered: source.answered,
  });
  const checked = learningBoxSnapshotSchema.safeParse({
    title: source.title,
    mode: source.mode,
    practice: source.practice,
    queue: source.queue.map((entry) => ({
      cardId: entry.card.id,
      direction: entry.direction,
    })),
    done,
    stats: source.stats,
    attempted: source.attempted,
  });
  return checked.success ? checked.data : null;
}

/**
 * Baut die Runde aus dem Zwischenstand und den aktuellen Karten wieder auf.
 * Karten, die es nicht mehr gibt (gelöscht), entfallen; die Stelle in der
 * Runde rückt entsprechend nach. `null`, wenn nichts mehr zu üben bleibt.
 */
export function restoreLearningBoxQueue(
  snapshot: LearningBoxSnapshot,
  cards: readonly LearningBoxCard[],
): {
  queue: { card: LearningBoxCard; direction: LearningBoxDirection }[];
  index: number;
} | null {
  const byId = new Map(cards.map((card) => [card.id, card]));
  const queue: { card: LearningBoxCard; direction: LearningBoxDirection }[] =
    [];
  let index = 0;
  snapshot.queue.forEach((entry, position) => {
    const card = byId.get(entry.cardId);
    if (!card) return;
    if (position < snapshot.done) index += 1;
    queue.push({ card, direction: entry.direction });
  });
  return index < queue.length ? { queue, index } : null;
}
