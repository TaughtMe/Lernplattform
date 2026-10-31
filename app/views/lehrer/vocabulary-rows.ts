/**
 * Zeilen der Vokabeltabelle (Freigabe an Schüler, 17b) und ihr Textformat
 * in der Ablage: eine Zeile je Paar, `links;rechts;tag` (Tab statt `;`
 * erlaubt, auch gemischt), Alternativen mit `|` bleiben Teil der Zelle.
 * Zerlegt wird wie beim Import (`splitVocabularyCells`).
 */
import {
  quoteVocabularyCell,
  splitVocabularyCells,
} from "../../../src/domain/vocabulary-import";

export type VocabularyRowValue = { a: string; b: string; tag: string };

const EMPTY: VocabularyRowValue = { a: "", b: "", tag: "" };

/** Zerlegt eine Zeile an Tab und Semikolon, die dritte Spalte ist der Tag. */
function splitLine(line: string): VocabularyRowValue {
  const [a = "", b = "", tag = ""] = splitVocabularyCells(line.trim());
  return { a, b, tag };
}

/** Text der Ablage → Zeilen; Zeilen ohne Trennzeichen bleiben außen vor. */
export function rowsFromSource(source: string): VocabularyRowValue[] {
  return source
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((line) => line.includes(";") || line.includes("\t"))
    .map(splitLine);
}

/**
 * Zeilen → Text der Ablage. Auch halb ausgefüllte Zeilen bleiben erhalten
 * (der Leser überspringt sie), leere entfallen. Enthält eine Zelle ein
 * Semikolon oder einen Tab, steht sie in Anführungszeichen.
 */
export function sourceFromRows(rows: readonly VocabularyRowValue[]): string {
  return rows
    .filter((row) => row.a.trim() || row.b.trim() || row.tag.trim())
    .map((row) => {
      return [row.a, row.b, ...(row.tag.trim() ? [row.tag] : [])]
        .map((cell) => quoteVocabularyCell(cell.trim()))
        .join(";");
    })
    .join("\n");
}

/** Vollständige Paare (beide Seiten ausgefüllt). */
export function completePairs(rows: readonly VocabularyRowValue[]): number {
  return rows.filter((row) => row.a.trim() && row.b.trim()).length;
}

/**
 * Setzt eine Zelle. `index` gleich der Zeilenzahl meint die leere Zeile am
 * Ende: Wer dort tippt, legt eine neue Zeile an.
 */
export function setCell(
  rows: readonly VocabularyRowValue[],
  index: number,
  field: keyof VocabularyRowValue,
  value: string,
): VocabularyRowValue[] {
  const next = rows.map((row) => ({ ...row }));
  if (index >= next.length) next.push({ ...EMPTY });
  const row = next[index];
  if (row) row[field] = value;
  return next;
}

/**
 * Fügt eine kopierte Liste (Excel, Word: Tab; sonst Semikolon) ab Zeile
 * `index` ein. Ein Text ohne Zeilenumbruch gibt `null` zurück; dann
 * fügt das Feld ihn selbst ein.
 */
export function pasteRows(
  rows: readonly VocabularyRowValue[],
  index: number,
  text: string,
): VocabularyRowValue[] | null {
  const lines = text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((line) => line.trim());
  if (lines.length < 2 && !/[\t;]/.test(text)) return null;
  const pasted = lines.map(splitLine);
  return [...rows.slice(0, index), ...pasted, ...rows.slice(index + 1)];
}

/** Löscht eine Zeile. */
export function removeRow(
  rows: readonly VocabularyRowValue[],
  index: number,
): VocabularyRowValue[] {
  return rows.filter((_, position) => position !== index);
}

/** Tauscht die beiden Sprachen: linke und rechte Spalte wechseln. */
export function swapRows(
  rows: readonly VocabularyRowValue[],
): VocabularyRowValue[] {
  return rows.map((row) => ({ a: row.b, b: row.a, tag: row.tag }));
}
