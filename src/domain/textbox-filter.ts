import type { TextboxStand } from "./textbox-progress";
import {
  TEXTBOX_DIFFICULTY_LABELS,
  TEXTBOX_PHENOMENA,
  TEXTBOX_PHENOMENON_LABELS,
  type TextboxDifficulty,
  type TextboxPhenomenon,
  type TextboxText,
} from "./textbox-text";

export type TextboxFilter = {
  query: string;
  /** Genau eine Stufe oder keine. */
  difficulty: TextboxDifficulty | undefined;
  stands: readonly TextboxStand[];
  phenomena: readonly TextboxPhenomenon[];
};

export const EMPTY_TEXTBOX_FILTER: TextboxFilter = {
  query: "",
  difficulty: undefined,
  stands: [],
  phenomena: [],
};

export const TEXTBOX_STAND_LABELS: Record<TextboxStand, string> = {
  neu: "Neu",
  begonnen: "Begonnen",
  gemeistert: "Gemeistert",
};

function fold(value: string) {
  return value.normalize("NFC").trim().toLocaleLowerCase("de");
}

/**
 * Innerhalb einer Gruppe gilt ODER, zwischen den Gruppen UND. Die Suche trifft
 * den Titel oder die Bezeichnung eines Schwerpunkts.
 */
export function matchesTextboxFilter(
  text: TextboxText,
  stand: TextboxStand,
  filter: TextboxFilter,
): boolean {
  const query = fold(filter.query);
  if (
    query !== "" &&
    !fold(text.title).includes(query) &&
    !text.phenomena.some((id) =>
      fold(TEXTBOX_PHENOMENON_LABELS[id]).includes(query),
    )
  ) {
    return false;
  }
  if (
    filter.difficulty !== undefined &&
    text.difficulty !== filter.difficulty
  ) {
    return false;
  }
  if (filter.stands.length > 0 && !filter.stands.includes(stand)) return false;
  if (
    filter.phenomena.length > 0 &&
    !text.phenomena.some((id) => filter.phenomena.includes(id))
  ) {
    return false;
  }
  return true;
}

export type TextboxFilterChip = {
  key: "stufe" | "stand" | "schwerpunkt";
  value: string;
  label: string;
};

/** Aktive Filter als Chips, in der Reihenfolge Stufe, Stand, Schwerpunkte. */
export function activeFilterChips(filter: TextboxFilter): TextboxFilterChip[] {
  const chips: TextboxFilterChip[] = [];
  if (filter.difficulty !== undefined) {
    chips.push({
      key: "stufe",
      value: filter.difficulty,
      label: TEXTBOX_DIFFICULTY_LABELS[filter.difficulty],
    });
  }
  for (const stand of filter.stands) {
    chips.push({
      key: "stand",
      value: stand,
      label: TEXTBOX_STAND_LABELS[stand],
    });
  }
  for (const id of filter.phenomena) {
    chips.push({
      key: "schwerpunkt",
      value: id,
      label: TEXTBOX_PHENOMENON_LABELS[id],
    });
  }
  return chips;
}

export function removeFilterChip(
  filter: TextboxFilter,
  key: TextboxFilterChip["key"],
  value: string,
): TextboxFilter {
  if (key === "stufe") return { ...filter, difficulty: undefined };
  if (key === "stand") {
    return { ...filter, stands: filter.stands.filter((s) => s !== value) };
  }
  return {
    ...filter,
    phenomena: filter.phenomena.filter((id) => id !== value),
  };
}

/** Schwerpunkte, die mindestens ein Text hat, in der Reihenfolge von `TEXTBOX_PHENOMENA`. */
export function phenomenaInLibrary(
  texts: readonly TextboxText[],
): { id: TextboxPhenomenon; label: string; count: number }[] {
  return TEXTBOX_PHENOMENA.map((id) => ({
    id,
    label: TEXTBOX_PHENOMENON_LABELS[id],
    count: texts.filter((text) => text.phenomena.includes(id)).length,
  })).filter((entry) => entry.count > 0);
}
