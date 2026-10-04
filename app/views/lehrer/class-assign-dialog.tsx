"use client";

import { useId } from "react";
import { ModalDialog } from "./modal-dialog";
import styles from "./class-assign-dialog.module.css";

export type AssignClass = {
  id: string;
  name: string;
  /** Zweite Zeile, z. B. das Fach. */
  sub: string;
  checked: boolean;
};

export type ClassAssignDialogProps = {
  open: boolean;
  /** Titel des Inhalts, der zugeordnet wird. */
  title: string;
  classes: readonly AssignClass[];
  /** Hinweis unter der Liste. */
  note: string;
  /** Text, wenn es noch keine Klasse gibt. */
  emptyText?: string;
  busy?: boolean;
  onToggle?: (id: string) => void;
  onSave?: () => void;
  onClose?: () => void;
};

/**
 * Dialog „Klassen zuordnen“ (Ergänzung zur Vorlage, Entscheidung E4): alle
 * aktiven Klassen als Häkchenliste. Ein Inhalt kann zu mehreren Klassen gehören.
 */
export function ClassAssignDialog(props: ClassAssignDialogProps) {
  const noteId = useId();
  return (
    <ModalDialog
      open={props.open}
      label="Klassen zuordnen"
      className={styles.dialog}
      onClose={() => props.onClose?.()}
    >
      <form
        className={styles.inner}
        onSubmit={(event) => {
          event.preventDefault();
          props.onSave?.();
        }}
      >
        <span className={styles.titles}>
          <span className={styles.title}>Klassen zuordnen</span>
          <span className={styles.subtitle}>{props.title}</span>
        </span>
        {props.classes.length === 0 ? (
          <p className={styles.empty}>
            {props.emptyText ?? "Es gibt noch keine Klasse."}
          </p>
        ) : (
          <ul className={styles.list} aria-describedby={noteId}>
            {props.classes.map((item) => (
              <li key={item.id}>
                <label className={styles.row}>
                  <input
                    type="checkbox"
                    className={styles.box}
                    checked={item.checked}
                    onChange={() => props.onToggle?.(item.id)}
                  />
                  <span className={styles.name}>{item.name}</span>
                  <span className={styles.sub}>{item.sub}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
        <p id={noteId} className={styles.note}>
          {props.note}
        </p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancel}
            onClick={props.onClose}
          >
            Abbrechen
          </button>
          <button type="submit" className={styles.save} disabled={props.busy}>
            Speichern
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}
