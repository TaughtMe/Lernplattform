"use client";

import { useState } from "react";
import { Segmented } from "../../../ui/primitives";
import { Chip, cx } from "../../parts/parts";
import { MathEditor } from "../math-editor";
import { VocabularyEditor } from "../vocabulary-editor";
import { VocabularyPicker } from "../vocabulary-picker";
import styles from "../teacher-dictation-screen.module.css";
import type { ContentKind, TeacherDictationScreenProps } from "./types";
import { KINDS, SPLITS } from "./constants";
import { LibraryBar } from "./library-bar";

export const PLACEHOLDERS: Record<ContentKind, string> = {
  text: "Text einfügen oder tippen. Er wird automatisch in Abschnitte geteilt.",
  vocabulary: "Eine Vokabel pro Zeile: Wort ; Übersetzung",
  math: "Eine Aufgabe pro Zeile, z. B. 7 + 5",
};

export function KindChips({ content, onKind }: TeacherDictationScreenProps) {
  return (
    <div className={styles.chips} role="group" aria-label="Inhaltsart">
      {KINDS.map(([kind, label]) => (
        <Chip
          key={kind}
          pressed={content.kind === kind}
          onClick={() => onKind?.(kind)}
        >
          {label}
        </Chip>
      ))}
    </div>
  );
}
export function ImportStep(props: TeacherDictationScreenProps) {
  const {
    content,
    onText,
    onSplit,
    onEditSections,
    onImportFile,
    onMoveSection,
  } = props;
  const count = content.sections.length;
  const [dragged, setDragged] = useState<number | null>(null);
  const sortable = Boolean(onMoveSection) && content.kind === "text";
  if (content.kind === "vocabulary" && props.vocabulary) {
    return (
      <div className={styles.editorStage}>
        <KindChips {...props} />
        <LibraryBar {...props} />
        <VocabularyEditor {...props.vocabulary} />
        {props.vocabularyPicker ? (
          <VocabularyPicker {...props.vocabularyPicker} />
        ) : null}
      </div>
    );
  }
  if (content.kind === "math" && props.math) {
    return (
      <div className={styles.editorStage}>
        <KindChips {...props} />
        <LibraryBar {...props} />
        <MathEditor {...props.math} />
      </div>
    );
  }
  return (
    <div className={styles.stage}>
      <div className={styles.column}>
        <KindChips {...props} />
        <LibraryBar {...props} />
        <textarea
          className={styles.source}
          aria-label={KINDS.find(([kind]) => kind === content.kind)?.[1]}
          placeholder={PLACEHOLDERS[content.kind]}
          value={content.text}
          onChange={(event) => onText?.(event.target.value)}
        />
        <div className={styles.splitRow}>
          {content.kind === "text" ? (
            <div className={styles.split} role="group" aria-label="Teilen nach">
              <span className={styles.label} aria-hidden="true">
                Teilen nach
              </span>
              {SPLITS.map(([split, label]) => (
                <Chip
                  key={split}
                  pressed={content.split === split}
                  onClick={() => onSplit?.(split)}
                >
                  {label}
                </Chip>
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
        {content.kind === "text" && props.wordStore ? (
          <div className={styles.wordStore}>
            <Segmented
              label="Wörter in den Wortspeicher"
              value={props.wordStore.value}
              onChange={props.wordStore.onChange}
              options={[
                { value: "none", label: "Aus" },
                { value: "errors", label: "Falsch geschriebene Wörter" },
                { value: "all", label: "Alle Wörter" },
              ]}
            />
            <p className={styles.hint}>
              Wörter in den Wortspeicher: Die Wörter bleiben auf den Geräten der
              Kinder. Du siehst sie nicht.
            </p>
          </div>
        ) : null}
      </div>
      <div className={styles.column}>
        <div className={styles.between}>
          <span className={styles.label}>
            <span className={styles.narrowOnly}>
              {count} Abschnitte{sortable ? " · ziehen zum Sortieren" : ""}
            </span>
            <span className={styles.wideOnly}>
              {count} Abschnitte · so sehen es die Schüler
            </span>
          </span>
          {onEditSections ? (
            <button
              type="button"
              className={cx(styles.linkButton, styles.narrowOnly)}
              onClick={onEditSections}
            >
              Bearbeiten
            </button>
          ) : null}
          {sortable ? (
            <span className={cx(styles.muted, styles.wideOnly)}>
              ziehen zum Sortieren
            </span>
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
      </div>
    </div>
  );
}
