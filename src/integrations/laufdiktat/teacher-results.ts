import { mathTaskFromPrompt } from "../../domain/math-practice";
import {
  classifyMentalMathError,
  MENTAL_MATH_ERROR_LABELS,
} from "../../domain/mental-math-feedback";
import type { MentalMathTask } from "../../domain/mental-math";
import { computeRunningDictationStars } from "../../domain/running-dictation";
import { liveWordKind, type LiveWord } from "./live-session";
import type { LiveRoomParticipant, LiveRoomStudent } from "./room-api";
import { liveWordErrorKey } from "./vocabulary-transfer";

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

/**
 * Mathe-Aufgaben des Raums nach Fehlerschlüssel (`liveWordErrorKey`, bei Mathe
 * der Aufgabentext). Der Schlüssel allein genügt nicht: Bei Lückenaufgaben
 * („7 · 8 = _“) steht die Lösung nur im Wort der Lehrkraft. Gelesen wird wie
 * auf dem Kindergerät (`mathTaskFromPrompt`); nicht lesbare Lösungen fehlen,
 * ihre Aufgabe bekommt dann keine Fehlerart. Doppelte Aufgabentexte: die erste
 * gilt.
 */
export function mathTasksByErrorKey(words: readonly LiveWord[]) {
  const tasks = new Map<string, MentalMathTask>();
  words.forEach((word, index) => {
    if (liveWordKind(word) !== "math") return;
    const key = liveWordErrorKey(word);
    if (tasks.has(key)) return;
    const task = mathTaskFromPrompt(
      word.prompt ?? word.targetWord,
      word.targetWord,
      index,
    );
    if (task) tasks.set(key, task);
  });
  return tasks;
}

/**
 * Vermutete Fehlerart einer ersten falschen Antwort als Text für die
 * Lehrkraft; leer bei unbekannter Fehlerart, fehlender Aufgabe oder Antwort.
 */
export function guessedMathErrorLabel(
  task: MentalMathTask | undefined,
  answer: string | undefined,
) {
  if (!task || !answer) return "";
  const kind = classifyMentalMathError(task, answer);
  return kind === "unknown" ? "" : MENTAL_MATH_ERROR_LABELS[kind];
}

export function buildTeacherResultCsv(
  names: string[],
  students: LiveRoomStudent[],
  wordCount: number,
  /** Anzeigename je Serverschlüssel, z. B. „Fuchs 2“. */
  labelFor: (name: string) => string = (name) => name,
  /**
   * Aufgaben des Raums. Mit Mathe-Aufgaben folgt ein Abschnitt je Kind und
   * Aufgabe mit der vermuteten Fehlerart.
   */
  words: readonly LiveWord[] = [],
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
  // Fehlerart je Kind und Aufgabe: ein eigener Abschnitt statt einer Liste
  // „Aufgabe: Fehlerart“ in der Kindzeile, damit die Lehrkraft die Spalte in der
  // Tabelle sortieren und filtern kann. Die Fehlerart ist eine Vermutung aus
  // Aufgabe und erster falscher Antwort und erscheint nur hier.
  const mathTasks = mathTasksByErrorKey(words);
  const taskRows: string[][] = [];
  for (const name of names) {
    const result = students.find((student) => student.studentName === name);
    if (!result) continue;
    for (const [key, task] of mathTasks) {
      const failures = result.wordErrors?.[key] ?? 0;
      if (failures < 1) continue;
      taskRows.push([
        labelFor(name),
        key,
        String(failures),
        guessedMathErrorLabel(task, result.firstWrongAnswers?.[key]),
      ]);
    }
  }
  if (taskRows.length) {
    rows.push(
      [],
      ["Name", "Aufgabe", "Fehlversuche", "Fehlerart (Vermutung)"],
      ...taskRows,
    );
  }
  return `\uFEFF${rows.map((row) => row.map(escapeCsv).join(";")).join("\n")}`;
}
