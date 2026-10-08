/** Hilfen für Komponententests: abgeschlossene Textbox-Einheiten ohne Spiel. */
import { TEXTBOX_TEXTS } from "../../src/domain/textbox-library";
import type {
  TextboxRoundResult,
  TextboxSession,
} from "../../src/domain/textbox-session";

function round(
  number: 1 | 2 | 3 | 4,
  percent: number,
  errors: number,
  words: TextboxRoundResult["words"],
): TextboxRoundResult {
  return {
    round: number,
    blanked: [],
    words,
    score: {
      percent,
      correct: 10 - errors,
      total: 10,
      extra: 0,
      byKind: {
        richtig: 10 - errors,
        falsch: errors,
        "gross-klein": 0,
        fehlt: 0,
        zusaetzlich: 0,
      },
      punctuationHints: 0,
    },
    memorizeMs: 0,
    writingMs: 0,
  };
}

export function completedSession(
  id: string,
  textIndex: number,
  finalPercent: number,
  day: number,
  errors = 0,
): TextboxSession {
  const text = TEXTBOX_TEXTS[textIndex]!;
  const at = `2026-10-${String(day).padStart(2, "0")}T08:00:00.000Z`;
  return {
    id,
    textId: text.id,
    difficulty: text.difficulty,
    status: "abgeschlossen",
    seed: id,
    startedAt: at,
    completedAt: at,
    updatedAt: at,
    rounds: [
      round(1, 100, 0, []),
      round(2, 100, 0, []),
      round(3, 90, 1, []),
      round(4, finalPercent, errors, []),
    ],
    finalPercent,
  };
}
