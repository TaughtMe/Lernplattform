import {
  reviewSequence,
  type LayoutToken,
  type WordResult,
} from "../../../src/domain/text-compare";
import {
  formatPercentSeries,
  latestAttempt,
  roundAttempts,
  type TextboxRoundResult,
} from "../../../src/domain/textbox-session";
import type { RunFrameProps } from "./memorize-screen";
import { RunButton, RunLayout, ScoreStatus } from "./run-layout";
import styles from "./run-layout.module.css";
import { TextFlow } from "./text-flow";

/**
 * Ein Wort der Kontrolle ohne Symbole und Legende: richtig = grünes Kästchen,
 * falsch = eigene Schreibweise durchgestrichen + richtiges Wort grün, fehlt =
 * rote Umrandung, zusätzlich = nur durchgestrichen, Groß/klein = durchgestrichen
 * + Wort mit Akzent-Umrandung. Die unsichtbaren Präfixe nennen die Art für
 * Screenreader. In Durchgang 4 bleiben richtige Wörter schlicht.
 */
function ResultWord({
  result,
  plainRight,
}: {
  result: WordResult;
  plainRight: boolean;
}) {
  if (result.kind === "richtig") {
    return (
      <>
        <span className="ui-sr-only">richtig: </span>
        <span className={plainRight ? undefined : styles.ok}>
          {result.expected}
        </span>
      </>
    );
  }
  if (result.kind === "fehlt") {
    return (
      <>
        <span className="ui-sr-only">fehlt: </span>
        <span className={styles.missBox}>{result.expected}</span>
      </>
    );
  }
  if (result.kind === "zusaetzlich") {
    return (
      <>
        <span className="ui-sr-only">zusätzlich: </span>
        <s className={styles.given}>{result.actual}</s>
      </>
    );
  }
  const label =
    result.kind === "gross-klein"
      ? "Groß-/Kleinschreibung"
      : result.nearMiss
        ? "fast richtig"
        : "falsch";
  return (
    <>
      <span className="ui-sr-only">{label}: </span>
      {result.actual ? <s className={styles.given}>{result.actual}</s> : null}
      <span className="ui-sr-only">richtig: </span>
      <span
        className={result.kind === "gross-klein" ? styles.caseBox : styles.ok}
      >
        {result.expected}
      </span>
    </>
  );
}

/** Kontrolle nach einem Durchgang: Original und Eingabe Wort für Wort im Heft. */
export function ReviewScreen({
  tokens,
  result: roundResult,
  onNext,
  onRepeat,
  ...frame
}: RunFrameProps & {
  tokens: readonly LayoutToken[];
  /** Durchgang mit allen Versuchen; gezeigt wird der letzte, er zählt. */
  result: TextboxRoundResult;
  onNext: () => void;
  onRepeat: () => void;
}) {
  const attempts = roundAttempts(roundResult);
  const { words, score } = latestAttempt(roundResult);
  const { round } = roundResult;
  const byWord = new Map<number, WordResult>(
    words.flatMap((word) =>
      word.expectedIndex === undefined
        ? []
        : [[word.expectedIndex, word] as const],
    ),
  );
  return (
    <RunLayout
      {...frame}
      round={round}
      step={2}
      status={
        <ScoreStatus
          correct={score.correct}
          total={score.total}
          percent={score.percent}
          unit={round === 4 ? "Wörtern" : "Lücken"}
          extra={score.extra}
        />
      }
      hint="Grün ist richtig. Durchgestrichen ist deine Schreibweise, daneben steht das richtige Wort."
      actions={
        <>
          <RunButton variant="secondary" onClick={onRepeat}>
            Durchgang wiederholen
          </RunButton>
          <RunButton onClick={onNext}>
            {round === 4
              ? "Ergebnis ansehen"
              : `Weiter zu Durchgang ${round + 1}`}
          </RunButton>
        </>
      }
    >
      <div className={styles.paper}>
        {round === 4 ? (
          <p className={styles.lined}>
            {reviewSequence(tokens, words).map(
              ({ result: word, trailing }, position) => (
                <span key={position}>
                  {position > 0 ? " " : null}
                  <span className={styles.nowrap}>
                    <ResultWord result={word} plainRight />
                    {trailing}
                  </span>
                </span>
              ),
            )}
          </p>
        ) : (
          <TextFlow
            className={styles.lined}
            tokens={tokens}
            renderWord={(token) => {
              const word = byWord.get(token.index);
              return word ? (
                <ResultWord result={word} plainRight={false} />
              ) : (
                token.text
              );
            }}
          />
        )}
      </div>
      {attempts.length > 1 ? (
        <p className={styles.note} role="status">
          Versuch {attempts.length} in diesem Durchgang:{" "}
          {formatPercentSeries(
            attempts.map((attempt) => attempt.score.percent),
          )}
        </p>
      ) : null}
      {score.punctuationHints > 0 ? (
        <p className={styles.note}>
          Hinweis: Bei den Satzzeichen gibt es {score.punctuationHints}{" "}
          {score.punctuationHints === 1 ? "Unterschied" : "Unterschiede"}. Das
          zählt nicht für dein Ergebnis.
        </p>
      ) : null}
    </RunLayout>
  );
}
