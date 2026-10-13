"use client";

import { useState } from "react";
import {
  reflectionQuestions,
  type TextboxTextSummary,
} from "../../../src/domain/textbox-progress";
import {
  TEXTBOX_DIFFICULTY_LABELS,
  TEXTBOX_PHENOMENON_LABELS,
  type TextboxText,
} from "../../../src/domain/textbox-text";
import { BarChart, LineChart, type ChartPoint } from "../../ui/charts";
import { Button, EmptyState, Pill, Segmented } from "../../ui/primitives";
import styles from "./textbox.module.css";

type ChartKind = "linie" | "saeule";

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

/** Alle bisherigen Leistungen zu einem Text: Werte, Diagramme und Einheiten. */
export function TextDetailScreen({
  text,
  summary,
  onPractice,
  onBack,
}: {
  text: TextboxText;
  summary: TextboxTextSummary | undefined;
  onPractice: () => void;
  onBack: () => void;
}) {
  const [kind, setKind] = useState<ChartKind>("linie");
  const history = summary?.history ?? [];
  const points: ChartPoint[] = history.map((entry, index) => ({
    label: String(index + 1),
    value: entry.percent,
    detail: formatDate(entry.completedAt),
  }));
  const questions = summary ? reflectionQuestions(summary) : [];
  const chartProps = {
    points,
    title: "Dein Ergebnis in Durchgang 4",
    yLabel: "Richtig geschrieben",
    xLabel: "Übungsversuch",
  };

  return (
    <section className={styles.screen} aria-labelledby="textbox-title">
      <header className={styles.head}>
        <div>
          <h1 id="textbox-title" className={styles.title} tabIndex={-1}>
            {text.title}
          </h1>
          <div className={styles.meta}>
            <Pill>{TEXTBOX_DIFFICULTY_LABELS[text.difficulty]}</Pill>
            {text.phenomena.map((value) => (
              <Pill key={value}>{TEXTBOX_PHENOMENON_LABELS[value]}</Pill>
            ))}
          </div>
        </div>
        <Button variant="ghost" onClick={onBack}>
          Zur Textauswahl
        </Button>
      </header>

      {!summary ? (
        <EmptyState title="Noch keine abgeschlossene Übung">
          Wenn du diesen Text einmal ganz geschafft hast, siehst du hier deine
          Ergebnisse.
        </EmptyState>
      ) : (
        <>
          <dl className={styles.stats}>
            <div className={styles.stat}>
              <dt>Bestwert</dt>
              <dd>{summary.bestPercent} %</dd>
            </div>
            <div className={styles.stat}>
              <dt>Letztes Ergebnis</dt>
              <dd>{summary.lastPercent} %</dd>
            </div>
            <div className={styles.stat}>
              <dt>Übungsversuche</dt>
              <dd>{summary.sessions}</dd>
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
            <details className={styles.reflection}>
              <summary>Schau dir dein Diagramm an</summary>
              <ul>
                {questions.map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ul>
            </details>
          ) : null}

          <h2 className={styles.sectionTitle}>Alle Übungen</h2>
          <ul className={styles.sessions} aria-label="Alle Übungen">
            {[...history].reverse().map((entry) => (
              <li key={entry.trainingId}>
                <details className={styles.session}>
                  <summary>
                    <span>{formatDate(entry.completedAt)}</span>
                    <span>{entry.percent} %</span>
                  </summary>
                  <ul className={styles.sessionRounds}>
                    {entry.rounds.map((percent, index) => (
                      <li key={index}>
                        Durchgang {index + 1}: {percent} %
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
        <Button size="lg" onClick={onPractice}>
          Erneut üben
        </Button>
      </div>
    </section>
  );
}
