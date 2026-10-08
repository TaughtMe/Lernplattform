import { tokenizeText } from "./text-compare";
import type { TextboxSession } from "./textbox-session";
import {
  PHENOMENON_TO_COLLECTION,
  TEXTBOX_DIFFICULTIES,
  type TextboxDifficulty,
  type TextboxPhenomenon,
  type TextboxText,
} from "./textbox-text";

export type TextboxTextSummary = {
  textId: string;
  sessions: number;
  bestPercent?: number;
  lastPercent?: number;
  lastPracticedAt?: string;
  history: {
    trainingId: string;
    completedAt: string;
    percent: number;
    rounds: number[];
  }[];
};

type CompletedSession = TextboxSession & {
  completedAt: string;
  finalPercent: number;
};

/** Nur abgeschlossene Einheiten zählen für Bestwert, Verlauf und Statistik. */
function completedOnly(sessions: TextboxSession[]): CompletedSession[] {
  return sessions.filter(
    (session): session is CompletedSession =>
      session.status === "abgeschlossen" &&
      session.completedAt !== undefined &&
      session.finalPercent !== undefined,
  );
}

function byCompletion(left: CompletedSession, right: CompletedSession) {
  return (
    left.completedAt.localeCompare(right.completedAt) ||
    left.id.localeCompare(right.id)
  );
}

/** Bestwert, letzter Wert und Verlauf werden immer aus den Einheiten abgeleitet. */
export function summarizeTextboxProgress(
  sessions: TextboxSession[],
): Map<string, TextboxTextSummary> {
  const summaries = new Map<string, TextboxTextSummary>();
  for (const session of completedOnly(sessions).sort(byCompletion)) {
    const summary = summaries.get(session.textId) ?? {
      textId: session.textId,
      sessions: 0,
      history: [],
    };
    summary.sessions += 1;
    summary.bestPercent = Math.max(
      summary.bestPercent ?? 0,
      session.finalPercent,
    );
    summary.lastPercent = session.finalPercent;
    summary.lastPracticedAt = session.completedAt;
    summary.history.push({
      trainingId: session.id,
      completedAt: session.completedAt,
      percent: session.finalPercent,
      rounds: session.rounds.map((round) => round.score.percent),
    });
    summaries.set(session.textId, summary);
  }
  return summaries;
}

/**
 * Gesamtübersicht. Verteilungen zählen abgeschlossene Einheiten; ein Text mit
 * mehreren Schwerpunkten zählt für jeden. Unbekannte Texte werden übersprungen.
 */
export function summarizeTextboxOverall(
  sessions: TextboxSession[],
  texts: TextboxText[],
): {
  completedTexts: number;
  sessions: number;
  byDifficulty: Record<TextboxDifficulty, number>;
  byPhenomenon: Partial<Record<TextboxPhenomenon, number>>;
} {
  const known = new Map(texts.map((text) => [text.id, text]));
  const done = completedOnly(sessions).filter((s) => known.has(s.textId));
  const byDifficulty = Object.fromEntries(
    TEXTBOX_DIFFICULTIES.map((difficulty) => [difficulty, 0]),
  ) as Record<TextboxDifficulty, number>;
  const byPhenomenon: Partial<Record<TextboxPhenomenon, number>> = {};
  for (const session of done) {
    const text = known.get(session.textId)!;
    byDifficulty[text.difficulty] += 1;
    for (const phenomenon of text.phenomena) {
      byPhenomenon[phenomenon] = (byPhenomenon[phenomenon] ?? 0) + 1;
    }
  }
  return {
    completedTexts: new Set(done.map((session) => session.textId)).size,
    sessions: done.length,
    byDifficulty,
    byPhenomenon,
  };
}

const DIFFICULTY_ORDER: Record<TextboxDifficulty, number> = {
  leicht: 0,
  mittel: 1,
  schwer: 2,
};

function key(word: string) {
  return word.normalize("NFC").toLocaleLowerCase("de");
}

/**
 * Textvorschläge zu geübten Wörtern. Vergleich ohne Groß-/Kleinschreibung.
 * Sortiert nach Treffern; bei Gleichstand gewinnt der Text mit passendem
 * Schwerpunkt (über die Sammlung), danach die niedrigere Schwierigkeit.
 */
export function rankTextsForWords(
  words: string[],
  texts: TextboxText[],
  collectionId?: string,
): { text: TextboxText; matches: string[] }[] {
  const wanted = new Map<string, string>();
  for (const word of words) {
    const normalized = key(word.trim());
    if (normalized && !wanted.has(normalized))
      wanted.set(normalized, word.trim());
  }
  const ranked = texts
    .filter((text) => text.usage.includes("wortspeicher"))
    .map((text) => {
      const inText = new Set(
        tokenizeText(text.text)
          .filter((token) => token.kind === "word")
          .map((token) => key(token.text)),
      );
      const matches = [...wanted]
        .filter(([normalized]) => inText.has(normalized))
        .map(([, original]) => original);
      const focus =
        collectionId !== undefined &&
        text.phenomena.some(
          (phenomenon) => PHENOMENON_TO_COLLECTION[phenomenon] === collectionId,
        );
      return { text, matches, focus };
    })
    .filter((entry) => entry.matches.length > 0);
  ranked.sort(
    (left, right) =>
      right.matches.length - left.matches.length ||
      Number(right.focus) - Number(left.focus) ||
      DIFFICULTY_ORDER[left.text.difficulty] -
        DIFFICULTY_ORDER[right.text.difficulty] ||
      left.text.id.localeCompare(right.text.id),
  );
  return ranked.map(({ text, matches }) => ({ text, matches }));
}

/**
 * Fehler und Wortanzahl je Schwerpunkt aus Durchgang 4 abgeschlossener
 * Einheiten. Fehler sind falsch, Groß-/Kleinfehler und fehlende Wörter.
 */
export function phenomenonErrorStats(
  sessions: TextboxSession[],
  texts: TextboxText[],
): { phenomenon: TextboxPhenomenon; errors: number; words: number }[] {
  const known = new Map(texts.map((text) => [text.id, text]));
  const stats = new Map<TextboxPhenomenon, { errors: number; words: number }>();
  for (const session of completedOnly(sessions)) {
    const text = known.get(session.textId);
    const final = session.rounds.find((round) => round.round === 4);
    if (!text || !final) continue;
    const { byKind, total } = final.score;
    const errors = byKind.falsch + byKind["gross-klein"] + byKind.fehlt;
    for (const phenomenon of text.phenomena) {
      const entry = stats.get(phenomenon) ?? { errors: 0, words: 0 };
      entry.errors += errors;
      entry.words += total;
      stats.set(phenomenon, entry);
    }
  }
  return [...stats]
    .map(([phenomenon, entry]) => ({ phenomenon, ...entry }))
    .sort(
      (left, right) =>
        right.errors - left.errors ||
        left.phenomenon.localeCompare(right.phenomenon),
    );
}

/** Fragen aus dem Konzept (§8.3); sie erscheinen erst ab zwei Einheiten. */
export const REFLECTION_QUESTIONS = [
  "Bei welcher Übung war dein Ergebnis am besten?",
  "Wie stark hast du dich verbessert?",
  "Ist dein Ergebnis bei jeder Übung gestiegen?",
  "Was fällt dir an deinem Diagramm auf?",
] as const;

export function reflectionQuestions(summary: TextboxTextSummary): string[] {
  return summary.sessions < 2 ? [] : [...REFLECTION_QUESTIONS];
}
