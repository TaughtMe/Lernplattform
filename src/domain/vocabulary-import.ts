/**
 * Gemeinsamer Vokabelimport für LernBox (Schüler) und Laufdiktat (Lehrkraft).
 *
 * Eine Vokabel pro Zeile. Spalten sind mit Tabulator (aus Excel oder Sheets
 * kopiert) oder Semikolon getrennt, das Komma ist bewusst kein Trenner, weil
 * es in Vokabeln vorkommt. Die dritte Spalte ist der Tag; weitere richtige
 * Antworten stehen mit „|“ in derselben Zelle.
 */

export type VocabularyImportEntry = {
  /** Zeilennummer im Text (ab 1, leere Zeilen mitgezählt). */
  lineNumber: number;
  /** Lfd. Nummer unter den nicht leeren Zeilen (ab 0, mit Kopfzeile). */
  ordinal: number;
  /** Die getrimmte Originalzeile. */
  source: string;
  /** Vorderseite, Zelle getrimmt (inklusive „|“). */
  front: string;
  /** Rückseite, Zelle getrimmt (inklusive „|“). */
  back: string;
  tag?: string;
};

export type VocabularyImportSkip = {
  lineNumber: number;
  /** Die getrimmte Originalzeile. */
  line: string;
  /** Kurzer Grund, z. B. „nur eine Spalte“. */
  reason: string;
};

export type VocabularyImportResult = {
  entries: VocabularyImportEntry[];
  skipped: VocabularyImportSkip[];
  /** Die Kopfzeile der Vorlage wurde erkannt und übersprungen. */
  headerSkipped: boolean;
};

export const VOCABULARY_SKIP_REASONS = {
  oneColumn: "nur eine Spalte",
  frontEmpty: "Vorderseite leer",
  backEmpty: "Rückseite leer",
} as const;

const HEADER_FRONT = new Set(["vorderseite", "front"]);
const HEADER_BACK = new Set(["rückseite", "rueckseite", "back"]);

function splitCells(line: string) {
  return (line.includes("\t") ? line.split("\t") : line.split(";")).map(
    (cell) => cell.trim(),
  );
}

/** Kopfzeile der Vorlage: `Vorderseite;Rückseite[;Tag]`, auch englisch. */
function isHeaderLine(cells: readonly string[]) {
  const [front = "", back = "", tag = "", ...rest] = cells.map((cell) =>
    cell.toLocaleLowerCase("de"),
  );
  return (
    HEADER_FRONT.has(front) &&
    HEADER_BACK.has(back) &&
    (tag === "" || tag === "tag") &&
    rest.every((cell) => !cell)
  );
}

/** Hat die Zelle mindestens eine nicht leere Antwort (ohne „|“-Reste)? */
function hasContent(cell: string) {
  return cell.split("|").some((part) => part.trim());
}

/**
 * Prüft ein Paar aus Vorder- und Rückseite; liefert den Grund, warum es nicht
 * übernommen wird, oder `null`. Gilt auch für getippte Zeilen ohne Text.
 */
export function vocabularyPairProblem(front: string, back: string) {
  if (!hasContent(front)) return VOCABULARY_SKIP_REASONS.frontEmpty;
  if (!hasContent(back)) return VOCABULARY_SKIP_REASONS.backEmpty;
  return null;
}

/**
 * Zerlegt Text in Vokabelzeilen. Verträgt `\r\n`, entfernt ein BOM am Anfang
 * und überspringt die Kopfzeile der Vorlage. Übersprungene Zeilen kommen mit
 * Zeilennummer und Grund zurück.
 */
export function parseVocabularyImport(text: string): VocabularyImportResult {
  const entries: VocabularyImportEntry[] = [];
  const skipped: VocabularyImportSkip[] = [];
  let headerSkipped = false;
  let ordinal = -1;
  text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .forEach((raw, index) => {
      const line = raw.trim();
      if (!line) return;
      ordinal += 1;
      const lineNumber = index + 1;
      const cells = splitCells(line);
      // Nur die erste nicht leere Zeile kann eine Kopfzeile sein.
      if (ordinal === 0 && isHeaderLine(cells)) {
        headerSkipped = true;
        return;
      }
      const skip = (reason: string) => {
        skipped.push({ lineNumber, line, reason });
      };
      if (cells.length < 2) return skip(VOCABULARY_SKIP_REASONS.oneColumn);
      const [front = "", back = "", tag = ""] = cells;
      const problem = vocabularyPairProblem(front, back);
      if (problem) return skip(problem);
      entries.push({
        lineNumber,
        ordinal,
        source: line,
        front,
        back,
        ...(tag ? { tag } : {}),
      });
    });
  return { entries, skipped, headerSkipped };
}

/** Dateiname der herunterladbaren Vorlage. */
export const VOCABULARY_TEMPLATE_FILENAME = "vokabeln-vorlage.csv";

const TEMPLATE_LINES = [
  "Vorderseite;Rückseite;Tag",
  "Haus;home | house;Unit 1",
  "Baum;tree;Unit 1",
  "Sonne;sun;Natur",
] as const;

/**
 * Inhalt der Vorlage `vokabeln-vorlage.csv`: UTF-8 mit BOM (damit Excel die
 * Umlaute richtig liest), Semikolon, Kopfzeile und drei Beispielzeilen.
 */
export function buildVocabularyTemplate() {
  return `\uFEFF${TEMPLATE_LINES.join("\r\n")}\r\n`;
}
