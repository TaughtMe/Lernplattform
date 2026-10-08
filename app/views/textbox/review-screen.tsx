import type {
  LayoutToken,
  WordResult,
  WordResultKind,
} from "../../../src/domain/text-compare";
import type { TextboxRoundResult } from "../../../src/domain/textbox-session";
import { Button } from "../../ui/primitives";
import { StepList } from "./memorize-screen";
import { TextFlow } from "./text-flow";
import styles from "./textbox.module.css";

const KINDS: Record<
  WordResultKind,
  { symbol: string; label: string; className: string }
> = {
  richtig: { symbol: "✓", label: "richtig", className: styles.richtig! },
  falsch: { symbol: "✗", label: "falsch", className: styles.falsch! },
  "gross-klein": {
    symbol: "Aa",
    label: "Groß-/Kleinschreibung",
    className: styles.grossklein!,
  },
  fehlt: { symbol: "–", label: "fehlt", className: styles.fehlt! },
  zusaetzlich: {
    symbol: "+",
    label: "zusätzlich",
    className: styles.zusaetzlich!,
  },
};

/** Ein Wort der Kontrolle: Farbe, Symbol und Text, nie nur Farbe. */
function ResultWord({ result }: { result: WordResult }) {
  const kind = KINDS[result.kind];
  const label =
    result.kind === "falsch" && result.nearMiss ? "fast richtig" : kind.label;
  if (result.kind === "richtig") {
    return (
      <span className={`${styles.res} ${kind.className}`}>
        <span className={styles.symbol} aria-hidden="true">
          {kind.symbol}
        </span>
        <span className="ui-sr-only">{kind.label}: </span>
        <span className={styles.right}>{result.expected}</span>
      </span>
    );
  }
  return (
    <span className={`${styles.res} ${kind.className}`}>
      <span className={styles.symbol} aria-hidden="true">
        {kind.symbol}
      </span>
      <span className="ui-sr-only">{label}: </span>
      {result.actual ? (
        <span className={result.expected ? styles.wrong : styles.right}>
          {result.actual}
        </span>
      ) : null}
      {result.expected ? (
        <span className={styles.right}>
          {result.actual ? (
            <>
              <span aria-hidden="true">→ </span>
              <span className="ui-sr-only">richtig: </span>
            </>
          ) : null}
          {result.expected}
        </span>
      ) : null}
      <span className={styles.kindLabel} aria-hidden="true">
        {label}
      </span>
    </span>
  );
}

/** Kontrolle nach einem Durchgang: Original und Eingabe Wort für Wort. */
export function ReviewScreen({
  title,
  tokens,
  result,
  onNext,
}: {
  title: string;
  tokens: readonly LayoutToken[];
  result: TextboxRoundResult;
  onNext: () => void;
}) {
  const { score, round } = result;
  const byWord = new Map<number, WordResult>(
    result.words.flatMap((word) =>
      word.expectedIndex === undefined
        ? []
        : [[word.expectedIndex, word] as const],
    ),
  );
  return (
    <section className={styles.screen} aria-labelledby="textbox-title">
      <header className={styles.head}>
        <div>
          <h1 id="textbox-title" className={styles.title} tabIndex={-1}>
            Durchgang {round} von 4: Kontrolle
          </h1>
          <p className={styles.subtitle}>{title}</p>
        </div>
        <StepList active={2} />
      </header>
      <div className={styles.score}>
        <p className={styles.percent}>{score.percent} %</p>
        <p className={styles.scoreDetail}>
          {round === 4
            ? `${score.correct} von ${score.total} Wörtern richtig`
            : `${score.correct} von ${score.total} Lücken richtig`}
          {score.extra > 0 ? `, ${score.extra} zusätzlich geschrieben` : ""}
        </p>
      </div>
      <ul className={styles.legend} aria-label="Zeichen der Kontrolle">
        {(Object.keys(KINDS) as WordResultKind[]).map((kind) => (
          <li key={kind}>
            <span aria-hidden="true">{KINDS[kind].symbol}</span>{" "}
            {KINDS[kind].label}
          </li>
        ))}
      </ul>
      <div className={styles.paper}>
        {round === 4 ? (
          <ul className={styles.wordList} aria-label="Dein Text im Vergleich">
            {result.words.map((word, position) => (
              <li key={position}>
                <ResultWord result={word} />
              </li>
            ))}
          </ul>
        ) : (
          <TextFlow
            className={styles.text}
            tokens={tokens}
            renderWord={(token) => {
              const word = byWord.get(token.index);
              return word ? <ResultWord result={word} /> : token.text;
            }}
          />
        )}
      </div>
      {score.punctuationHints > 0 ? (
        <p className={styles.hint}>
          Hinweis: Bei den Satzzeichen gibt es {score.punctuationHints}{" "}
          {score.punctuationHints === 1 ? "Unterschied" : "Unterschiede"}. Das
          zählt nicht für dein Ergebnis.
        </p>
      ) : null}
      <div className={styles.actions}>
        <Button size="lg" onClick={onNext}>
          {round === 4
            ? "Ergebnis ansehen"
            : `Weiter zu Durchgang ${round + 1}`}
        </Button>
      </div>
    </section>
  );
}
