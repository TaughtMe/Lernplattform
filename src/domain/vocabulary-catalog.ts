import {
  normalizeVocabularyAnswer,
  parseVocabularyTable,
  type VocabularyLocales,
  type VocabularyPair,
} from "./running-dictation";
import type { TeacherContentPackage } from "./teacher-content-library";
import {
  contentKindOf,
  SUGGESTED_TITLE_LENGTH,
} from "./teacher-content-summary";

/** Eine Vokabel der Ablage samt stabilem Schlüssel für das Ankreuzen. */
export type CatalogPair = {
  /** Stabil innerhalb einer Dialogsitzung: `${packageId}:${zeilenindex}`. */
  key: string;
  pair: VocabularyPair;
};
export type CatalogTagGroup = { tag: string | null; pairs: CatalogPair[] };
export type CatalogPackage = {
  id: string;
  title: string;
  promptLocale: string;
  answerLocale: string;
  updatedAt: string;
  /** Alle Vokabeln des Pakets, unabhängig von der Suche. */
  count: number;
  /** Genau eine Gruppe mit `tag: null`, wenn das Paket keine Tags hat. */
  groups: CatalogTagGroup[];
};

function groupByTag(packageId: string, pairs: VocabularyPair[]) {
  const tagged = new Map<string, CatalogPair[]>();
  const untagged: CatalogPair[] = [];
  pairs.forEach((pair, index) => {
    const entry = { key: `${packageId}:${index}`, pair };
    if (!pair.tag) untagged.push(entry);
    else tagged.set(pair.tag, [...(tagged.get(pair.tag) ?? []), entry]);
  });
  // Map behält die Reihenfolge des ersten Auftretens; „Ohne Tag“ steht hinten.
  const groups: CatalogTagGroup[] = [...tagged].map(([tag, list]) => ({
    tag,
    pairs: list,
  }));
  if (untagged.length) groups.push({ tag: null, pairs: untagged });
  return groups;
}

/**
 * Vokabelpakete der Ablage → Auswahlkatalog: neueste Änderung zuerst, je Paket
 * Gruppen nach Tag. Pakete ohne gültige Paare entfallen.
 */
export function buildVocabularyCatalog(
  packages: readonly TeacherContentPackage[],
): CatalogPackage[] {
  return packages
    .filter((entry) => contentKindOf(entry) === "vocabulary")
    .sort(
      (left, right) =>
        Date.parse(right.updatedAt) - Date.parse(left.updatedAt) ||
        left.id.localeCompare(right.id),
    )
    .flatMap((entry): CatalogPackage[] => {
      const pairs = parseVocabularyTable(entry.source);
      if (!pairs.length) return [];
      return [
        {
          id: entry.id,
          title: entry.title,
          promptLocale: entry.promptLocale,
          answerLocale: entry.answerLocale,
          updatedAt: entry.updatedAt,
          count: pairs.length,
          groups: groupByTag(entry.id, pairs),
        },
      ];
    });
}

function languageBase(locale: string) {
  return locale.split("-")[0]?.toLowerCase() ?? "";
}

/**
 * Gleiches Sprachpaar in gleicher Reihenfolge; verglichen wird der Grundteil
 * der Kennung („en“ passt zu „en-GB“).
 */
export function sameLanguagePair(a: VocabularyLocales, b: VocabularyLocales) {
  return (
    languageBase(a.left) === languageBase(b.left) &&
    languageBase(a.right) === languageBase(b.right)
  );
}

function matches(pair: VocabularyPair, query: string) {
  const haystack = [
    pair.left.primary,
    ...pair.left.alternatives,
    pair.right.primary,
    ...pair.right.alternatives,
    pair.tag ?? "",
  ];
  return haystack.some((text) => text.toLocaleLowerCase("de").includes(query));
}

/**
 * Sprachfilter und Suche. `locales: null` zeigt jede Sprache. Gruppen und
 * Pakete ohne Treffer entfallen; `hiddenByLanguage` zählt die Pakete, die nur
 * wegen der Sprache fehlen.
 */
export function filterVocabularyCatalog(
  catalog: readonly CatalogPackage[],
  filter: { query: string; locales: VocabularyLocales | null },
): { visible: CatalogPackage[]; hiddenByLanguage: number } {
  const query = filter.query.trim().toLocaleLowerCase("de");
  let hiddenByLanguage = 0;
  const visible: CatalogPackage[] = [];
  for (const entry of catalog) {
    if (
      filter.locales &&
      !sameLanguagePair(filter.locales, {
        left: entry.promptLocale,
        right: entry.answerLocale,
      })
    ) {
      hiddenByLanguage += 1;
      continue;
    }
    if (!query) {
      visible.push(entry);
      continue;
    }
    const groups = entry.groups
      .map((group) => ({
        ...group,
        pairs: group.pairs.filter(({ pair }) => matches(pair, query)),
      }))
      .filter((group) => group.pairs.length);
    if (groups.length) visible.push({ ...entry, groups });
  }
  return { visible, hiddenByLanguage };
}

/** Schlüssel für Dubletten: Hauptform links und rechts, normalisiert. */
function pairKey(pair: VocabularyPair) {
  const normalize = (value: string) =>
    normalizeVocabularyAnswer(value, false, "de");
  return `${normalize(pair.left.primary)}\u0000${normalize(pair.right.primary)}`;
}

/**
 * Angehakte Vokabeln in Paketreihenfolge. Doppelte Paare über Pakete hinweg
 * erscheinen nur einmal; die erste Fundstelle gewinnt, ihr Tag bleibt.
 */
export function selectedPairs(
  catalog: readonly CatalogPackage[],
  keys: ReadonlySet<string>,
): VocabularyPair[] {
  const seen = new Set<string>();
  const result: VocabularyPair[] = [];
  for (const entry of catalog) {
    for (const group of entry.groups) {
      for (const { key, pair } of group.pairs) {
        if (!keys.has(key)) continue;
        const id = pairKey(pair);
        if (seen.has(id)) continue;
        seen.add(id);
        result.push(pair);
      }
    }
  }
  return result;
}

/** Titel der Pakete, aus denen etwas angehakt ist (Reihenfolge des Katalogs). */
export function selectedSourceTitles(
  catalog: readonly CatalogPackage[],
  keys: ReadonlySet<string>,
): string[] {
  return catalog
    .filter((entry) =>
      entry.groups.some((group) =>
        group.pairs.some(({ key }) => keys.has(key)),
      ),
    )
    .map((entry) => entry.title);
}

const isFilled = (pair: VocabularyPair) =>
  Boolean(pair.left.primary.trim() && pair.right.primary.trim());

/** Irgendein Text in der Zeile, auch nur auf einer Seite oder als Alternative. */
export const hasContent = (pair: VocabularyPair) =>
  [pair.left, pair.right].some(
    (side) =>
      side.primary.trim() || side.alternatives.some((text) => text.trim()),
  );

/**
 * Auswahl ins Vokabelheft: ein Heft ohne jeden Inhalt wird ersetzt, sonst wird
 * angehängt und alles übersprungen, was schon vollständig im Heft steht.
 * Halb ausgefüllte Zeilen bleiben erhalten; nur ganz leere fallen weg.
 */
export function mergeIntoHeft(
  current: readonly VocabularyPair[],
  picked: readonly VocabularyPair[],
): {
  pairs: VocabularyPair[];
  added: number;
  skipped: number;
  replaced: boolean;
} {
  const kept = current.filter(hasContent);
  const replaced = kept.length === 0;
  const known = new Set(kept.filter(isFilled).map(pairKey));
  const fresh: VocabularyPair[] = [];
  let skipped = 0;
  for (const pair of picked) {
    const id = pairKey(pair);
    if (known.has(id)) {
      skipped += 1;
      continue;
    }
    known.add(id);
    fresh.push(pair);
  }
  return {
    pairs: replaced ? fresh : [...kept, ...fresh],
    added: fresh.length,
    skipped,
    replaced,
  };
}

/** „Abfrage 15.10. · Unit 3“ bzw. „… · Unit 3 + 2 weitere“. */
export function suggestQuizTitle(
  sourceTitles: readonly string[],
  now: Date,
): string {
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const head = `Abfrage ${day}.${month}.`;
  const first = sourceTitles[0]?.trim();
  if (!first) return head;
  const short =
    first.length > SUGGESTED_TITLE_LENGTH
      ? `${first.slice(0, SUGGESTED_TITLE_LENGTH - 1).trimEnd()}…`
      : first;
  const more = sourceTitles.length - 1;
  return more > 0
    ? `${head} · ${short} + ${more} weitere`
    : `${head} · ${short}`;
}

/** Meldung nach dem Übernehmen: „10 Vokabeln übernommen, 2 standen schon im Heft.“ */
export function describeMerge(result: {
  added: number;
  skipped: number;
}): string {
  const { added, skipped } = result;
  if (added === 0)
    return skipped === 1
      ? "Diese Vokabel stand schon im Heft."
      : `Alle ${skipped} Vokabeln standen schon im Heft.`;
  const taken = `${added} ${added === 1 ? "Vokabel" : "Vokabeln"} übernommen`;
  if (skipped === 0) return `${taken}.`;
  return `${taken}, ${skipped} ${skipped === 1 ? "stand" : "standen"} schon im Heft.`;
}
