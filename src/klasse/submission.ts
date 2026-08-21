import { decodeSubmission, verifySubmissionSignature } from "./leistungsbrief.ts";
import type { StudentV1 } from "./roster.ts";

/**
 * Die vier Scan-Ergebnisse aus "04 - Lehrer-Cockpit" (Abschnitt "Lokaler
 * Klassenbriefkasten"). "ausstehend" ist dort ein fünfter Zustand, gehört
 * aber zur Roster-Anzeige vor jedem Scan, nicht zu einem Scan-Ergebnis —
 * siehe `summarizeRoster()` weiter unten. Falsche Klasse, kaputter Code und
 * ungültige Signatur werden laut Vorgabe bewusst alle als "ungueltig"
 * angezeigt; welcher der drei Gründe genau vorlag, steht trotzdem in `reason`.
 */
export type ScanStatus = "abgegeben" | "doppelt" | "veraltet" | "ungueltig";

export type ScanInvalidReason = "format" | "falsche_klasse" | "unbekannter_schueler" | "signatur" | "falscher_turnus";

export interface ScanResult {
  status: ScanStatus;
  studentId?: string;
  alias?: string;
  standNr?: number;
  reason?: ScanInvalidReason;
}

export async function evaluateSubmission(
  encoded: string,
  activeClassId: string,
  activeTurnusId: string,
  roster: StudentV1[],
  existingStandNrByStudent: Record<string, number>,
): Promise<ScanResult> {
  const decoded = decodeSubmission(encoded);
  if (!decoded) return { status: "ungueltig", reason: "format" };

  if (decoded.payload.classId !== activeClassId) return { status: "ungueltig", reason: "falsche_klasse" };

  const student = roster.find((s) => s.id === decoded.payload.studentId);
  if (!student) return { status: "ungueltig", reason: "unbekannter_schueler" };

  if (!(await verifySubmissionSignature(decoded, student.secret))) {
    return { status: "ungueltig", reason: "signatur" };
  }

  if (decoded.payload.turnusId !== activeTurnusId) {
    return { status: "ungueltig", studentId: student.id, alias: student.alias, reason: "falscher_turnus" };
  }

  const { standNr } = decoded.payload;
  const existing = existingStandNrByStudent[student.id];
  if (existing !== undefined && standNr === existing) return { status: "doppelt", studentId: student.id, alias: student.alias, standNr };
  if (existing !== undefined && standNr < existing) return { status: "veraltet", studentId: student.id, alias: student.alias, standNr };
  return { status: "abgegeben", studentId: student.id, alias: student.alias, standNr };
}

export interface RosterStatusEntry {
  studentId: string;
  alias: string;
  submitted: boolean;
}

/** Grundlage für "x von y abgegeben" plus die Liste der noch fehlenden Schüler. */
export function summarizeRoster(roster: StudentV1[], submittedStudentIds: ReadonlySet<string>): RosterStatusEntry[] {
  return roster.map((s) => ({ studentId: s.id, alias: s.alias, submitted: submittedStudentIds.has(s.id) }));
}
