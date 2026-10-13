"use client";

import { useState } from "react";
import {
  LEARNING_WORD_STAGES,
  type LearningWordStage,
} from "../../../src/domain/learning-word";
import { reflectionQuestionsFor } from "../../../src/domain/progress-reflection";
import type {
  WordBoxStageSummary,
  WordRoundRecord,
} from "../../../src/domain/word-store-progress";
import { BarChart, LineChart, type ChartPoint } from "../../ui/charts";
import { Icon } from "../../ui/icons";
import {
  Button,
  ButtonLink,
  EmptyState,
  IconButton,
  Segmented,
} from "../../ui/primitives";
import { STAGE_COPY } from "./stage-copy";
import styles from "./wortspeicher.module.css";

type ChartKind = "linie" | "saeule";

const dateTime = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
});

/** Was beim ersten Versuch eines Wortes passiert ist, in einfacher Sprache. */
function wordOutcome(word: WordRoundRecord["words"][number]): string {
  if (word.firstTry) return "auf Anhieb richtig";
  const parts: string[] = [];
  if (word.usedHelp) parts.push("mit Hilfe");
  if (word.firstResult === "gross-klein") {
    parts.push("erst nur Groß-/Kleinschreibung falsch");
  } else if (word.firstResult === "falsch") parts.push("erst falsch");
  else if (word.firstResult === "fehlt") parts.push("erst nicht geschrieben");
  if (word.attempts > 1) parts.push(`${word.attempts} Versuche`);
  return parts.join(", ") || "nicht auf Anhieb";
}

/** Verlauf einer Wortbox: Werte, Diagramme und alle Runden (Plan 2.7). */
export function HistoryScreen({
  title,
  summary,
  rounds,
  initialStage,
  worksheetHref,
  onPractice,
  onBack,
}: {
  title: string;
  summary: Record<LearningWordStage, WordBoxStageSummary>;
  /** Alle Runden dieser Wortbox. */
  rounds: readonly WordRoundRecord[];
  initialStage: LearningWordStage;
  worksheetHref?: string | undefined;
  onPractice: (stage: LearningWordStage) => void;
  onBack: () => void;
}) {
  const [stage, setStage] = useState(initialStage);
  const [kind, setKind] = useState<ChartKind>("linie");
  const current = summary[stage];
  const ofStage = rounds
    .filter((round) => round.stage === stage)
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt));
  const points: ChartPoint[] = ofStage.map((round, index) => ({
    label: String(index + 1),
    value: round.percent,
    detail: dateTime.format(new Date(round.completedAt)),
  }));
  const questions = reflectionQuestionsFor(ofStage);
  const chartProps = {
    points,
    title: `Dein Ergebnis in Merkstufe ${stage}`,
    yLabel: "Auf Anhieb richtig",
    xLabel: "Runde",
  };
  const newestFirst = [...rounds].sort((a, b) =>
    b.completedAt.localeCompare(a.completedAt),
  );

  return (
    <section className={styles.screen} aria-labelledby="wortspeicher-title">
      <header className={styles.head}>
        <div className={styles.headMain}>
          <IconButton label="Zurück zur Übersicht" square onClick={onBack}>
            <Icon name="back" size={18} />
          </IconButton>
          <div>
            <h1 id="wortspeicher-title" className={styles.title} tabIndex={-1}>
              Verlauf: {title}
            </h1>
            <p className={styles.subtitle}>
              {rounds.length === 1
                ? "1 abgeschlossene Runde"
                : `${rounds.length} abgeschlossene Runden`}
            </p>
          </div>
        </div>
        {worksheetHref ? (
          <ButtonLink variant="ghost" href={worksheetHref}>
            Laufzettel
          </ButtonLink>
        ) : null}
      </header>

      {rounds.length === 0 ? (
        <EmptyState title="Noch keine abgeschlossene Runde">
          Wenn du eine Runde mit dieser Wortbox ganz geschafft hast, siehst du
          hier deine Ergebnisse.
        </EmptyState>
      ) : (
        <>
          <div className="ui-seg" role="group" aria-label="Merkstufe">
            {LEARNING_WORD_STAGES.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={value === stage}
                disabled={summary[value].rounds === 0}
                onClick={() => setStage(value)}
              >
                Stufe {value}
              </button>
            ))}
          </div>

          {current.rounds === 0 ? (
            <p className={styles.hint}>
              Stufe {stage} ({STAGE_COPY[stage].title}) hast du mit dieser
              Wortbox noch nicht geübt.
            </p>
          ) : (
            <>
              <dl className={styles.counts}>
                <div className={styles.count}>
                  <dt className="ui-tiny ui-muted">Bestwert</dt>
                  <dd className={styles.countValue}>{current.bestPercent} %</dd>
                </div>
                <div className={styles.count}>
                  <dt className="ui-tiny ui-muted">Letztes Ergebnis</dt>
                  <dd className={styles.countValue}>{current.lastPercent} %</dd>
                </div>
                <div className={styles.count}>
                  <dt className="ui-tiny ui-muted">Runden</dt>
                  <dd className={styles.countValue}>{current.rounds}</dd>
                </div>
              </dl>

              <Segmented<ChartKind>
                label="Diagramm"
                value={kind}
                onChange={setKind}
                options={[
                  { value: "linie", label: "Linie" },
                  { value: "saeule", label: "Säulen" },
                ]}
              />
              {kind === "linie" ? (
                <LineChart {...chartProps} />
              ) : (
                <BarChart {...chartProps} />
              )}

              {questions.length > 0 ? (
                <details>
                  <summary>Schau dir dein Diagramm an</summary>
                  <ul>
                    {questions.map((question) => (
                      <li key={question}>{question}</li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </>
          )}

          <h2 className="ui-h-section">Alle Runden</h2>
          <ul className={styles.wordList} aria-label="Alle Runden">
            {newestFirst.map((round) => (
              <li key={round.id}>
                <details className={styles.wordRow}>
                  <summary>
                    {dateTime.format(new Date(round.completedAt))} · Stufe{" "}
                    {round.stage} · {round.percent} % · {round.words.length}{" "}
                    {round.words.length === 1 ? "Wort" : "Wörter"}
                  </summary>
                  <ul className={styles.diffList}>
                    {round.words.map((word, index) => (
                      <li key={`${word.word}-${index}`}>
                        {word.word}: {wordOutcome(word)}
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className={styles.actions}>
        <Button size="lg" onClick={() => onPractice(stage)}>
          Diese Stufe üben
        </Button>
      </div>
    </section>
  );
}
