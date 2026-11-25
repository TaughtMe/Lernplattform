import Link from "next/link";
import { cx } from "../views/parts/parts";
import { ManageIcon, manageStyles as m } from "../views/lehrer/manage-parts";
import styles from "../views/lehrer/transfer-screen.module.css";

/** So viele Paare zeigt die Vorschau; der Rest steht im Editor. */
export const PREVIEW_ROWS = 8;

/**
 * Schreibgeschützte Vorschau eines Vokabelpakets in der Freigabe. Bearbeitet
 * wird nur im Live-Raum (Entscheidung 87); hier gibt es Vorschau, „Bearbeiten“
 * als Verweis, Löschen und Freigeben.
 */
export function VocabularyPreview({
  title,
  pairs,
  rows,
  leftLabel,
  rightLabel,
  editHref,
  live,
  busy,
  shareDisabled,
  onShare,
  onDelete,
}: {
  title: string;
  pairs: number;
  rows: ReadonlyArray<{ a: string; b: string }>;
  leftLabel: string;
  rightLabel: string;
  editHref: string;
  live: boolean;
  busy: boolean;
  shareDisabled: boolean;
  onShare: () => void;
  onDelete: () => void;
}) {
  const shown = rows.slice(0, PREVIEW_ROWS);
  const more = Math.max(0, pairs - shown.length);
  return (
    <section className={m.card} aria-label="Vokabelpaket">
      <div className={styles.editorBody}>
        <h2 className={styles.listTitle}>{title}</h2>
        <div className={styles.words}>
          <div className={styles.wordsHead}>
            <span className={m.label}>Vokabeln</span>
            <span className={m.count}>{pairs} Paare</span>
          </div>
          <div className={styles.table} role="group" aria-label="Vorschau">
            <div className={styles.tableHead} aria-hidden="true">
              <span />
              <span>{leftLabel}</span>
              <span>{rightLabel}</span>
              <span className={styles.tagCol} />
              <span />
            </div>
            <div className={styles.tableBody}>
              {shown.map((row, index) => (
                <div key={index} className={styles.tableRow}>
                  <span className={styles.rowNo} aria-hidden="true">
                    {index + 1}
                  </span>
                  <span>{row.a}</span>
                  <span>{row.b}</span>
                  <span className={styles.tagCell} />
                  <span />
                </div>
              ))}
            </div>
          </div>
          {more > 0 ? (
            <span className={m.hint}>… und {more} weitere</span>
          ) : null}
        </div>
      </div>
      <div className={styles.editorFoot}>
        <Link href={editHref} className={cx(m.soft, m.small)}>
          Bearbeiten
        </Link>
        <button
          type="button"
          className={cx(m.iconBtn, m.iconDanger, "package-delete")}
          aria-label="Paket löschen"
          title="Paket löschen"
          onClick={onDelete}
        >
          <ManageIcon name="trash" />
        </button>
        {live ? (
          <button
            type="button"
            className={cx(m.soft, styles.reshare)}
            disabled={busy || shareDisabled}
            onClick={onShare}
          >
            {busy ? "Wird verschlüsselt …" : "Neu freigeben"}
          </button>
        ) : (
          <button
            type="button"
            className={cx(m.green, styles.share)}
            disabled={busy || shareDisabled}
            onClick={onShare}
          >
            {busy ? "Wird verschlüsselt …" : "Für Schüler freigeben"}
          </button>
        )}
      </div>
    </section>
  );
}
