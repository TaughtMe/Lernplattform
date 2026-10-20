"use client";

import { useState } from "react";
import { Icon } from "../../../ui/icons";
import { cx } from "../../parts/parts";
import styles from "../dictation-editor.module.css";
import { MathEditor } from "../math-editor";
import { VocabularyEditor } from "../vocabulary-editor";
import { VocabularyPicker } from "../vocabulary-picker";
import { SPLITS } from "./constants";
import { KIND_LABELS } from "./editor-options";
import type { ContentKind, TeacherDictationScreenProps } from "./types";

const PLACEHOLDERS: Record<ContentKind, string> = {
  text: "Text einfügen oder tippen. Er wird automatisch in Abschnitte geteilt.",
  vocabulary: "Eine Vokabel pro Zeile: Wort ; Übersetzung",
  math: "Eine Aufgabe pro Zeile, z. B. 7 + 5",
};

/** Titel, beim abgelegten Inhalt mit „Aus der Ablage löschen“ (Bestätigung). */
function TitleRow(props: TeacherDictationScreenProps) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className={styles.titleBlock}>
      <div className={styles.titleRow}>
        <input
          type="text"
          className={styles.titleInput}
          aria-label="Titel"
          value={props.title ?? ""}
          maxLength={300}
          placeholder={
            props.titlePlaceholder ?? "Wird aus dem Text vorgeschlagen"
          }
          onChange={(event) => props.onTitle?.(event.target.value)}
        />
        {props.onDelete && !confirming ? (
          <button
            type="button"
            className={styles.trash}
            aria-label="Aus der Ablage löschen"
            title="Aus der Ablage löschen"
            onClick={() => setConfirming(true)}
          >
            <Icon name="trash" size={19} />
          </button>
        ) : null}
      </div>
      {props.onDelete && confirming ? (
        <div
          className={styles.confirm}
          role="group"
          aria-label="Löschen bestätigen"
        >
          <span>Wirklich aus der Ablage löschen?</span>
          <button
            type="button"
            className={cx(styles.smallButton, styles.danger)}
            onClick={() => {
              setConfirming(false);
              props.onDelete?.();
            }}
          >
            Ja, löschen
          </button>
          <button
            type="button"
            className={styles.smallButton}
            onClick={() => setConfirming(false)}
          >
            Abbrechen
          </button>
        </div>
      ) : null}
      {props.quizFromLibrary ? (
        <p className={styles.inlineNote}>
          Wird beim Start als neue Abfrage abgelegt. Deine Vokabelpakete bleiben
          unverändert.
        </p>
      ) : null}
    </div>
  );
}

/**
 * Schritt 1 „Inhalt“ (Design 14b): links Titel und Eingabe, rechts die
 * Abschnitte, wie die Schüler sie sehen. Vokabeln und Mathe behalten ihre
 * eigenen Editoren (Vokabelheft, Aufgaben-Generator mit Vorschau) über die
 * ganze Breite.
 */
export function ContentStep(props: TeacherDictationScreenProps) {
  const { content, onText, onSplit, onImportFile, onMoveSection } = props;
  const count = content.sections.length;
  const [dragged, setDragged] = useState<number | null>(null);
  const sortable = Boolean(onMoveSection) && content.kind === "text";

  if (content.kind === "vocabulary" && props.vocabulary) {
    return (
      <div className={styles.single}>
        <TitleRow {...props} />
        <VocabularyEditor {...props.vocabulary} />
        {props.vocabularyPicker ? (
          <VocabularyPicker {...props.vocabularyPicker} />
        ) : null}
      </div>
    );
  }
  if (content.kind === "math" && props.math) {
    return (
      <div className={styles.single}>
        <TitleRow {...props} />
        <MathEditor {...props.math} />
      </div>
    );
  }
  return (
    <div className={styles.contentGrid}>
      <div className={styles.inputColumn}>
        <TitleRow {...props} />
        <textarea
          className={styles.source}
          aria-label={KIND_LABELS[content.kind]}
          placeholder={PLACEHOLDERS[content.kind]}
          value={content.text}
          onChange={(event) => onText?.(event.target.value)}
        />
        <div className={styles.splitRow}>
          {content.kind === "text" ? (
            <div className={styles.split} role="group" aria-label="Teilen nach">
              <span className={styles.splitLabel} aria-hidden="true">
                Teilen nach
              </span>
              {SPLITS.map(([split, label]) => (
                <button
                  key={split}
                  type="button"
                  className={styles.splitChip}
                  aria-pressed={content.split === split}
                  onClick={() => onSplit?.(split)}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : (
            <span />
          )}
          {onImportFile ? (
            <label className={styles.fileButton}>
              Datei importieren
              <input
                type="file"
                accept=".txt,.csv,.tsv,text/plain,text/csv"
                className={styles.fileInput}
                onChange={(event) => {
                  onImportFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
          ) : null}
        </div>
      </div>
      <section className={styles.sectionsColumn} aria-label="Abschnitte">
        <div className={styles.sectionsHead}>
          <span className={styles.sectionsCount}>
            {count} Abschnitte · so sehen es die Schüler
          </span>
          {sortable && count > 1 ? (
            <span className={styles.sortHint}>ziehen zum Sortieren</span>
          ) : null}
        </div>
        {count ? (
          <ol className={styles.sections}>
            {content.sections.map((section, sectionIndex) => (
              <li
                key={`${sectionIndex}-${section}`}
                className={cx(
                  styles.section,
                  dragged === sectionIndex && styles.dragging,
                )}
                draggable={sortable}
                onDragStart={() => setDragged(sectionIndex)}
                onDragEnd={() => setDragged(null)}
                onDragOver={(event) => {
                  if (dragged !== null) event.preventDefault();
                }}
                onDrop={() => {
                  if (dragged !== null && dragged !== sectionIndex) {
                    onMoveSection?.(dragged, sectionIndex);
                  }
                  setDragged(null);
                }}
              >
                <span className={styles.sectionNumber}>{sectionIndex + 1}</span>
                <span className={styles.sectionText}>{section}</span>
                {sortable ? (
                  <span className={styles.handle} aria-hidden="true">
                    ⋮⋮
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        ) : null}
      </section>
    </div>
  );
}
