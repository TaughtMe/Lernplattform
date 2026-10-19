import type { LayoutToken } from "../../../src/domain/text-compare";
import {
  MemorizeStatus,
  RunButton,
  RunLayout,
  type RunLayoutProps,
} from "./run-layout";
import { TextFlow } from "./text-flow";
import styles from "./run-layout.module.css";

export { TEXTBOX_STEPS, StepList } from "./run-layout";

/** Rahmen, den alle vier Schritte von außen bekommen. */
export type RunFrameProps = Pick<
  RunLayoutProps,
  "layout" | "textTitle" | "textMeta" | "onBack" | "onToggleLayout"
>;

/** Merkphase: der ganze Text; in Durchgang 1 sind die späteren Lücken markiert. */
export function MemorizeScreen({
  round,
  tokens,
  markedWords,
  secondsLeft,
  totalSeconds,
  onReady,
  mirrored = false,
  ...frame
}: RunFrameProps & {
  round: 1 | 2 | 3 | 4;
  tokens: readonly LayoutToken[];
  /** Wortindizes, die markiert werden (nur Durchgang 1). */
  markedWords: ReadonlySet<number>;
  secondsLeft: number;
  totalSeconds: number;
  onReady: () => void;
  /** Lesetext nur in der Darstellung gespiegelt (Einstellung des Kindes). */
  mirrored?: boolean;
}) {
  return (
    <RunLayout
      {...frame}
      round={round}
      step={0}
      status={
        <MemorizeStatus secondsLeft={secondsLeft} totalSeconds={totalSeconds} />
      }
      hint={
        markedWords.size > 0
          ? "Die markierten Wörter fehlen gleich. Präge dir ihre Schreibweise besonders gut ein."
          : "Lies den Text in Ruhe und präge dir die Schreibweise ein."
      }
      actions={<RunButton onClick={onReady}>Ich bin bereit</RunButton>}
    >
      <div className={styles.paper}>
        <TextFlow
          className={
            mirrored ? `${styles.lined} ${styles.mirrored}` : styles.lined
          }
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
    </RunLayout>
  );
}
