"use client";

import { useId, useRef, type ReactNode } from "react";
import { cx } from "../parts/parts";
import { ManageIcon, manageStyles as m } from "./manage-parts";
import { ModalDialog } from "./modal-dialog";
import styles from "./transfer-screen.module.css";
import {
  completePairs,
  pasteRows,
  removeRow,
  setCell,
  type VocabularyRowValue,
} from "./vocabulary-rows";

/**
 * Freigabe an Schüler nach Lehrerbereich v2 (17b). Reine Bausteine: Pakete,
 * laufende Freigaben, Editor und QR kommen als Props, Zeiten als fertiger
 * Text.
 */

/** Pakete links, Editor rechts (mobil untereinander). */
export function TransferLayout({
  side,
  children,
}: {
  side: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={styles.layout}>
      <div className={styles.column}>{side}</div>
      <div className={styles.column}>{children}</div>
    </div>
  );
}

export type PackageItem = {
  id: string;
  title: string;
  /** z. B. „7 Paare · geändert 14.10.“ */
  meta: string;
  /** Restzeit einer laufenden Freigabe, z. B. „noch 6 h“. */
  live?: string | undefined;
};

/** „Vokabelpakete“: gespeicherte Pakete als Liste, dazu die Bibliothek. */
export function PackageList({
  items,
  selectedId,
  onPick,
  onNew,
  onExport,
  onImport,
}: {
  items: readonly PackageItem[];
  selectedId: string;
  onPick?: (id: string) => void;
  onNew?: () => void;
  onExport?: () => void;
  onImport?: (file: File) => void;
}) {
  const titleId = useId();
  const input = useRef<HTMLInputElement>(null);
  return (
    <section className={cx(m.card, styles.listCard)} aria-labelledby={titleId}>
      <div className={styles.listHead}>
        <h2 className={styles.listTitle} id={titleId}>
          Vokabelpakete
        </h2>
        <button
          type="button"
          className={cx(m.soft, m.small)}
          aria-label="Neues Vokabelpaket"
          onClick={onNew}
        >
          + Neu
        </button>
      </div>
      {items.length === 0 ? (
        <p className={styles.listEmpty}>Noch keine gespeicherten Pakete.</p>
      ) : (
        <ul className={styles.packages}>
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={cx(
                  styles.package,
                  item.id === selectedId && styles.packageOn,
                )}
                aria-current={item.id === selectedId ? "true" : undefined}
                onClick={() => onPick?.(item.id)}
              >
                <span className={styles.packageText}>
                  <span className={styles.packageTitle}>{item.title}</span>
                  <span className={styles.packageMeta}>{item.meta}</span>
                </span>
                {item.live ? (
                  <span className={styles.liveBadge}>
                    <span className="ui-sr-only">Freigegeben, </span>
                    {item.live}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className={styles.libraryRow}>
        <span className={styles.libraryLabel}>Bibliothek</span>
        <button
          type="button"
          className={m.link}
          aria-label="Bibliothek exportieren"
          disabled={items.length === 0}
          onClick={onExport}
        >
          Exportieren
        </button>
        <button
          type="button"
          className={m.link}
          aria-label="Bibliothek importieren"
          onClick={() => input.current?.click()}
        >
          Importieren
        </button>
        <input
          ref={input}
          hidden
          type="file"
          accept="application/json,.json"
          aria-label="Datei mit Lehrkraftbibliothek auswählen"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) onImport?.(file);
          }}
        />
      </div>
    </section>
  );
}

export type LiveTransferItem = {
  id: string;
  title: string;
  /** Zweite Zeile, z. B. „7 Paare · gültig bis 20:05“. */
  meta: string;
  /** z. B. „noch 6 h · bis 20:05“. */
  left: string;
  /** Verbleibender Anteil der Gültigkeit, 0–1. */
  fraction: number;
};

/** „Läuft gerade“: aktive Freigaben mit Restzeit. */
export function LiveTransfers({
  items,
  actionLabel,
  onAction,
}: {
  items: readonly LiveTransferItem[];
  /** Knopf je Freigabe, z. B. „QR zeigen“. */
  actionLabel?: string;
  onAction?: (id: string) => void;
}) {
  const titleId = useId();
  return (
    <section className={cx(m.card, styles.liveCard)} aria-labelledby={titleId}>
      <div className={styles.liveHead}>
        <span className={styles.liveDot} aria-hidden="true" />
        <h2 className={styles.liveTitle} id={titleId}>
          Läuft gerade
        </h2>
        <span className={styles.liveCount}>{items.length}</span>
      </div>
      {items.length === 0 ? (
        <span className={styles.liveEmpty}>
          Keine aktive Freigabe. Nach „Für Schüler freigeben“ erscheint sie
          hier.
        </span>
      ) : (
        <ul className={styles.liveList}>
          {items.map((item) => (
            <li key={item.id} className={styles.liveItem}>
              <span className={styles.liveText}>
                <span className={styles.liveName}>{item.title}</span>
                <span className={styles.packageMeta}>{item.meta}</span>
              </span>
              <span className={styles.bar} aria-hidden="true">
                <span
                  className={styles.barFill}
                  style={{
                    width: `${Math.round(Math.min(1, Math.max(0, item.fraction)) * 100)}%`,
                  }}
                />
              </span>
              <span className={styles.liveRow}>
                <span className={styles.liveLeft}>{item.left}</span>
                {actionLabel ? (
                  <button
                    type="button"
                    className={styles.liveAction}
                    aria-label={`${actionLabel}: ${item.title}`}
                    onClick={() => onAction?.(item.id)}
                  >
                    {actionLabel}
                  </button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export type LanguageOption = { locale: string; label: string };

export type SaveState = "saved" | "saving" | "unsaved";

/** Editor eines Pakets: Titel, Sprachen, Vokabeltabelle, Freigabe. */
export function PackageEditor({
  title,
  languages,
  left,
  right,
  rows,
  save,
  live,
  busy = false,
  shareDisabled = false,
  onTitle,
  onLeft,
  onRight,
  onSwap,
  onRows,
  onImportFile,
  onShare,
  onDelete,
}: {
  title: string;
  languages: readonly LanguageOption[];
  /** Kennungen der Sprachen 1 und 2. */
  left: string;
  right: string;
  rows: readonly VocabularyRowValue[];
  save: SaveState;
  /** Das Paket ist gerade freigegeben. */
  live: boolean;
  busy?: boolean;
  shareDisabled?: boolean;
  onTitle?: (value: string) => void;
  onLeft?: (locale: string) => void;
  onRight?: (locale: string) => void;
  onSwap?: () => void;
  onRows?: (rows: VocabularyRowValue[]) => void;
  onImportFile?: (file: File) => void;
  onShare?: () => void;
  /** Ohne Angabe gibt es keinen Löschen-Knopf (z. B. für ein neues Paket). */
  onDelete?: (() => void) | undefined;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const label = (locale: string) =>
    languages.find((language) => language.locale === locale)?.label ?? locale;
  const pairs = completePairs(rows);
  const shown = [...rows, { a: "", b: "", tag: "" }];
  const select = (
    name: string,
    value: string,
    onChange: ((locale: string) => void) | undefined,
  ) => (
    <label className={cx(m.field, styles.lang)}>
      {name}
      <select
        className={m.select}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
      >
        {languages.map((language) => (
          <option key={language.locale} value={language.locale}>
            {language.label}
          </option>
        ))}
      </select>
    </label>
  );
  const cell = (
    index: number,
    field: keyof VocabularyRowValue,
    value: string,
    ariaLabel: string,
    placeholder: string,
    className?: string,
  ) => (
    <input
      className={cx(m.input, styles.cell, className)}
      value={value}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(event) =>
        onRows?.(setCell(rows, index, field, event.target.value))
      }
      onPaste={(event) => {
        const next = pasteRows(
          rows,
          index,
          event.clipboardData.getData("text"),
        );
        if (!next) return;
        event.preventDefault();
        onRows?.(next);
      }}
    />
  );
  return (
    <section className={m.card} aria-label="Vokabelpaket">
      <div className={styles.editorBody}>
        <label className={m.field}>
          Titel des Pakets
          <input
            className={cx(m.input, styles.titleInput)}
            value={title}
            maxLength={300}
            onChange={(event) => onTitle?.(event.target.value)}
          />
        </label>
        <div className={styles.words}>
          <div className={styles.langs}>
            {select("Sprache 1", left, onLeft)}
            <button
              type="button"
              className={styles.swap}
              aria-label="Sprachen tauschen"
              onClick={onSwap}
            >
              ⇄
            </button>
            {select("Sprache 2", right, onRight)}
            <span className={styles.langSpacer} />
          </div>
          <div className={styles.wordsHead}>
            <span className={m.label}>Vokabeln</span>
            <span className={m.count}>{pairs} Paare</span>
            <button
              type="button"
              className={cx(m.soft, m.small, styles.importButton)}
              onClick={() => fileInput.current?.click()}
            >
              <ManageIcon name="upload" />
              Datei importieren
            </button>
            <input
              ref={fileInput}
              hidden
              type="file"
              accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
              aria-label="Datei mit Vokabelpaaren auswählen"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) onImportFile?.(file);
              }}
            />
          </div>
          <div className={styles.table} role="group" aria-label="Vokabeln">
            <div className={styles.tableHead} aria-hidden="true">
              <span />
              <span>{label(left)}</span>
              <span>{label(right)}</span>
              <span className={styles.tagCol}>Tag</span>
              <span />
            </div>
            <div className={styles.tableBody}>
              {shown.map((row, index) => {
                const last = index === rows.length;
                const no = index + 1;
                return (
                  <div key={index} className={styles.tableRow}>
                    <span className={styles.rowNo} aria-hidden="true">
                      {no}
                    </span>
                    {cell(
                      index,
                      "a",
                      row.a,
                      `${label(left)}, Zeile ${no}`,
                      last ? "neues Wort" : "",
                    )}
                    {cell(
                      index,
                      "b",
                      row.b,
                      `${label(right)}, Zeile ${no}`,
                      last ? "Übersetzung" : "",
                    )}
                    {cell(
                      index,
                      "tag",
                      row.tag,
                      `Tag, Zeile ${no}`,
                      "optional",
                      styles.tagCell,
                    )}
                    <button
                      type="button"
                      tabIndex={-1}
                      className={cx(
                        m.iconBtn,
                        m.iconBare,
                        styles.rowDelete,
                        last && styles.rowDeleteHidden,
                      )}
                      aria-label={`Zeile ${no} entfernen`}
                      onClick={() => onRows?.(removeRow(rows, index))}
                    >
                      <ManageIcon name="trash" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
          <span className={m.hint}>
            Mit Tab springst du ins nächste Feld. In der letzten Zeile kommt
            beim Tippen automatisch eine neue dazu. Eine kopierte Liste aus
            Excel oder Word kannst du in die erste Box einfügen.
          </span>
        </div>
      </div>
      <div className={styles.editorFoot}>
        {save === "saved" ? (
          <span className={m.saved}>
            <ManageIcon name="check" size={15} strokeWidth={2.4} />
            Lokal gespeichert
          </span>
        ) : (
          <span className={cx(m.saved, styles.unsaved)}>
            {save === "saving"
              ? "Wird gespeichert …"
              : "Noch nicht gespeichert"}
          </span>
        )}
        {onDelete ? (
          <button
            type="button"
            className={cx(m.iconBtn, m.iconDanger, "package-delete")}
            aria-label="Paket löschen"
            title="Paket löschen"
            onClick={onDelete}
          >
            <ManageIcon name="trash" />
          </button>
        ) : null}
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

/** Dunkler Kasten unter dem Paket: QR, Code und „Groß zeigen“. */
export function TransferResult({
  qr,
  status,
  code,
  onBig,
}: {
  /** Der QR-Code (z. B. `QRCodeSVG`). */
  qr: ReactNode;
  /** z. B. „noch 24 h · bis morgen 20:05“. */
  status: string;
  /** Code in Vierergruppen. */
  code: string;
  onBig?: () => void;
}) {
  const titleId = useId();
  return (
    <section
      className={styles.result}
      aria-labelledby={titleId}
      aria-live="polite"
    >
      <div className={styles.qr}>{qr}</div>
      <div className={styles.resultText}>
        <span className={styles.resultStatus}>Freigegeben · {status}</span>
        <h2 className={styles.resultTitle} id={titleId}>
          QR-Code scannen
        </h2>
        <p className={styles.resultHint}>
          Schüler tippen in ihrer LernBox auf „Code eingeben“ und scannen. Ohne
          Kamera geht es mit dem Code.
        </p>
        <span className={styles.code}>{code}</span>
        <div className={styles.resultActions}>
          <button type="button" className={m.gold} onClick={onBig}>
            <ManageIcon name="expand" />
            Groß zeigen
          </button>
        </div>
      </div>
    </section>
  );
}

/** „Groß zeigen“: QR und Code bildschirmfüllend, z. B. für den Beamer. */
export function TransferBig({
  open,
  qr,
  code,
  title,
  onClose,
}: {
  open: boolean;
  qr: ReactNode;
  code: string;
  title: string;
  onClose: () => void;
}) {
  return (
    <ModalDialog
      open={open}
      label={`QR-Code für ${title}`}
      className={styles.big}
      onClose={onClose}
    >
      <div className={styles.bigInner}>
        <h2 className={styles.resultTitle}>{title}</h2>
        <div className={styles.bigQr}>{qr}</div>
        <span className={styles.bigCode}>{code}</span>
        <button type="button" className={m.gold} onClick={onClose}>
          Schließen
        </button>
      </div>
    </ModalDialog>
  );
}
