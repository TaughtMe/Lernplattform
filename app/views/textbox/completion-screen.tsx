import {
  formatPercentSeries,
  latestAttempt,
  roundAttempts,
  type TextboxRoundResult,
} from "../../../src/domain/textbox-session";
import { Button, ButtonLink, ProgressBar } from "../../ui/primitives";
import styles from "./textbox.module.css";

/**
 * Abschluss einer Einheit: Ergebnis des letzten Versuchs in Durchgang 4 und die
 * vier Durchgänge, bei Wiederholungen mit dem Verlauf der Prozentwerte.
 */
export function CompletionScreen({
  title,
  rounds,
  finalPercent,
  previousBest,
  onAgain,
  onLibrary,
  onHistory,
  errorWordsHref,
}: {
  title: string;
  rounds: readonly TextboxRoundResult[];
  finalPercent: number;
  /** Bestwert vor dieser Einheit; leer beim ersten Mal. */
  previousBest: number | undefined;
  onAgain: () => void;
  onLibrary: () => void;
  onHistory: () => void;
  /** Link zum Wortspeicher mit den Fehlerwörtern; leer, wenn es keine gibt. */
  errorWordsHref?: string | undefined;
}) {
  const finalRound = rounds.find((round) => round.round === 4);
  const final = finalRound ? latestAttempt(finalRound).score : undefined;
  const finalCount = finalRound ? roundAttempts(finalRound).length : 1;
  const record =
    previousBest === undefined
      ? "Das ist dein erster Bestwert für diesen Text."
      : finalPercent > previousBest
        ? "Neuer Bestwert!"
        : null;
  return (
    <section className={styles.screen} aria-labelledby="textbox-title">
      <header className={styles.head}>
        <div>
          <h1 id="textbox-title" className={styles.title} tabIndex={-1}>
            Geschafft!
          </h1>
          <p className={styles.subtitle}>{title}</p>
        </div>
      </header>
      <div className={styles.final}>
        <p className={styles.scoreDetail}>
          Ergebnis aus Durchgang 4
          {finalCount > 1 ? `, Versuch ${finalCount}` : ""}
        </p>
        <p className={styles.percent}>{finalPercent} %</p>
        {final ? (
          <p className={styles.scoreDetail}>
            {final.correct} von {final.total} Wörtern richtig geschrieben
          </p>
        ) : null}
        {record ? <p role="status">{record}</p> : null}
      </div>
      <ul className={styles.rounds} aria-label="Die vier Durchgänge">
        {rounds.map((round) => {
          const attempts = roundAttempts(round);
          const percent = latestAttempt(round).score.percent;
          return (
            <li key={round.round} className={styles.roundCard}>
              <span>Durchgang {round.round}</span>
              <span className={styles.roundValue}>{percent} %</span>
              {attempts.length > 1 ? (
                <span>
                  Versuch {attempts.length}:{" "}
                  {formatPercentSeries(
                    attempts.map((attempt) => attempt.score.percent),
                  )}
                </span>
              ) : null}
              <ProgressBar
                value={percent}
                max={100}
                label={`Durchgang ${round.round}: ${percent} Prozent`}
              />
            </li>
          );
        })}
      </ul>
      <div className={styles.actions}>
        <Button size="lg" onClick={onAgain}>
          Nochmal üben
        </Button>
        <Button size="lg" variant="ghost" onClick={onLibrary}>
          Anderen Text wählen
        </Button>
        <Button size="lg" variant="soft" onClick={onHistory}>
          Verlauf ansehen
        </Button>
        {errorWordsHref ? (
          <ButtonLink size="lg" variant="soft" href={errorWordsHref}>
            Fehlerwörter im Wortspeicher üben
          </ButtonLink>
        ) : null}
      </div>
    </section>
  );
}
