// Target selection in Battle mode: who may a student attack?

export interface AttackCandidate {
  name: string;
  index: number;
}

/**
 * Up to 3 attack targets: teammates who are further along or EQUALLY far
 * (closest first). Someone leading (or tied for the lead) sees the 3 right
 * behind them — including tied leaders, so two students at the same word can
 * attack each other instead of being unattackable.
 */
export function pickAttackCandidates(
  roster: Record<string, number>,
  studentName: string | undefined,
  currentWordIndex: number,
): AttackCandidate[] {
  const others = Object.entries(roster)
    .filter(([n]) => n !== studentName)
    .map(([name, index]) => ({ name, index }));
  if (others.length === 0) return [];

  const maxIndex = Math.max(currentWordIndex, ...others.map((o) => o.index));
  if (currentWordIndex >= maxIndex) {
    return others
      .filter((o) => o.index <= currentWordIndex)
      .sort((a, b) => b.index - a.index)
      .slice(0, 3);
  }
  return others
    .filter((o) => o.index >= currentWordIndex)
    .sort((a, b) => a.index - b.index)
    .slice(0, 3);
}
