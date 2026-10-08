"use client";

import { useState } from "react";
import { Button, EmptyState } from "../../ui/primitives";
import styles from "./worksheet-screen.module.css";

export type WorksheetRow = {
  textId: string;
  title: string;
  difficulty: string;
  phenomena: string;
  lastPracticedAt: string | undefined;
  sessions: number;
  bestPercent: number | undefined;
};

export const WORKSHEET_NOTICE =
  "Dieser Laufzettel wurde auf deinem Gerät erstellt. Er ist eine Übersicht und kein Prüfungsnachweis.";

const dateFormat = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" });

/**
 * Druckbarer Laufzettel. Das Namensfeld ist nur Anzeige und bleibt im
 * Speicher dieser Seite: es wird weder gespeichert noch weitergegeben.
 */
export function WorksheetScreen({
  rows,
  createdAt,
  onPrint,
}: {
  rows: readonly WorksheetRow[];
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
        Laufzettel Textbox
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
        <EmptyState title="Noch keine Textbox-Übung abgeschlossen">
          Sobald du einen Text in allen vier Durchgängen geschafft hast,
          erscheint er hier.
        </EmptyState>
      ) : (
        <table className={styles.table}>
          <caption className="ui-sr-only">Bearbeitete Texte</caption>
          <thead>
            <tr>
              <th scope="col">Text</th>
              <th scope="col">Schwierigkeit</th>
              <th scope="col">Schwerpunkt</th>
              <th scope="col">Letzte Übung</th>
              <th scope="col">Übungen (Wiederholungen)</th>
              <th scope="col">Bestwert</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.textId}>
                <th scope="row">{row.title}</th>
                <td>{row.difficulty}</td>
                <td>{row.phenomena}</td>
                <td>
                  {row.lastPracticedAt
                    ? dateFormat.format(new Date(row.lastPracticedAt))
                    : "–"}
                </td>
                <td>{row.sessions}</td>
                <td>
                  {row.bestPercent === undefined ? "–" : `${row.bestPercent} %`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className={styles.notice} role="note">
        {WORKSHEET_NOTICE}
      </p>
    </section>
  );
}
