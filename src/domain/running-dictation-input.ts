export const STRICT_RUNNING_DICTATION_INPUT_ATTRIBUTES = {
  autoComplete: "off",
  autoCorrect: "off",
  autoCapitalize: "none",
  spellCheck: false,
} as const;

const blockedInputTypes = new Set([
  "insertReplacementText",
  "insertFromPaste",
  "insertFromDrop",
  "insertFromYank",
]);

export const isBlockedRunningDictationInput = (inputType?: string | null) =>
  Boolean(inputType && blockedInputTypes.has(inputType));

export const isSuspiciousRunningDictationInsert = (
  before: string,
  after: string,
) => after.length - before.length > 1;

export const sanitizeStrictMathAnswer = (value: string) =>
  value.replace(/[^0-9,.-]/g, "");

export type BattleCandidate = { name: string; index: number };

export function pickRunningDictationBattleCandidates(
  roster: Record<string, number>,
  studentName: string,
  currentIndex: number,
): BattleCandidate[] {
  const others = Object.entries(roster)
    .filter(([name]) => name !== studentName)
    .map(([name, index]) => ({ name, index }));
  if (!others.length) return [];
  const maximum = Math.max(currentIndex, ...others.map(({ index }) => index));
  return (
    currentIndex >= maximum
      ? others
          .filter(({ index }) => index <= currentIndex)
          .sort((left, right) => right.index - left.index)
      : others
          .filter(({ index }) => index >= currentIndex)
          .sort((left, right) => left.index - right.index)
  ).slice(0, 3);
}
