import * as z from "zod";
import type { RunningDictationItem } from "./running-dictation";

/**
 * Zwischenstand einer Laufdiktat-Runde allein (Befund C-001): die Aufgaben
 * der Runde, die Stelle darin und die bisherigen Fehlversuche, damit am Ende
 * die richtigen Vokabeln in die LernBox gehen. Das Laufdiktat allein
 * speichert sonst nichts je Antwort; ohne Zwischenstand wäre der Lauf beim
 * Neuladen ganz weg.
 */
const text = z.string().max(2000);

const item = z.object({
  id: z.string().min(1).max(200),
  kind: z.enum(["text", "vocabulary"]),
  target: text.min(1),
  prompt: text.optional(),
  acceptedAnswers: z.array(text).max(50).optional(),
  promptLocale: z.string().max(35).optional(),
  answerLocale: z.string().max(35).optional(),
  caseSensitive: z.boolean().optional(),
  tag: z.string().max(200).optional(),
});

export const runningDictationSnapshotSchema = z
  .object({
    mode: z.enum(["running-dictation", "practice"]),
    transfer: z.enum(["errors", "all", "none"]),
    items: z.array(item).min(1).max(500),
    /** Erledigte Aufgaben; die nächste steht an dieser Stelle. */
    index: z.number().int().min(0).max(500),
    /** Fehlversuche an der aktuellen Aufgabe (bestimmen den Tipp). */
    wrongForCurrent: z.number().int().min(0).max(1000),
    /** Fehlversuche je Aufgabe, für Sterne und Übernahme in die LernBox. */
    errorCounts: z.record(z.string(), z.number().int().min(1).max(1000)),
  })
  .refine(
    (value) => value.index < value.items.length,
    "Die Runde ist schon vorbei.",
  );

export type RunningDictationSnapshot = z.infer<
  typeof runningDictationSnapshotSchema
>;

export type RunningDictationSnapshotSource = {
  mode: "running-dictation" | "practice";
  transfer: "errors" | "all" | "none";
  items: readonly RunningDictationItem[];
  index: number;
  wrongForCurrent: number;
  errorCounts: Readonly<Record<string, number>>;
};

/** Inhalt des Zwischenstands; `null`, wenn die Runde fertig ist oder nichts zu speichern bleibt. */
export function buildRunningDictationSnapshot(
  source: RunningDictationSnapshotSource,
): RunningDictationSnapshot | null {
  const checked = runningDictationSnapshotSchema.safeParse({
    ...source,
    // Nur Aufgaben mit Fehlversuchen werden gezählt.
    errorCounts: Object.fromEntries(
      Object.entries(source.errorCounts).filter(([, count]) => count > 0),
    ),
  });
  return checked.success ? checked.data : null;
}

/** Die Aufgaben der Runde, wie das Modul sie braucht (ohne leere Felder). */
export function restoreRunningDictationItems(
  snapshot: Pick<RunningDictationSnapshot, "items">,
): RunningDictationItem[] {
  return snapshot.items.map(({ id, kind, target, ...optional }) => ({
    id,
    kind,
    target,
    ...(optional.prompt !== undefined ? { prompt: optional.prompt } : {}),
    ...(optional.acceptedAnswers !== undefined
      ? { acceptedAnswers: optional.acceptedAnswers }
      : {}),
    ...(optional.promptLocale !== undefined
      ? { promptLocale: optional.promptLocale }
      : {}),
    ...(optional.answerLocale !== undefined
      ? { answerLocale: optional.answerLocale }
      : {}),
    ...(optional.caseSensitive !== undefined
      ? { caseSensitive: optional.caseSensitive }
      : {}),
    ...(optional.tag !== undefined ? { tag: optional.tag } : {}),
  }));
}
