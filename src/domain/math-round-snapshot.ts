import * as z from "zod";
import {
  mathOptionsSchema,
  mathTaskSchema,
  type MathOptions,
  type MathPracticeTask,
} from "./math-practice";

/**
 * Zwischenstand einer Kopfrechen-Runde (Befund C-001): die Aufgabenliste der
 * Runde, die Stelle darin, die bisherige Zählung und der Stand an der
 * aktuellen Aufgabe. Jede Antwort steht längst als Lernereignis in der
 * Datenbank; `attempt` zählt die Versuche der Runde weiter, damit ein neuer
 * Versuch nie die Kennung eines gespeicherten übernimmt, und `corrected`
 * sowie `wrongTries` halten fest, dass die Aufgabe schon einen Fehlversuch
 * hatte (gewertet wird weiter der erste Versuch, D-008).
 */
const task = mathTaskSchema.extend({
  practiceKey: z.string().min(1).max(200).optional(),
});

export const mathRoundSnapshotSchema = z
  .object({
    tasks: z.array(task).min(1).max(50),
    /** Erledigte Aufgaben; die nächste steht an dieser Stelle. */
    index: z.number().int().min(0).max(50),
    mistakes: z.number().int().min(0).max(100_000),
    helpCount: z.number().int().min(0).max(50),
    /** Versuche der Runde bisher (Teil der Ereigniskennung). */
    attempt: z.number().int().min(0).max(100_000),
    /** Die aktuelle Aufgabe hatte schon einen Fehlversuch. */
    corrected: z.boolean(),
    wrongTries: z.number().int().min(0).max(1000),
    /** Der Lösungsweg der aktuellen Aufgabe wurde gezeigt. */
    help: z.boolean(),
    /** Einstellung der erzeugten Runde; fehlt bei Wiederholungen und eigenen Aufgaben. */
    options: mathOptionsSchema.optional(),
  })
  .refine(
    (value) => value.index < value.tasks.length,
    "Die Runde ist schon vorbei.",
  );

export type MathRoundSnapshot = z.infer<typeof mathRoundSnapshotSchema>;

export type MathRoundSnapshotSource = {
  tasks: readonly MathPracticeTask[];
  index: number;
  mistakes: number;
  helpCount: number;
  attempt: number;
  corrected: boolean;
  wrongTries: number;
  help: boolean;
  options: MathOptions | null;
};

/** Inhalt des Zwischenstands; `null`, wenn die Runde fertig ist oder nichts zu speichern bleibt. */
export function buildMathRoundSnapshot(
  source: MathRoundSnapshotSource,
): MathRoundSnapshot | null {
  const checked = mathRoundSnapshotSchema.safeParse({
    tasks: source.tasks,
    index: source.index,
    mistakes: source.mistakes,
    helpCount: source.helpCount,
    attempt: source.attempt,
    corrected: source.corrected,
    wrongTries: source.wrongTries,
    help: source.help,
    ...(source.options ? { options: source.options } : {}),
  });
  return checked.success ? checked.data : null;
}

/** Die Aufgaben der Runde, wie das Modul sie braucht (ohne leere Posten-Kennung). */
export function restoreMathTasks(
  snapshot: Pick<MathRoundSnapshot, "tasks">,
): MathPracticeTask[] {
  return snapshot.tasks.map(({ practiceKey, ...rest }) => ({
    ...rest,
    ...(practiceKey ? { practiceKey } : {}),
  }));
}
