import { learningEventV1Schema } from "../domain/learning-bundle";
import { readTolerant, type QuarantinedRecord } from "../domain/tolerant-read";
import { wordBoxSchema } from "../domain/word-box";
import { wordRoundSchema } from "../domain/word-store-progress";
import { PersonalLearningDatabase } from "./personal-learning-events";
import {
  learningWordProgressSchema,
  textboxSessionSchema,
  typingProgressSchema,
} from "./progress-schema";

/** Lernstand-Tabellen, die tolerant gelesen werden (Regel S-1). */
const READ_TABLES = [
  ["learningEvents", learningEventV1Schema],
  ["learningWordProgress", learningWordProgressSchema],
  ["typingProgress", typingProgressSchema],
  ["textboxSessions", textboxSessionSchema],
  ["wordBoxes", wordBoxSchema],
  ["wordRounds", wordRoundSchema],
] as const;

/**
 * Gespeicherte Datensätze, die diese App-Version nicht lesen kann (Quarantäne).
 * Sie bleiben unverändert gespeichert und fehlen nur in den Auswertungen.
 */
export async function listUnreadableRecords(
  database = new PersonalLearningDatabase(),
): Promise<QuarantinedRecord[]> {
  const quarantined: QuarantinedRecord[] = [];
  for (const [table, schema] of READ_TABLES) {
    const rows: unknown[] = await database.table(table).toArray();
    quarantined.push(...readTolerant(schema, rows, table).quarantined);
  }
  return quarantined;
}

export async function countUnreadableRecords(
  database = new PersonalLearningDatabase(),
) {
  return (await listUnreadableRecords(database)).length;
}
