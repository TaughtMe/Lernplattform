"use client";

import { Icon } from "../../../ui/icons";
import { cx } from "../../parts/parts";
import { CardRow } from "./card-row";
import { PlusMenu } from "./home";
import { Manage } from "./manage";
import type { LbEdit, LbSortKey, LernBoxScreenProps } from "./types";
import styles from "../lernbox-screen.module.css";

const COLUMNS: ReadonlyArray<[LbSortKey, string]> = [
  ["question", "Vorderseite"],
  ["answer", "Rückseite"],
  ["deck", "Stapel"],
  ["tag", "Tag"],
  ["box", "Box"],
];

export function Edit(props: LernBoxScreenProps & { edit: LbEdit }) {
  const { edit } = props;
  return (
    <div className={styles.edit}>
      <header className={styles.editHead}>
        <button
          type="button"
          className={styles.backText}
          onClick={props.onBack}
        >
          <Icon name="back" size={18} strokeWidth={2.2} /> LernBox
        </button>
        <span className={styles.editTitles}>
          <h1 className={styles.editTitle}>Alle Vokabeln</h1>
          <span className={styles.sheetSubtitle}>
            {edit.cards.length} von {edit.total} Vokabeln
            <span className={styles.wideOnly}>
              {" "}
              · Spaltenkopf antippen zum Sortieren · Stift zum Ändern
            </span>
          </span>
        </span>
        <PlusMenu {...props} />
      </header>

      {props.notice ? (
        <p className={styles.notice} role="status">
          {props.notice}
        </p>
      ) : null}

      <div className={styles.tools}>
        <input
          className={cx(styles.input, styles.search)}
          type="search"
          placeholder="Suchen …"
          aria-label="Vokabeln durchsuchen"
          autoComplete="off"
          value={edit.query}
          onChange={(event) => props.onQuery?.(event.target.value)}
        />
        <div className={styles.chips} role="group" aria-label="Stapel filtern">
          {[{ id: "all", title: "Alle" }, ...props.decks].map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={cx(
                styles.chip,
                edit.filter === entry.id && styles.chipOn,
              )}
              aria-pressed={edit.filter === entry.id}
              onClick={() => props.onFilter?.(entry.id)}
            >
              {entry.title.split(" · ")[0]}
            </button>
          ))}
        </div>
        <label className={cx(styles.sortSelect, styles.narrowOnly)}>
          <span className={styles.fieldLabel}>Sortieren nach</span>
          <select
            className={styles.select}
            value={edit.sortKey ?? ""}
            onChange={(event) => {
              const key = event.target.value as LbSortKey | "";
              if (key) props.onSort?.(key);
            }}
          >
            <option value="">Reihenfolge der Eingabe</option>
            {COLUMNS.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {edit.cards.length === 0 ? (
        <p className={styles.empty}>
          {edit.query
            ? "Keine Vokabel passt zur Suche."
            : "Noch keine Vokabeln. Tippe auf das Plus, um welche einzutragen."}
        </p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              {COLUMNS.map(([key, label]) => (
                <th
                  key={key}
                  scope="col"
                  aria-sort={
                    edit.sortKey === key
                      ? edit.sortDir === 1
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                >
                  <button
                    type="button"
                    className={cx(
                      styles.sortButton,
                      edit.sortKey === key && styles.sortActive,
                    )}
                    title="Sortieren"
                    onClick={() => props.onSort?.(key)}
                  >
                    {label}
                    <span className={styles.arrow} aria-hidden="true">
                      {edit.sortKey === key
                        ? edit.sortDir === 1
                          ? "↑"
                          : "↓"
                        : "↕"}
                    </span>
                  </button>
                </th>
              ))}
              <th scope="col">
                <span className={styles.srOnly}>Aktionen</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {edit.cards.map((card) => (
              <CardRow key={card.id} card={card} {...props} />
            ))}
          </tbody>
        </table>
      )}

      <Manage {...props} />
    </div>
  );
}
