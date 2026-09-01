export type RunningDictationKind = "text" | "vocabulary";
export type RunningDictationMode = "running-dictation" | "practice";
export type VocabularyDirection = "left-to-right" | "right-to-left" | "mixed";

export type RunningDictationItem = {
  id: string;
  kind: RunningDictationKind;
  target: string;
  prompt?: string;
  acceptedAnswers?: string[];
  promptLocale?: string;
  answerLocale?: string;
  caseSensitive?: boolean;
};

export type VocabularyPair = {
  id: string;
  left: { primary: string; alternatives: string[] };
  right: { primary: string; alternatives: string[] };
};

// Ported from TaughtMe/Laufdiktat (6c2ade4): stable FNV-1a + fmix ordering.
function hashString(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function mix(value: number) {
  value ^= value >>> 16;
  value = Math.imul(value, 0x85ebca6b);
  value ^= value >>> 13;
  value = Math.imul(value, 0xc2b2ae35);
  value ^= value >>> 16;
  return value >>> 0;
}

export function deterministicOrder(length: number, seed: string) {
  const seedHash = hashString(seed);
  return Array.from({ length }, (_, index) => index).sort(
    (left, right) => mix(seedHash ^ mix(left)) - mix(seedHash ^ mix(right)),
  );
}

/** Port of Laufdiktat's deterministic progressive hint. */
export function buildRunningDictationHint(target: string, fraction: number) {
  const safeFraction = Math.min(1, Math.max(0, fraction));
  if (target.trim().includes(" ")) {
    const tokens = target.split(/(\s+)/);
    const positions = tokens
      .map((token, index) => (token.trim() ? index : -1))
      .filter((index) => index >= 0);
    const count = Math.ceil(positions.length * safeFraction);
    const order = deterministicOrder(positions.length, target);
    const revealed = new Set(
      order.slice(0, count).map((index) => positions[index]),
    );
    return tokens
      .map((token, index) =>
        token.trim() === "" || revealed.has(index)
          ? token
          : token.replace(/\S/g, "_"),
      )
      .join("");
  }

  const characters = [...target];
  const positions = characters
    .map((character, index) => ({ character, index }))
    .filter(({ character }) => character.trim())
    .map(({ index }) => index);
  const count = Math.ceil(positions.length * safeFraction);
  const order = deterministicOrder(positions.length, target);
  const revealed = new Set(
    order.slice(0, count).map((index) => positions[index]),
  );
  return characters
    .map((character, index) =>
      !character.trim() || revealed.has(index) ? character : "_",
    )
    .join(" ");
}

function normalizeVocabularyAnswer(
  value: string,
  caseSensitive: boolean,
  locale?: string,
) {
  const normalized = value.trim().replace(/\s+/g, " ").normalize("NFC");
  return caseSensitive
    ? normalized
    : normalized.toLocaleLowerCase(locale ?? "de");
}

/** Port of Laufdiktat's type-aware answer check. */
export function checkRunningDictationAnswer(
  item: RunningDictationItem,
  input: string,
  caseSensitive = false,
) {
  if (item.kind === "vocabulary") {
    if (!input.trim()) return false;
    const actual = normalizeVocabularyAnswer(
      input,
      caseSensitive,
      item.answerLocale,
    );
    return [item.target, ...(item.acceptedAnswers ?? [])].some(
      (answer) =>
        normalizeVocabularyAnswer(answer, caseSensitive, item.answerLocale) ===
        actual,
    );
  }
  return input.trim() === item.target;
}

export function parseRunningDictationText(input: string) {
  const normalized = input.replace(/\r\n?/g, "\n").trim();
  if (!normalized) return [];
  const lines = normalized
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const pieces = lines.flatMap(
    (line) => line.match(/[^.!?]+[.!?]+(?:[”’“»›)\]}]+)?|[^.!?]+$/g) ?? [line],
  );
  return pieces
    .map((piece) => piece.trim())
    .filter(Boolean)
    .map((target, index): RunningDictationItem => ({
      id: `text-${index}-${hashString(target)}`,
      kind: "text",
      target,
    }));
}

export function parseVocabularyTable(input: string): VocabularyPair[] {
  return input
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line, index) => {
      const cells = line.includes("\t") ? line.split("\t") : line.split(";");
      if (cells.length < 2) return [];
      const side = (value: string) => {
        const [primary = "", ...alternatives] = value
          .split("|")
          .map((part) => part.trim())
          .filter(Boolean);
        return { primary, alternatives };
      };
      const left = side(cells[0] ?? "");
      const right = side(cells.slice(1).join(";"));
      if (!left.primary || !right.primary) return [];
      return [{ id: `vocabulary-${index}-${hashString(line)}`, left, right }];
    });
}

export function buildVocabularyItems(
  pairs: VocabularyPair[],
  direction: VocabularyDirection,
  caseSensitive = false,
) {
  return pairs.flatMap((pair, index): RunningDictationItem[] => {
    const askLeft =
      direction === "left-to-right" ||
      (direction === "mixed" && index % 2 === 0);
    const prompt = askLeft ? pair.left : pair.right;
    const answer = askLeft ? pair.right : pair.left;
    return [
      {
        id: pair.id,
        kind: "vocabulary",
        prompt: prompt.primary,
        target: answer.primary,
        acceptedAnswers: answer.alternatives,
        promptLocale: askLeft ? "de-DE" : "en-GB",
        answerLocale: askLeft ? "en-GB" : "de-DE",
        caseSensitive,
      },
    ];
  });
}

/** Port of Laufdiktat's five-star error-rate calculation. */
export function computeRunningDictationStars(
  errors: number,
  itemCount: number,
) {
  if (itemCount <= 0 || errors <= 0) return 5;
  const rate = errors / itemCount;
  if (rate <= 0.15) return 4;
  if (rate <= 0.35) return 3;
  if (rate <= 0.6) return 2;
  return 1;
}
