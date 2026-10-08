import type { LayoutToken } from "../../../src/domain/text-compare";
import { Button, ProgressBar } from "../../ui/primitives";
import { TextFlow } from "./text-flow";
import styles from "./textbox.module.css";

export const TEXTBOX_STEPS = ["Merken", "Schreiben", "Kontrolle"] as const;

export function StepList({ active }: { active: 0 | 1 | 2 }) {
  return (
    <ol className={styles.steps} aria-label="Ablauf eines Durchgangs">
      {TEXTBOX_STEPS.map((step, index) => (
        <li
          key={step}
          className={`${styles.step} ${index === active ? styles.stepActive : ""}`}
          aria-current={index === active ? "step" : undefined}
        >
          {index + 1}. {step}
        </li>
      ))}
    </ol>
  );
}

function clock(seconds: number) {
  const safe = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

/** Merkphase: der ganze Text; in Durchgang 1 sind die späteren Lücken markiert. */
export function MemorizeScreen({
  round,
  title,
  tokens,
  markedWords,
  secondsLeft,
  totalSeconds,
  onReady,
}: {
  round: 1 | 2 | 3 | 4;
  title: string;
  tokens: readonly LayoutToken[];
  /** Wortindizes, die markiert werden (nur Durchgang 1). */
  markedWords: ReadonlySet<number>;
  secondsLeft: number;
  totalSeconds: number;
  onReady: () => void;
}) {
  return (
    <section className={styles.screen} aria-labelledby="textbox-title">
      <header className={styles.head}>
        <div>
          <h1 id="textbox-title" className={styles.title} tabIndex={-1}>
            Durchgang {round} von 4: Merken
          </h1>
          <p className={styles.subtitle}>{title}</p>
        </div>
        <StepList active={0} />
      </header>
      <div className={styles.timer}>
        <p className={styles.timerText} role="timer">
          Merkzeit: noch {clock(secondsLeft)}
        </p>
        <ProgressBar
          value={secondsLeft}
          max={totalSeconds}
          label="Verbleibende Merkzeit"
        />
      </div>
      {markedWords.size > 0 ? (
        <p className={styles.hint}>
          Die farbig unterstrichenen Wörter fehlen gleich. Präge dir ihre
          Schreibweise besonders gut ein.
        </p>
      ) : (
        <p className={styles.hint}>
          Lies den Text in Ruhe und präge dir die Schreibweise ein.
        </p>
      )}
      <div className={styles.paper}>
        <TextFlow
          className={styles.text}
          tokens={tokens}
          renderWord={(token) =>
            markedWords.has(token.index) ? (
              <mark className={styles.mark}>
                {token.text}
                <span className="ui-sr-only"> (fehlt gleich)</span>
              </mark>
            ) : (
              token.text
            )
          }
        />
      </div>
      <div className={styles.actions}>
        <Button size="lg" onClick={onReady}>
          Ich bin bereit
        </Button>
      </div>
    </section>
  );
}
