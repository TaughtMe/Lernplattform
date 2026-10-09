"use client";

import { useState } from "react";
import {
  LEARNING_WORD_STAGES,
  type LearningWordStage,
} from "../../../src/domain/learning-word";
import { Button, EmptyState } from "../../ui/primitives";
import styles from "./worksheet-screen.module.css";

export type WordWorksheetRow = {
  boxId: string;
  title: string;
  /** Bestwert je Stufe; `undefined` heißt „noch nicht geübt“. */
  bestByStage: Record<LearningWordStage, number | undefined>;
  rounds: number;
  lastPracticedAt: string | undefined;
};

export type WordWorksheetStats = {
  trainedWords: number;
  secureWords: number;
  repetitions: number;
  rounds: number;
};

export const WORD_WORKSHEET_NOTICE =
  "Dieser Laufzettel wurde auf deinem Gerät erstellt. Er ist eine Übersicht und kein Prüfungsnachweis.";

const dateFormat = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" });

/**
 * Druckbarer Laufzettel des Wortspeichers. Das Namensfeld ist nur Anzeige und
 * bleibt im Speicher dieser Seite: es wird weder gespeichert noch weitergegeben.
 */
export function WordWorksheetScreen({
  rows,
  stats,
  createdAt,
  onPrint,
}: {
  rows: readonly WordWorksheetRow[];
  stats: WordWorksheetStats;
  createdAt: Date;
  onPrint: () => void;
}) {
  const [name, setName] = useState("");
  return (
    <section
      className={styles.sheet}
      aria-labelledby="worksheet-title"
      data-print-sheet=""
    >
      <h1 id="worksheet-title" className={styles.title} tabIndex={-1}>
        Laufzettel Wortspeicher
      </h1>
      <div className={`${styles.controls} ${styles.noPrint}`}>
        <label className={styles.field}>
          Name oder Kennung (freiwillig, wird nicht gespeichert)
          <input
            className={styles.input}
            type="text"
            value={name}
            maxLength={60}
            autoComplete="off"
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <Button onClick={onPrint}>Drucken oder als PDF sichern</Button>
      </div>
      <p className={styles.meta}>
        <span>Name oder Kennung: </span>
        <strong data-testid="worksheet-name">{name.trim() || "–"}</strong>
        <span> · Erstellt am {dateFormat.format(createdAt)}</span>
      </p>
      {rows.length === 0 ? (
        <EmptyState title="Noch keine Wortspeicher-Runde abgeschlossen">
          Sobald du eine Runde mit einer Wortbox ganz geschafft hast, erscheint
          sie hier.
        </EmptyState>
      ) : (
        <table className={styles.table}>
          <caption className="ui-sr-only">Geübte Wortboxen</caption>
          <thead>
            <tr>
              <th scope="col">Wortbox</th>
              {LEARNING_WORD_STAGES.map((stage) => (
                <th key={stage} scope="col">
                  Bestwert Stufe {stage}
                </th>
              ))}
              <th scope="col">Runden</th>
              <th scope="col">Zuletzt geübt</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.boxId}>
                <th scope="row">{row.title}</th>
                {LEARNING_WORD_STAGES.map((stage) => (
                  <td key={stage}>
                    {row.bestByStage[stage] === undefined
                      ? "–"
                      : `${row.bestByStage[stage]} %`}
                  </td>
                ))}
                <td>{row.rounds}</td>
                <td>
                  {row.lastPracticedAt
                    ? dateFormat.format(new Date(row.lastPracticedAt))
                    : "–"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <dl className={styles.stats} aria-label="Kennzahlen">
        <div className={styles.stat}>
          <dt>Trainierte Wörter</dt>
          <dd>{stats.trainedWords}</dd>
        </div>
        <div className={styles.stat}>
          <dt>Sichere Wörter</dt>
          <dd>{stats.secureWords}</dd>
        </div>
        <div className={styles.stat}>
          <dt>Wiederholungen</dt>
          <dd>{stats.repetitions}</dd>
        </div>
        <div className={styles.stat}>
          <dt>Abgeschlossene Runden</dt>
          <dd>{stats.rounds}</dd>
        </div>
      </dl>
      <p className={styles.notice} role="note">
        {WORD_WORKSHEET_NOTICE}
      </p>
    </section>
  );
}
