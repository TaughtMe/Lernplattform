"use client";

import { AcceptedAnswers } from "../../../ui/accepted-answers";
import styles from "../lernbox-screen.module.css";
import type { LbImportRow } from "./types";

export type ImportSkippedLine = {
  lineNumber: number;
  line: string;
  reason: string;
};
export type ImportPreviewData = {
  rows: readonly LbImportRow[];
  skipped: readonly ImportSkippedLine[];
  /** Die Kopfzeile der Vorlage wurde erkannt und nicht übernommen. */
  headerSkipped: boolean;
  /** Zeilen mit einem Komma außerhalb von Klammern (G-003); 0 oder fehlend: kein Schalter. */
  commaCandidates?: number;
};

const SHOWN_PAIRS = 5;
const SHOWN_SKIPPED = 8;

/**
 * Vorschau vor dem Übernehmen: erkannte Paare, was zusätzlich als richtig gilt
 * (G-003), und übersprungene Zeilen. Enthalten Zeilen ein Komma, bietet sie den
 * Schalter „Komma trennt Alternativen“ an (Standard: aus).
 */
export function ImportPreview({
  preview,
  commaSeparates = false,
  onCommaSeparates,
}: {
  preview: ImportPreviewData;
  commaSeparates?: boolean;
  onCommaSeparates?: (value: boolean) => void;
}) {
  const { rows, skipped, headerSkipped, commaCandidates = 0 } = preview;
  const more = rows.length - SHOWN_PAIRS;
  return (
    <div className={styles.importPreview}>
      <h3 className={styles.importCount}>
        {rows.length === 0
          ? "Keine Vokabel erkannt"
          : rows.length === 1
            ? "1 Vokabel erkannt"
            : `${rows.length} Vokabeln erkannt`}
      </h3>
      {rows.length ? (
        <ul className={styles.importPairs} aria-label="Erste erkannte Vokabeln">
          {rows.slice(0, SHOWN_PAIRS).map((row, index) => (
            <li key={index} className={styles.importPair}>
              <span className={styles.importPairText}>
                {row.question} → {row.answer}
                {/* Beide Richtungen: Vorder- und Rückseite zeigen ihre Alternativen. */}
                <AcceptedAnswers text={row.question} />
                <AcceptedAnswers text={row.answer} />
              </span>
              {row.tag ? (
                <span className={styles.importTag}>{row.tag}</span>
              ) : null}
            </li>
          ))}
          {more > 0 ? (
            <li className={styles.importMore}>… und {more} weitere</li>
          ) : null}
        </ul>
      ) : null}
      {commaCandidates > 0 && onCommaSeparates ? (
        <label className={styles.importComma}>
          <input
            type="checkbox"
            checked={commaSeparates}
            onChange={(event) => onCommaSeparates(event.target.checked)}
          />
          <span>Komma trennt Alternativen (groß, riesig → groß | riesig)</span>
        </label>
      ) : null}
      {headerSkipped ? (
        <p className={styles.importNote}>
          Die Kopfzeile der Vorlage wurde nicht als Vokabel gezählt.
        </p>
      ) : null}
      {skipped.length ? (
        <div className={styles.importSkipped}>
          <h4 className={styles.importSkippedTitle}>
            {skipped.length === 1
              ? "1 Zeile wird übersprungen"
              : `${skipped.length} Zeilen werden übersprungen`}
          </h4>
          <ul className={styles.importSkippedList}>
            {skipped.slice(0, SHOWN_SKIPPED).map((entry) => (
              <li key={entry.lineNumber}>
                Zeile {entry.lineNumber}: {entry.reason}
                {entry.line ? (
                  <span className={styles.importSkippedLine}>
                    {" "}
                    („{entry.line}“)
                  </span>
                ) : null}
              </li>
            ))}
            {skipped.length > SHOWN_SKIPPED ? (
              <li>… und {skipped.length - SHOWN_SKIPPED} weitere</li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
