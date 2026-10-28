"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { LearningWordStage } from "../../../src/domain/learning-word";
import type { LearningWordMode } from "../../../src/domain/learning-word-progress";
import type { WordRoundWordResult } from "../../../src/domain/word-round";
import {
  practicedWordsLabel,
  type BoxCoverage,
} from "../../../src/domain/word-store-progress";
import { Button, ButtonLink } from "../../ui/primitives";
import { STAGE_COPY } from "./stage-copy";
import styles from "./wortspeicher.module.css";

/**
 * Abschluss einer Runde: Ergebnis dieser Runde, Übungsmenge des Tages und die
 * Wörter zum Weiterüben (Plan 2.5, W-11 bis W-13). Es gibt keinen Rekord: Nur
 * das Ergebnis der Runde und der Lernstand zählen.
 */
export function CompletionScreen({
  title,
  stage,
  percent,
  results,
  boxWordCount,
  practicedToday,
  mode,
  percentless,
  coverage,
  notice,
  textSuggestion,
  textboxHref,
  onAgain,
  onRetryMissed,
  onOtherStage,
  onHistory,
}: {
  title: string;
  stage: LearningWordStage;
  percent: number;
  results: readonly WordRoundWordResult[];
  /** Wörter der ganzen Wortbox; kleiner als die Runde heißt Stichprobe (W-11). */
  boxWordCount: number;
  /** Übungsmenge des lokalen Tages inklusive dieser Runde (W-13). */
  practicedToday: number;
  /** „due“ nur in „Trainingswörter heute“; bestimmt den Hinweis zum Lernstand. */
  mode: LearningWordMode;
  /** Fehlerwörter: „n Wörter geübt“ statt Prozentwert (W-12). */
  percentless: boolean;
  /**
   * Box-Fortschritt inklusive dieser Runde (W-10). Nur bei echten Wortboxen;
   * ohne Wert fehlt die Zeile („heute“, Textbox, Fehlerwörter).
   */
  coverage?: BoxCoverage | undefined;
  notice?: string | undefined;
  /** Karte mit dem besten passenden Text der Textbox (nur bei sichtbarer Textbox). */
  textSuggestion?: ReactNode;
  /** Rückfall ohne passenden Text: „Mit einem Text weiterüben“. */
  textboxHref?: string | undefined;
  onAgain: () => void;
  /**
   * „Diese Wörter jetzt noch einmal üben“: eine freie Runde mit genau den
   * Fehlerwörtern (ändert keine Box, Regel W-1). Ohne Funktion fehlt der Knopf.
   */
  onRetryMissed?: (() => void) | undefined;
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
        <p
          className={`${styles.percent} ${percentless ? styles.percentWords : ""}`}
        >
          {percentless ? practicedWordsLabel(results.length) : `${percent} %`}
        </p>
        <p>
          {right} von {results.length}{" "}
          {results.length === 1 ? "Wort" : "Wörtern"} dieser Runde auf Anhieb
          richtig
        </p>
        {results.length < boxWordCount ? (
          <p className="ui-small ui-muted">
            Runde aus {results.length} von {boxWordCount} Wörtern der Wortbox
          </p>
        ) : null}
        {coverage ? (
          <p className="ui-small ui-muted">
            Wortbox: {coverage.mastered} von {coverage.total}{" "}
            {coverage.total === 1 ? "Wort" : "Wörtern"} auf Stufe {stage} auf
            Anhieb richtig ({coverage.percent} %)
          </p>
        ) : null}
        <p className="ui-small ui-muted">
          Heute {practicedWordsLabel(practicedToday)}
        </p>
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
          <h2 className="ui-label">Diese Wörter kommen morgen wieder</h2>
          <ul className={styles.missed}>
            {missed.map((entry) => (
              <li key={entry.word}>{entry.word}</li>
            ))}
          </ul>
        </>
      ) : null}

      <p className="ui-small ui-muted">
        {mode === "due"
          ? "Merkstufe und Wiederholungsfälligkeit wurden lokal gespeichert. Wörter, die du auf Anhieb richtig geschrieben hast, kommen später wieder; bei Fehlern oder mit Hilfe sind sie morgen wieder dran."
          : "Merkstufe und Fälligkeit wurden lokal gespeichert. Freies Üben verändert den Abstand der Wiederholung nicht; Wörter mit Fehler oder Hilfe sind spätestens morgen wieder dran."}
      </p>

      {textSuggestion}

      <div className={styles.actions}>
        {missed.length > 0 && onRetryMissed ? (
          <Button size="lg" onClick={onRetryMissed}>
            Diese Wörter jetzt noch einmal üben
          </Button>
        ) : null}
        <Button
          size="lg"
          variant={missed.length > 0 && onRetryMissed ? "soft" : "primary"}
          onClick={onAgain}
        >
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
