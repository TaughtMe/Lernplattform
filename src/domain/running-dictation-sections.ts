export type NewlineMode = "line" | "paragraph";

export type CustomDelimiter = { id: string; value: string };
export type TextSplitConfig = {
  punctuationEnabled: boolean;
  punctuation: string[];
  customDelimiters: CustomDelimiter[];
  newlineEnabled: boolean;
  newlineMode: NewlineMode;
  groupConsecutiveSeparators: boolean;
};
export type ManualRange = {
  id: string;
  type: "section" | "split";
  start: number;
  end: number;
};
export type TextSection = {
  id: string;
  start: number;
  end: number;
  text: string;
  source: "auto" | "manual";
};

export const DEFAULT_TEXT_SPLIT_CONFIG: TextSplitConfig = {
  punctuationEnabled: true,
  punctuation: [".", "!", "?"],
  customDelimiters: [],
  newlineEnabled: true,
  newlineMode: "line",
  groupConsecutiveSeparators: true,
};

const closingCharacters = new Set([
  '"',
  "'",
  "”",
  "’",
  "“",
  "»",
  "›",
  ")",
  "]",
  "}",
]);
const isDigit = (value: string | undefined) =>
  value !== undefined && value >= "0" && value <= "9";

type Boundary = { cutStart: number; cutEnd: number };

function automaticBoundaries(text: string, config: TextSplitConfig) {
  const punctuation = config.punctuationEnabled
    ? new Set(config.punctuation.filter(Boolean))
    : new Set<string>();
  const custom = config.punctuationEnabled
    ? config.customDelimiters
        .map(({ value }) => value)
        .filter(Boolean)
        .sort((left, right) => right.length - left.length)
    : [];
  const boundaries: Boundary[] = [];

  for (let index = 0; index < text.length;) {
    const delimiter = custom.find((value) => text.startsWith(value, index));
    if (delimiter) {
      boundaries.push({ cutStart: index, cutEnd: index + delimiter.length });
      index += delimiter.length;
      continue;
    }
    if (text[index] === "\n" && config.newlineEnabled) {
      if (config.newlineMode === "line") {
        boundaries.push({ cutStart: index, cutEnd: index + 1 });
        index += 1;
        continue;
      }
      let end = index;
      let lines = 0;
      while (end < text.length && /[\n\t ]/.test(text[end] ?? "")) {
        if (text[end] === "\n") lines += 1;
        end += 1;
      }
      if (lines >= 2) {
        boundaries.push({ cutStart: index, cutEnd: end });
        index = end;
        continue;
      }
    }
    const character = text[index] ?? "";
    if (punctuation.has(character)) {
      if (
        (character === "." || character === ",") &&
        isDigit(text[index - 1]) &&
        isDigit(text[index + 1])
      ) {
        index += 1;
        continue;
      }
      let end = index + 1;
      while (end < text.length && punctuation.has(text[end] ?? "")) end += 1;
      while (end < text.length && closingCharacters.has(text[end] ?? ""))
        end += 1;
      boundaries.push({ cutStart: end, cutEnd: end });
      index = end;
      continue;
    }
    index += 1;
  }
  return boundaries;
}

export function buildRunningDictationSections(
  rawText: string,
  config: TextSplitConfig,
  manualRanges: ManualRange[] = [],
): TextSection[] {
  const text = rawText.replace(/\r\n?/g, "\n");
  if (!text.trim()) return [];
  const manualSections = manualRanges
    .filter((range) => range.type === "section" && range.end > range.start)
    .sort((left, right) => left.start - right.start)
    .filter(
      (range, index, all) => index === 0 || range.start >= all[index - 1]!.end,
    );
  const automatic = automaticBoundaries(text, config).filter(
    (boundary) =>
      !manualSections.some(
        (range) =>
          boundary.cutStart > range.start && boundary.cutStart < range.end,
      ),
  );
  const manual: Boundary[] = manualSections.flatMap((range) => [
    { cutStart: range.start, cutEnd: range.start },
    { cutStart: range.end, cutEnd: range.end },
  ]);
  for (const range of manualRanges.filter((entry) => entry.type === "split")) {
    if (range.start > 0 && range.start < text.length) {
      manual.push({ cutStart: range.start, cutEnd: range.start });
    }
  }
  let boundaries = [...automatic, ...manual].sort(
    (left, right) =>
      left.cutStart - right.cutStart || left.cutEnd - right.cutEnd,
  );
  if (config.groupConsecutiveSeparators) {
    const merged: Boundary[] = [];
    for (const boundary of boundaries) {
      const previous = merged.at(-1);
      if (
        previous &&
        text.slice(previous.cutEnd, boundary.cutStart).trim() === ""
      ) {
        previous.cutStart = Math.min(previous.cutStart, boundary.cutStart);
        previous.cutEnd = Math.max(previous.cutEnd, boundary.cutEnd);
      } else {
        merged.push({ ...boundary });
      }
    }
    boundaries = merged;
  }
  const sections: TextSection[] = [];
  const add = (startIndex: number, endIndex: number) => {
    const raw = text.slice(startIndex, endIndex);
    const value = raw.trim();
    if (!value) return;
    const start = startIndex + raw.length - raw.trimStart().length;
    const end = start + value.length;
    sections.push({
      id: `s-${start}-${end}`,
      start,
      end,
      text: value,
      source: manualSections.some(
        (range) => start >= range.start && end <= range.end,
      )
        ? "manual"
        : "auto",
    });
  };
  let previousEnd = 0;
  for (const boundary of boundaries) {
    add(previousEnd, boundary.cutStart);
    previousEnd = Math.max(previousEnd, boundary.cutEnd);
  }
  add(previousEnd, text.length);
  return sections;
}

export function applyRunningDictationSectionEdits(
  sections: TextSection[],
  excludedIds: string[] = [],
  order: string[] = [],
) {
  const excluded = new Set(excludedIds);
  const rank = new Map(order.map((id, index) => [id, index]));
  return sections
    .filter((section) => !excluded.has(section.id))
    .map((section, index) => ({ section, index }))
    .sort((left, right) => {
      const leftRank = rank.get(left.section.id) ?? Number.POSITIVE_INFINITY;
      const rightRank = rank.get(right.section.id) ?? Number.POSITIVE_INFINITY;
      return leftRank - rightRank || left.index - right.index;
    })
    .map(({ section }) => section);
}

export function moveRunningDictationSection<T>(
  items: T[],
  from: number,
  to: number,
) {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= items.length ||
    to >= items.length
  ) {
    return items;
  }
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}
