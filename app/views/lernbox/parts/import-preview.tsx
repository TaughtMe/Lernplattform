"use client";

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
};

const SHOWN_PAIRS = 5;
const SHOWN_SKIPPED = 8;

/** Vorschau vor dem Übernehmen: erkannte Paare und übersprungene Zeilen. */
export function ImportPreview({ preview }: { preview: ImportPreviewData }) {
  const { rows, skipped, headerSkipped } = preview;
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
