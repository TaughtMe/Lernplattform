"use client";

import { useState } from "react";
import { Icon } from "../../../ui/icons";
import { cx } from "../../parts/parts";
import styles from "../teacher-dictation-screen.module.css";
import type { TeacherDictationScreenProps } from "./types";

const NEW_CLASS = "__neu__";

/** Titel, Klasse, „Speichern“ und Mülleimer (nur mit den Ablage-Props). */
export function LibraryBar(props: TeacherDictationScreenProps) {
  const [confirming, setConfirming] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newClass, setNewClass] = useState("");
  const classChoice = props.classChoice;
  const showClass = Boolean(props.onSave && classChoice && props.onCreateClass);
  if (!props.onTitle && !props.onSave) return null;
  return (
    <div className={styles.libraryBar}>
      <label className={styles.libraryTitle}>
        <span className={styles.label}>Titel</span>
        <input
          type="text"
          className={styles.libraryInput}
          value={props.title ?? ""}
          maxLength={300}
          placeholder={
            props.titlePlaceholder ?? "Wird aus dem Text vorgeschlagen"
          }
          onChange={(event) => props.onTitle?.(event.target.value)}
        />
      </label>
      {showClass && classChoice ? (
        <label className={styles.libraryClass}>
          <span className={styles.label}>Klasse</span>
          <select
            className={styles.libraryInput}
            value={creating ? NEW_CLASS : classChoice.value}
            onChange={(event) => {
              if (event.target.value === NEW_CLASS) {
                setCreating(true);
                return;
              }
              setCreating(false);
              classChoice.onChange(event.target.value);
            }}
          >
            <option value="">Keine Klasse</option>
            {classChoice.options.map(({ id, name }) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
            <option value={NEW_CLASS}>Neue Klasse …</option>
          </select>
        </label>
      ) : null}
      {showClass && creating ? (
        <span className={styles.libraryNewClass}>
          <input
            type="text"
            className={styles.libraryInput}
            aria-label="Name der neuen Klasse"
            placeholder="z. B. 7b"
            maxLength={120}
            value={newClass}
            onChange={(event) => setNewClass(event.target.value)}
          />
          <button
            type="button"
            className={styles.libraryButton}
            disabled={!newClass.trim()}
            onClick={() => {
              void Promise.resolve(props.onCreateClass?.(newClass)).then(() => {
                setCreating(false);
                setNewClass("");
              });
            }}
          >
            Klasse anlegen
          </button>
        </span>
      ) : null}
      {props.onSave ? (
        <button
          type="button"
          className={styles.libraryButton}
          onClick={props.onSave}
        >
          Speichern
        </button>
      ) : null}
      {props.onDelete && !confirming ? (
        <button
          type="button"
          className={cx(styles.libraryButton, styles.libraryIcon)}
          aria-label="Aus der Ablage löschen"
          title="Löschen"
          onClick={() => setConfirming(true)}
        >
          <Icon name="trash" size={18} />
        </button>
      ) : null}
      {props.onDelete && confirming ? (
        <span
          className={styles.libraryConfirm}
          role="group"
          aria-label="Löschen bestätigen"
        >
          <span>Wirklich aus der Ablage löschen?</span>
          <button
            type="button"
            className={cx(styles.libraryButton, styles.libraryDanger)}
            onClick={() => {
              setConfirming(false);
              props.onDelete?.();
            }}
          >
            Ja, löschen
          </button>
          <button
            type="button"
            className={styles.libraryButton}
            onClick={() => setConfirming(false)}
          >
            Abbrechen
          </button>
        </span>
      ) : null}
      {props.libraryNotice ? (
        <p className={styles.libraryNotice} role="status">
          {props.libraryNotice}
        </p>
      ) : null}
    </div>
  );
}
