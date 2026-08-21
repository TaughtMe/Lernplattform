import { decodeRanking, verifyRankingSignature } from "./rankingbrief.ts";
import type { StudentV1 } from "./roster.ts";
import type { RankingTotals } from "./ranking.ts";
import type { ScanInvalidReason, ScanStatus } from "./submission.ts";

export interface RankingScanResult {
  status: ScanStatus;
  studentId?: string;
  alias?: string;
  standNr?: number;
  totals?: RankingTotals;
  reason?: ScanInvalidReason;
}

/** Strukturell wie evaluateSubmission() in submission.ts, aber ohne Turnus-Bezug — der Rankingbeitrag ist periodenlos (kumulativ), siehe rankingbrief.ts. */
export async function evaluateRankingSubmission(
  encoded: string,
  activeClassId: string,
  roster: StudentV1[],
  existingStandNrByStudent: Record<string, number>,
): Promise<RankingScanResult> {
  const decoded = decodeRanking(encoded);
  if (!decoded) return { status: "ungueltig", reason: "format" };

  if (decoded.payload.classId !== activeClassId) return { status: "ungueltig", reason: "falsche_klasse" };

  const student = roster.find((s) => s.id === decoded.payload.studentId);
  if (!student) return { status: "ungueltig", reason: "unbekannter_schueler" };

  if (!(await verifyRankingSignature(decoded, student.secret))) {
    return { status: "ungueltig", reason: "signatur" };
  }

  const { standNr, totals } = decoded.payload;
  const existing = existingStandNrByStudent[student.id];
  if (existing !== undefined && standNr === existing) return { status: "doppelt", studentId: student.id, alias: student.alias, standNr, totals };
  if (existing !== undefined && standNr < existing) return { status: "veraltet", studentId: student.id, alias: student.alias, standNr, totals };
  return { status: "abgegeben", studentId: student.id, alias: student.alias, standNr, totals };
}
