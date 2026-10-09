"use client";

import { useEffect, useRef } from "react";
import { homophoneHint, isHomophoneOf } from "../../../src/domain/homophones";
import type { WordResult } from "../../../src/domain/text-compare";
import type { WordRoundFeedback } from "../../../src/domain/word-round";
import { LetterCompare } from "./letter-compare";
import styles from "./wortspeicher.module.css";

/** Fehlerart in einfacher Sprache (Plan 2.5). */
function kindNote(result: WordResult): string {
  if (result.kind === "gross-klein") {
    return "Fast! Nur die Groß- und Kleinschreibung stimmt nicht.";
  }
  if (result.kind === "fehlt") return "Dieses Wort fehlt noch.";
  if (result.nearMiss) return "Fast richtig: ein Buchstabe ist anders.";
  return "Noch nicht richtig.";
}

/** Das gleich klingende andere Wort: freundlicher Hinweis statt Vorwurf. */
function homophoneNote(word: string, input: string): string | undefined {
  if (!isHomophoneOf(word, input)) return undefined;
  const hint = homophoneHint(word);
  return `Das klingt genauso. Gemeint war ‚${word}‘${hint ? ` (${hint})` : ""}.`;
}

/**
 * Rückmeldung nach einem Fehler: Fehlerart, Buchstabenvergleich und der
 * Hinweis bei gleich klingenden Wörtern. Danach „Noch einmal versuchen“.
 */
export function FeedbackPanel({
  feedback,
  homophoneHints,
  retryHint,
  onRetry,
}: {
  feedback: WordRoundFeedback;
  /** Nur in Stufe 6 (Hören): Hinweis auf gleich klingende Wörter. */
  homophoneHints: boolean;
  /** Was nach „Noch einmal versuchen“ passiert, z. B. „Schau dir das Wort noch einmal an.“ */
  retryHint: string;
  onRetry: () => void;
}) {
  const retry = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    retry.current?.focus();
  }, []);

  const single = feedback.words.length === 1 ? feedback.words[0]! : undefined;
  const homophone = single
    ? homophoneNote(single.word, single.result.actual ?? "")
    : undefined;

  return (
    <div className={styles.feedback} role="status">
      <h2 className={styles.feedbackHead}>Noch nicht sicher</h2>
      {single ? (
        <>
          <p className={styles.kindNote}>{kindNote(single.result)}</p>
          <LetterCompare
            expected={single.word}
            actual={single.result.actual ?? feedback.input.trim()}
          />
          {homophoneHints && homophone ? (
            <p className={styles.kindNote}>{homophone}</p>
          ) : null}
        </>
      ) : (
        <>
          <ul className={styles.blockResults} aria-label="Ergebnis je Wort">
            {feedback.words.map((entry) => (
              <li
                key={entry.word}
                className={`${styles.blockResult} ${entry.correct ? styles.blockResultGood : ""}`}
              >
                <strong>
                  {entry.correct ? "Richtig" : "Noch nicht"}: {entry.word}
                </strong>
                {entry.correct ? null : (
                  <>
                    <span className={styles.kindNote}>
                      {kindNote(entry.result)}
                    </span>
                    {entry.result.actual ? (
                      <LetterCompare
                        expected={entry.word}
                        actual={entry.result.actual}
                      />
                    ) : null}
                  </>
                )}
              </li>
            ))}
          </ul>
          {feedback.extra.length > 0 ? (
            <p className="ui-small ui-muted">
              Zusätzlich geschrieben: {feedback.extra.join(", ")}
            </p>
          ) : null}
        </>
      )}
      <p className="ui-small ui-muted">{retryHint}</p>
      <div className={styles.actions}>
        <button
          ref={retry}
          type="button"
          className="ui-btn ui-btn--primary ui-btn--lg"
          onClick={onRetry}
        >
          Noch einmal versuchen
        </button>
      </div>
    </div>
  );
}
