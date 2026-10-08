import type { TextboxRoundResult } from "../../../src/domain/textbox-session";
import { Button, ProgressBar } from "../../ui/primitives";
import styles from "./textbox.module.css";

/** Abschluss einer Einheit: Ergebnis aus Durchgang 4 und die vier Durchgänge. */
export function CompletionScreen({
  title,
  rounds,
  finalPercent,
  previousBest,
  onAgain,
  onLibrary,
}: {
  title: string;
  rounds: readonly TextboxRoundResult[];
  finalPercent: number;
  /** Bestwert vor dieser Einheit; leer beim ersten Mal. */
  previousBest: number | undefined;
  onAgain: () => void;
  onLibrary: () => void;
}) {
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
        <p className={styles.scoreDetail}>Ergebnis aus Durchgang 4</p>
        <p className={styles.percent}>{finalPercent} %</p>
        {record ? <p role="status">{record}</p> : null}
      </div>
      <ul className={styles.rounds} aria-label="Die vier Durchgänge">
        {rounds.map((round) => (
          <li key={round.round} className={styles.roundCard}>
            <span>Durchgang {round.round}</span>
            <span className={styles.roundValue}>{round.score.percent} %</span>
            <ProgressBar
              value={round.score.percent}
              max={100}
              label={`Durchgang ${round.round}: ${round.score.percent} Prozent`}
            />
          </li>
        ))}
      </ul>
      <div className={styles.actions}>
        <Button size="lg" onClick={onAgain}>
          Nochmal üben
        </Button>
        <Button size="lg" variant="ghost" onClick={onLibrary}>
          Anderen Text wählen
        </Button>
      </div>
    </section>
  );
}
