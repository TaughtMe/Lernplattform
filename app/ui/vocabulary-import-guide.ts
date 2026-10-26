/**
 * Kurze Anleitung zum Vokabelimport (höchstens fünf Sätze), einmal kindgerecht
 * für die LernBox und einmal in Erwachsenensprache für das Laufdiktat.
 */
export const VOCABULARY_IMPORT_GUIDE = {
  student: {
    summary: "So schreibst du die Liste",
    sentences: [
      "Pro Zeile eine Vokabel: Vorderseite; Rückseite; Tag, zum Beispiel „Haus; home | house; Unit 1“.",
      "Der Tag ist freiwillig.",
      "Mehrere richtige Antworten trennst du mit | oder mit Leerzeichen und / („home / house“). Ein Teil in Klammern wie „(to) go“ ist freiwillig.",
      "In Excel oder Google Sheets schreibst du die Vorderseite in Spalte A, die Rückseite in Spalte B und den Tag in Spalte C und speicherst die Tabelle als CSV.",
      "Mit „Vorlage herunterladen“ bekommst du eine fertige Datei zum Ausfüllen.",
    ],
  },
  teacher: {
    summary: "So ist die Tabelle aufgebaut",
    sentences: [
      "Pro Zeile eine Vokabel: Vorderseite; Rückseite; Tag (optional), zum Beispiel „Haus; home | house; Unit 1“.",
      "Weitere richtige Antworten werden mit | oder mit Leerzeichen und / getrennt; Klammerteile wie „(to) go“ sind freiwillig.",
      "In Excel oder Google Sheets gehören die Vorderseite in Spalte A, die Rückseite in Spalte B und der Tag in Spalte C; als CSV speichern oder die Zellen kopieren und einfügen.",
      "Die Kopfzeile der Vorlage wird erkannt und nicht als Vokabel gezählt.",
    ],
  },
} as const;
