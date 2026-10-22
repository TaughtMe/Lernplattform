"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import { Icon } from "../../../ui/icons";
import styles from "../lernbox-screen.module.css";

export type ImportTypedRow = {
  id: string;
  question: string;
  answer: string;
  tag: string;
};
type Field = "question" | "answer" | "tag";

/**
 * Eintippen: Zeilen mit je zwei Feldern (Vorderseite, Rückseite) und
 * optionalem Tag. Enter springt weiter; in der letzten Zeile legt es eine neue
 * an und setzt den Cursor hinein.
 */
export function ImportRows({
  rows,
  focusId,
  onChange,
  onAdd,
  onRemove,
}: {
  rows: readonly ImportTypedRow[];
  /** Zeile, deren Vorderseite nach dem Anlegen den Fokus bekommt. */
  focusId: string | null;
  onChange: (id: string, field: Field, value: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  const inputs = useRef(new Map<string, HTMLInputElement>());
  const key = (id: string, field: Field) => `${id}:${field}`;

  useEffect(() => {
    if (focusId) inputs.current.get(key(focusId, "question"))?.focus();
  }, [focusId]);

  function onEnter(
    event: KeyboardEvent<HTMLInputElement>,
    index: number,
    field: Field,
  ) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    // Enter schickt hier nichts ab, sondern springt zum nächsten Feld.
    event.preventDefault();
    const row = rows[index];
    if (!row) return;
    if (field === "question") {
      inputs.current.get(key(row.id, "answer"))?.focus();
      return;
    }
    const next = rows[index + 1];
    if (next) inputs.current.get(key(next.id, "question"))?.focus();
    else onAdd();
  }

  const field = (
    row: ImportTypedRow,
    index: number,
    name: Field,
    label: string,
    placeholder: string,
  ) => (
    <input
      ref={(element) => {
        const map = inputs.current;
        if (element) map.set(key(row.id, name), element);
        else map.delete(key(row.id, name));
      }}
      className={`${styles.input} ${styles.importInput}`}
      aria-label={`${label}, Zeile ${index + 1}`}
      placeholder={placeholder}
      maxLength={name === "tag" ? 80 : 300}
      autoComplete="off"
      autoCapitalize="off"
      autoCorrect="off"
      spellCheck={false}
      value={row[name]}
      onChange={(event) => onChange(row.id, name, event.target.value)}
      onKeyDown={(event) => onEnter(event, index, name)}
    />
  );

  return (
    <div className={styles.importRowsBlock}>
      <ol className={styles.importRows} aria-label="Vokabeln zum Eintippen">
        {rows.map((row, index) => (
          <li key={row.id} className={styles.importRow}>
            <span className={styles.importNo} aria-hidden="true">
              {index + 1}
            </span>
            <span className={styles.importCells}>
              {field(row, index, "question", "Vorderseite", "Vorderseite")}
              {field(row, index, "answer", "Rückseite", "Rückseite")}
              {field(row, index, "tag", "Tag", "Tag (optional)")}
            </span>
            <button
              type="button"
              className={styles.importDelete}
              aria-label={`Zeile ${index + 1} löschen`}
              onClick={() => onRemove(row.id)}
            >
              <Icon name="trash" size={17} />
            </button>
          </li>
        ))}
      </ol>
      <button type="button" className={styles.ghostButton} onClick={onAdd}>
        <Icon name="plus" size={16} /> Weitere Zeile
      </button>
    </div>
  );
}
