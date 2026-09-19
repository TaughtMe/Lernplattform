export interface TypingKeystroke {
  expected: string;
  typed: string;
  correct: boolean;
  timestamp: number;
}

export interface TypingStats {
  totalChars: number;
  correctChars: number;
  errorCount: number;
  accuracy: number;
  elapsedMs: number;
  cpm: number;
  wpm: number;
  corrections: number;
  problemChars: Array<{ char: string; errors: number }>;
}

export function computeTypingStats(
  keystrokes: readonly TypingKeystroke[],
  startedAt: number,
  endedAt: number,
  corrections: number,
): TypingStats {
  const totalChars = keystrokes.length;
  const correctChars = keystrokes.filter(
    (keystroke) => keystroke.correct,
  ).length;
  const elapsedMs = Math.max(1, endedAt - startedAt);
  const cpm = Math.round(correctChars / (elapsedMs / 60_000));
  const errors = new Map<string, number>();
  for (const keystroke of keystrokes) {
    if (!keystroke.correct) {
      errors.set(keystroke.expected, (errors.get(keystroke.expected) ?? 0) + 1);
    }
  }

  return {
    totalChars,
    correctChars,
    errorCount: totalChars - correctChars,
    accuracy:
      totalChars === 0
        ? 100
        : Math.round((correctChars / totalChars) * 1000) / 10,
    elapsedMs,
    cpm,
    wpm: Math.round(cpm / 5),
    corrections,
    problemChars: [...errors.entries()]
      .map(([char, count]) => ({ char, errors: count }))
      .sort((left, right) => right.errors - left.errors)
      .slice(0, 5),
  };
}
