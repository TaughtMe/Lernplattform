/**
 * Namensliste einfügen (L25-11, Audit K8): Aus eingefügtem Text werden Namen
 * oder Aliasse für eine Klasse. Rein und ohne Speicherzugriff.
 *
 * - Eine Zeile oder ein Eintrag zwischen Semikolons ist ein Name. Kommas
 *   trennen nicht, damit „Müller, Anna“ ein Name bleibt.
 * - Spalten aus einer Tabelle (Tabulator) werden mit Leerzeichen verbunden,
 *   z. B. „Anna⇥Müller“ → „Anna Müller“.
 * - Leerraum wird zusammengefasst, Namen werden auf `NAME_MAX_LENGTH` gekürzt.
 * - Doppelte Namen (auch schon in der Klasse) fallen weg, ohne Rücksicht auf
 *   Groß- und Kleinschreibung.
 */

/** Wie im Eingabefeld „Name oder Alias“. */
export const NAME_MAX_LENGTH = 80;
/** So viele Namen nimmt ein Einfügen höchstens auf (eine große Klasse). */
export const NAME_LIST_MAX = 40;

export type NameListResult = {
  /** Neue Namen in der Reihenfolge der Liste. */
  names: string[];
  /** Schon in der Klasse oder doppelt in der Liste. */
  duplicates: number;
  /** Über `NAME_LIST_MAX` hinaus, nicht übernommen. */
  overflow: number;
  /** Die Namen über der Grenze; sie bleiben für das nächste Einfügen stehen. */
  rest: string[];
};

function compareKey(name: string) {
  return name.normalize("NFC").toLocaleLowerCase("de");
}

export function parseNameList(
  text: string,
  existing: readonly string[] = [],
): NameListResult {
  const seen = new Set(existing.map(compareKey));
  const names: string[] = [];
  const rest: string[] = [];
  let duplicates = 0;
  for (const raw of text.split(/[\r\n;]+/)) {
    const name = raw
      .split("\t")
      .map((cell) => cell.trim())
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, NAME_MAX_LENGTH)
      .trim();
    if (!name) continue;
    const key = compareKey(name);
    if (seen.has(key)) {
      duplicates += 1;
      continue;
    }
    seen.add(key);
    if (names.length >= NAME_LIST_MAX) {
      rest.push(name);
      continue;
    }
    names.push(name);
  }
  return { names, duplicates, overflow: rest.length, rest };
}
