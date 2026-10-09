"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { LearningWordStage } from "../../../src/domain/learning-word";
import type { WordRoundWordResult } from "../../../src/domain/word-round";
import { Button, ButtonLink } from "../../ui/primitives";
import { STAGE_COPY } from "./stage-copy";
import styles from "./wortspeicher.module.css";

/** Abschluss einer Runde: Prozentwert, Bestwert und die Wörter zum Weiterüben (Plan 2.5). */
export function CompletionScreen({
  title,
  stage,
  percent,
  results,
  record,
  notice,
  textSuggestion,
  textboxHref,
  onAgain,
  onOtherStage,
  onHistory,
}: {
  title: string;
  stage: LearningWordStage;
  percent: number;
  results: readonly WordRoundWordResult[];
  /** „Neuer Bestwert!“, „erster Bestwert“ oder keine Zeile. */
  record: "new" | "first" | undefined;
  notice?: string | undefined;
  /** Karte mit dem besten passenden Text der Textbox (nur bei sichtbarer Textbox). */
  textSuggestion?: ReactNode;
  /** Rückfall ohne passenden Text: „Mit einem Text weiterüben“. */
  textboxHref?: string | undefined;
  onAgain: () => void;
  onOtherStage: () => void;
  onHistory: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, []);

  const right = results.filter((entry) => entry.firstTry).length;
  const withHelp = results.filter((entry) => entry.usedHelp).length;
  const missed = results.filter((entry) => !entry.firstTry);

  return (
    <section className={styles.screen} aria-labelledby="wortspeicher-title">
      <header className={styles.head}>
        <div>
          <h1
            id="wortspeicher-title"
            ref={heading}
            className={styles.title}
            tabIndex={-1}
          >
            Geschafft!
          </h1>
          <p className={styles.subtitle}>
            {title} · Merkstufe {stage}: {STAGE_COPY[stage].title}
          </p>
        </div>
      </header>

      <div className={styles.final}>
        <p className={styles.percent}>{percent} %</p>
        <p>
          {right} von {results.length}{" "}
          {results.length === 1 ? "Wort" : "Wörtern"} auf Anhieb richtig
        </p>
        {record === "new" ? (
          <p className={styles.record} role="status">
            Neuer Bestwert!
          </p>
        ) : null}
        {record === "first" ? (
          <p role="status">Das ist dein erster Bestwert für diese Stufe.</p>
        ) : null}
      </div>

      {notice ? (
        <p className="ui-notice ui-notice--bad" role="status">
          {notice}
        </p>
      ) : null}

      <ul className={styles.counts} aria-label="Ergebnis der Runde">
        <li className={styles.count}>
          <span className={styles.countValue}>{right}</span>
          <span className="ui-tiny ui-muted">bereit für die nächste Stufe</span>
        </li>
        <li className={styles.count}>
          <span className={styles.countValue}>{results.length - right}</span>
          <span className="ui-tiny ui-muted">
            auf dieser oder einer leichteren Stufe
          </span>
        </li>
        <li className={styles.count}>
          <span className={styles.countValue}>{withHelp}</span>
          <span className="ui-tiny ui-muted">mit Hilfe</span>
        </li>
      </ul>

      {missed.length > 0 ? (
        <>
          <h2 className="ui-label">Diese Wörter üben wir noch einmal</h2>
          <ul className={styles.missed}>
            {missed.map((entry) => (
              <li key={entry.word}>{entry.word}</li>
            ))}
          </ul>
        </>
      ) : null}

      <p className="ui-small ui-muted">
        Merkstufe und Wiederholungsfälligkeit wurden lokal gespeichert. Fehler
        machen die betroffenen Wörter sofort wieder fällig; sichere Lösungen
        verlängern den Abstand bis zur nächsten Wiederholung.
      </p>

      {textSuggestion}

      <div className={styles.actions}>
        <Button size="lg" onClick={onAgain}>
          Nochmal üben
        </Button>
        <Button size="lg" variant="soft" onClick={onOtherStage}>
          Andere Stufe wählen
        </Button>
        <Button size="lg" variant="soft" onClick={onHistory}>
          Verlauf ansehen
        </Button>
        {textboxHref ? (
          <ButtonLink size="lg" variant="gold" href={textboxHref}>
            Mit einem Text weiterüben
          </ButtonLink>
        ) : null}
        <ButtonLink size="lg" variant="ghost" href="/lernen">
          Andere Übung wählen
        </ButtonLink>
      </div>
    </section>
  );
}
