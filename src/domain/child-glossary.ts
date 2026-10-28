/**
 * Kinder-Glossar (Audit C-007): Fachwörter, die in Texten für Schülerinnen und
 * Schüler nicht vorkommen sollen, mit dem einfachen Ersatz und dem Grund. Die
 * Liste ist verbindlich; `child-glossary.test.ts` durchsucht damit die
 * sichtbaren Texte der Schüleransichten. Intern (Code, Kommentare, Lehrer- und
 * Entwicklerseiten) dürfen die Fachwörter bleiben.
 */
export type ChildGlossaryEntry = {
  id: string;
  /** Die verbotenen Wörter in Anzeigeform (für Meldungen und Doku). */
  forbidden: readonly string[];
  /** Erkennt alle Formen des Wortes (ohne `g`-Flag, damit es zustandslos bleibt). */
  pattern: RegExp;
  /** Was Kinder stattdessen lesen. */
  replacement: string;
  reason: string;
};

/**
 * Der Anfang eines Wortes: davor steht kein Buchstabe. So trifft „fällig“ nicht
 * „Auffälligkeiten“, wohl aber „überfällig“ (eigener Zweig im Muster).
 */
const WORD_START = "(?<![a-zäöüß])";

export const CHILD_GLOSSARY: readonly ChildGlossaryEntry[] = [
  {
    id: "durchgang",
    forbidden: ["Durchgang", "Durchgänge"],
    pattern: new RegExp(`${WORD_START}durchg[aä]ng`, "i"),
    replacement: "Runde",
    reason:
      "„Durchgang“ ist ein Wort aus der Technik. Kinder kennen „Runde“ aus Spielen, und die Oberfläche sagt sonst überall „Runde“.",
  },
  {
    id: "merkstufe",
    forbidden: ["Merkstufe", "Merkstufen"],
    pattern: /merkstufe/i,
    replacement: "Stufe",
    reason:
      "Das Zusammensetzungswort ist lang und erklärt nichts. „Stufe 1 bis 6“ genügt und stimmt mit den Stufen im Wortspeicher überein.",
  },
  {
    id: "faellig",
    forbidden: ["fällig", "überfällig", "Fälligkeit"],
    pattern: new RegExp(`${WORD_START}(?:über)?fällig`, "i"),
    replacement: "heute dran / kommt wieder",
    reason:
      "„Fällig“ ist Amtsdeutsch (Rechnung, Frist). Kinder verstehen „heute dran“ und „kommt morgen wieder“; Fristen von Aufgaben heißen „Abgabe bis“.",
  },
  {
    id: "wiederholungsfaelligkeit",
    forbidden: ["Wiederholungsfälligkeit"],
    pattern: /wiederholungsfälligkeit/i,
    replacement: "entfällt (sag, wann ein Wort wiederkommt)",
    reason:
      "Ein Wort aus der Lernforschung. Kinder brauchen nur die Antwort auf „Wann sehe ich das Wort wieder?“.",
  },
  {
    id: "wiederholungsabstand",
    forbidden: ["Wiederholungsabstand", "Abstand der Wiederholung"],
    pattern: /wiederholungsabstand|abstand der wiederholung/i,
    replacement: "kommt wieder",
    reason:
      "Beschreibt die Technik hinter dem Plan. Das Kind will wissen, wann ein Wort wiederkommt, nicht wie der Abstand berechnet wird.",
  },
  {
    id: "leitner",
    forbidden: ["Leitner", "Leitner-Prinzip"],
    pattern: /leitner/i,
    replacement: "entfällt (die Boxen reichen)",
    reason:
      "Der Name eines Verfahrens sagt Kindern nichts. Die Boxen sind sichtbar und selbsterklärend.",
  },
  {
    id: "zahlenraum",
    forbidden: ["Zahlenraum"],
    pattern: /zahlenraum/i,
    replacement: "Zahlen bis … / Zahlen von … bis …",
    reason:
      "Ein Wort der Lehrkräfte. Kinder lesen die Grenzen lieber als Zahlen („Von“ und „Bis“).",
  },
  {
    id: "browserprofil",
    forbidden: ["Browserprofil"],
    pattern: /browserprofil/i,
    replacement: "entfällt",
    reason:
      "Technikhinweis für Erwachsene. Einstellungen zum Gerät gehören in den Bereich für Lehrkräfte und Eltern.",
  },
  {
    id: "stapelverwaltung",
    forbidden: ["Stapelverwaltung", "Kartenstapel-Verwaltung"],
    pattern: /stapel-?verwaltung/i,
    replacement: "Stapel",
    reason:
      "„Stapel“ ist erlaubt (siehe unten), Verwaltungsjargon darum herum nicht.",
  },
  {
    id: "klassenbeitrag",
    forbidden: ["Klassenbeitrag"],
    pattern: /klassenbeitrag/i,
    replacement: "zählt für deine Klasse",
    reason: "Amtliches Hauptwort; der Satz mit Verb ist leichter zu lesen.",
  },
];

/**
 * Wörter, die bewusst erlaubt bleiben. Sie stehen hier, damit niemand sie bei
 * der nächsten Durchsicht als Fachwort „entdeckt“.
 */
export const CHILD_GLOSSARY_ALLOWED: readonly {
  word: string;
  reason: string;
}[] = [
  {
    word: "Stapel",
    reason:
      "In der LernBox ist „Stapel“ ein bekanntes, kindgerechtes Wort (Karten liegen auf einem Stapel). „Kartenstapel“ nur dort, wo ohne die Karten unklar bliebe, was gemeint ist. Verwaltungswörter wie „Stapelverwaltung“ gibt es für Kinder nicht.",
  },
  {
    word: "Box",
    reason:
      "Die fünf Boxen der LernBox sind sichtbar und tragen den Namen des Produkts. „Wortbox“ im Wortspeicher ebenso.",
  },
  {
    word: "Stufe",
    reason:
      "Die sechs Stufen im Wortspeicher heißen für Kinder nur „Stufe“, nie „Merkstufe“.",
  },
  {
    word: "Runde",
    reason: "Eine Übung mit mehreren Aufgaben am Stück.",
  },
];

/**
 * Begründete Ausnahmen: Diese Datei darf das Wort eines Eintrags behalten.
 * Sehr klein halten; jede Zeile braucht einen Grund.
 */
export const CHILD_GLOSSARY_EXCEPTIONS: readonly {
  /** Pfad ab Projektwurzel, mit `/`. */
  file: string;
  /** `id` des Glossar-Eintrags. */
  entry: string;
  reason: string;
}[] = [];

/** Welche Glossar-Einträge treffen im Text zu? Leer, wenn der Text sauber ist. */
export function findForbiddenChildTerms(text: string): ChildGlossaryEntry[] {
  return CHILD_GLOSSARY.filter((entry) => entry.pattern.test(text));
}
