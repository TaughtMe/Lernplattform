import { computeRunningDictationStars } from "../../domain/running-dictation";
import type { LiveRoomStudent } from "./room-api";

export function aggregateWordErrors(students: LiveRoomStudent[]) {
  const totals = new Map<string, number>();
  for (const student of students) {
    for (const [word, count] of Object.entries(student.wordErrors ?? {})) {
      totals.set(word, (totals.get(word) ?? 0) + count);
    }
  }
  return [...totals.entries()].sort((left, right) => right[1] - left[1]);
}

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  return /[;"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildTeacherResultCsv(
  names: string[],
  students: LiveRoomStudent[],
  wordCount: number,
) {
  const rows = [
    [
      "Name",
      "Status",
      "Fortschritt_Prozent",
      "Fehler",
      "Versuche",
      "Spicker",
      "Sterne",
    ],
  ];
  for (const name of names) {
    const result = students.find((student) => student.studentName === name);
    const progress = result?.finished
      ? 100
      : Math.min(
          100,
          Math.round(
            ((result?.currentIndex ?? 0) / Math.max(1, wordCount)) * 100,
          ),
        );
    rows.push([
      name,
      result?.finished ? "Fertig" : "Aktiv",
      String(progress),
      String(result?.errors ?? 0),
      String(result?.attempts ?? 0),
      String(result?.peeks ?? 0),
      result?.finished
        ? String(computeRunningDictationStars(result.errors, wordCount))
        : "",
    ]);
  }
  const errors = aggregateWordErrors(students);
  if (errors.length) {
    rows.push([], ["Häufigste Fehler", "Anzahl"]);
    rows.push(...errors.map(([word, count]) => [word, String(count)]));
  }
  return `\uFEFF${rows.map((row) => row.map(escapeCsv).join(";")).join("\n")}`;
}
