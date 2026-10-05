/**
 * Unterschiede zweier Fassungen für den Konfliktdialog: nur Felder, die
 * wirklich voneinander abweichen, mit lesbaren Namen und kurzen Werten.
 */
import type { SyncData } from "./model";

const LABELS: Record<string, string> = {
  title: "Titel",
  source: "Inhalt",
  name: "Name",
  displayName: "Name",
  teacherName: "Lehrkraft",
  schoolYear: "Schuljahr",
  instructions: "Anweisung",
  dueDate: "Fällig am",
  status: "Status",
  subject: "Fach",
  kind: "Art",
  textSplit: "Zerlegung",
  promptLocale: "Fragesprache",
  answerLocale: "Antwortsprache",
  enabledModules: "Module",
  classIds: "Klassen",
  memberIds: "Kinder",
  materialId: "Material",
  writingRelief: "Schreiberleichterung",
  archivedAt: "Archiviert",
  school: "Schule",
  email: "E-Mail",
  subjects: "Fächer",
  sequence: "Durchgang",
  completedAt: "Abgeschlossen",
};

/** Felder, die sich bei jeder Änderung ohnehin mitbewegen. */
const NOISE = new Set([
  "updatedAt",
  "createdAt",
  "revision",
  "lastUsedAt",
  "writingReliefIssuedAt",
  "writingReliefSignature",
  "signature",
  "receivedAt",
  "id",
]);

export type FieldDifference = {
  field: string;
  label: string;
  kept: string;
  other: string;
};

const MAX_LENGTH = 140;

function show(value: unknown): string {
  if (value === undefined || value === null || value === "") return "–";
  const text = Array.isArray(value)
    ? value.map((entry) => String(entry)).join(", ")
    : typeof value === "object"
      ? JSON.stringify(value)
      : typeof value === "boolean"
        ? value
          ? "ja"
          : "nein"
        : String(value);
  return text.length > MAX_LENGTH ? `${text.slice(0, MAX_LENGTH - 1)}…` : text;
}

export function differences(
  kept: SyncData | undefined,
  other: SyncData | undefined,
): FieldDifference[] {
  const left = kept ?? {};
  const right = other ?? {};
  const fields = [...new Set([...Object.keys(left), ...Object.keys(right)])]
    .filter((field) => !NOISE.has(field))
    .sort();
  const result: FieldDifference[] = [];
  for (const field of fields) {
    const a = show(left[field]);
    const b = show(right[field]);
    if (JSON.stringify(left[field]) === JSON.stringify(right[field])) continue;
    result.push({ field, label: LABELS[field] ?? field, kept: a, other: b });
  }
  return result;
}
