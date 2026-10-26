import { computeRunningDictationStars } from "../../domain/running-dictation";
import type { LiveRoomParticipant, LiveRoomStudent } from "./room-api";

export function aggregateWordErrors(students: LiveRoomStudent[]) {
  const totals = new Map<string, number>();
  for (const student of students) {
    for (const [word, count] of Object.entries(student.wordErrors ?? {})) {
      totals.set(word, (totals.get(word) ?? 0) + count);
    }
  }
  return [...totals.entries()].sort((left, right) => right[1] - left[1]);
}

/**
 * Zellen, die ein Tabellenprogramm als Formel liest (OWASP „CSV Injection“):
 * führendes `=`, `+`, `-`, `@`, Tab oder Wagenrücklauf.
 */
const CSV_FORMULA_PREFIX = /^[=+\-@\t\r]/;

/**
 * Eine CSV-Zelle (Trenner `;`): entschärft Formelpräfixe mit einem
 * vorangestellten `'` und setzt Zellen mit `;`, `"` oder Zeilenumbruch in
 * Anführungszeichen. Fremd steuerbare Namen und Fehlerwörter landen sonst
 * als Formel in der Tabelle der Lehrkraft.
 */
export function escapeCsv(value: unknown) {
  const raw = String(value ?? "");
  const text = CSV_FORMULA_PREFIX.test(raw) ? `'${raw}` : raw;
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Namen, die in die Ergebnisliste kommen: im Stationsmodus nur, wer eine
 * Station hat, nach Stationsnummer; sonst alle bekannten Namen.
 */
export function resultNamesFor(
  gameMode: string,
  students: LiveRoomStudent[],
  allNames: string[],
) {
  return gameMode === "STATION"
    ? students
        .filter((student) => student.stationNumber !== null)
        .sort(
          (left, right) =>
            (left.stationNumber ?? 0) - (right.stationNumber ?? 0),
        )
        .map((student) => student.studentName)
    : allNames;
}

/** Spaltenname für den CSV-Export: Tier mit Nummer, sonst Name. */
export function csvParticipantLabel(
  name: string,
  participants: LiveRoomParticipant[],
) {
  const participant = participants.find((item) => item.studentName === name);
  if (participant?.animalToken)
    return participant.animalNumber > 1
      ? `${participant.animalToken} ${participant.animalNumber}`
      : participant.animalToken;
  return name.startsWith("participant-") ? "Ohne Tier" : name;
}

export function buildTeacherResultCsv(
  names: string[],
  students: LiveRoomStudent[],
  wordCount: number,
  /** Anzeigename je Serverschlüssel, z. B. „Fuchs 2“. */
  labelFor: (name: string) => string = (name) => name,
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
      labelFor(name),
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
