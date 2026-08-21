export interface Keystroke {
  expected: string;
  typed: string;
  correct: boolean;
  timestamp: number;
}

export interface TypingStats {
  totalChars: number;
  correctChars: number;
  errorCount: number;
  /** 0-100, eine Nachkommastelle. */
  accuracy: number;
  elapsedMs: number;
  /** Korrekte Zeichen pro Minute. */
  cpm: number;
  /** cpm / 5 — die übliche Umrechnung, ein "Wort" entspricht fünf Zeichen. */
  wpm: number;
  corrections: number;
  /** Bis zu 5 Zeichen mit den meisten Fehlern, häufigstes zuerst. */
  problemChars: Array<{ char: string; errors: number }>;
}

/** Genauigkeit hat Vorrang vor Geschwindigkeit ("07 - Adaptive Merkstrecke") — cpm/wpm sind daher informativ, nie die einzige Kennzahl. */
export function computeStats(keystrokes: Keystroke[], startedAt: number, endedAt: number, corrections: number): TypingStats {
  const totalChars = keystrokes.length;
  const correctChars = keystrokes.filter((k) => k.correct).length;
  const errorCount = totalChars - correctChars;
  const accuracy = totalChars === 0 ? 100 : Math.round((correctChars / totalChars) * 1000) / 10;
  const elapsedMs = Math.max(1, endedAt - startedAt);
  const minutes = elapsedMs / 60000;
  const cpm = minutes > 0 ? Math.round(correctChars / minutes) : 0;
  const wpm = Math.round(cpm / 5);

  const errorTally = new Map<string, number>();
  for (const k of keystrokes) {
    if (!k.correct) errorTally.set(k.expected, (errorTally.get(k.expected) ?? 0) + 1);
  }
  const problemChars = Array.from(errorTally.entries())
    .map(([char, errors]) => ({ char, errors }))
    .sort((a, b) => b.errors - a.errors)
    .slice(0, 5);

  return { totalChars, correctChars, errorCount, accuracy, elapsedMs, cpm, wpm, corrections, problemChars };
}
