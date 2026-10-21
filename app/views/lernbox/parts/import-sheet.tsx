"use client";

import { useState } from "react";
import {
  parseVocabularyImport,
  vocabularyPairProblem,
} from "../../../../src/domain/vocabulary-import";
import { toLearningBoxImportRows } from "../../../../src/domain/learning-box";
import { Icon } from "../../../ui/icons";
import { downloadVocabularyTemplate } from "../../../ui/vocabulary-template-download";
import { VOCABULARY_IMPORT_GUIDE } from "../../../ui/vocabulary-import-guide";
import { DeckChips } from "./deck-grid";
import {
  ImportPreview,
  type ImportPreviewData,
  type ImportSkippedLine,
} from "./import-preview";
import { ImportRows, type ImportTypedRow } from "./import-rows";
import { Modal } from "./modal";
import { NewDeck } from "./new-deck";
import type { LbImportRow, LernBoxScreenProps } from "./types";
import styles from "../lernbox-screen.module.css";

type Way = "type" | "paste";
const START_ROWS = 5;

const emptyRow = (): ImportTypedRow => ({
  id: crypto.randomUUID(),
  question: "",
  answer: "",
  tag: "",
});

/** Vorschau aus den getippten Zeilen; leere Zeilen zählen nicht. */
function previewTyped(rows: readonly ImportTypedRow[]): ImportPreviewData {
  const recognised: LbImportRow[] = [];
  const skipped: ImportSkippedLine[] = [];
  rows.forEach((row, index) => {
    const question = row.question.trim();
    const answer = row.answer.trim();
    const tag = row.tag.trim();
    if (!question && !answer && !tag) return;
    const problem = vocabularyPairProblem(question, answer);
    if (problem) {
      skipped.push({
        lineNumber: index + 1,
        line: [question, answer].filter(Boolean).join(" → "),
        reason: problem,
      });
      return;
    }
    recognised.push({ question, answer, ...(tag ? { tag } : {}) });
  });
  return { rows: recognised, skipped, headerSkipped: false };
}

/** Vorschau aus eingefügtem Text oder einer Datei. */
function previewText(text: string): ImportPreviewData {
  const { entries, skipped, headerSkipped } = parseVocabularyImport(text);
  return { rows: toLearningBoxImportRows(entries), skipped, headerSkipped };
}

export function ImportSheet(props: LernBoxScreenProps) {
  const { decks } = props;
  const [deckId, setDeckId] = useState(decks[0]?.id ?? "");
  const [creating, setCreating] = useState(decks.length === 0);
  const [way, setWay] = useState<Way>("type");
  const [rows, setRows] = useState<ImportTypedRow[]>(() =>
    Array.from({ length: START_ROWS }, emptyRow),
  );
  const [focusId, setFocusId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<ImportPreviewData | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");

  const hasInput =
    way === "type"
      ? rows.some((row) => row.question.trim() || row.answer.trim())
      : Boolean(text.trim());
  const deckTitle = decks.find((deck) => deck.id === deckId)?.title ?? "";

  function addRow() {
    const row = emptyRow();
    setRows((current) => [...current, row]);
    setFocusId(row.id);
  }
  function removeRow(id: string) {
    setRows((current) => {
      const rest = current.filter((row) => row.id !== id);
      return rest.length ? rest : [emptyRow()];
    });
  }
  function changeRow(
    id: string,
    field: "question" | "answer" | "tag",
    value: string,
  ) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  }

  async function accept() {
    if (!preview || !preview.rows.length || !deckId || busy) return;
    setBusy(true);
    try {
      const message = await props.onImportCards?.(deckId, {
        rows: preview.rows,
        skipped: preview.skipped.map((line) => line.lineNumber),
      });
      setResult(message ?? "");
      setText("");
      setRows(Array.from({ length: START_ROWS }, emptyRow));
      setFocusId(null);
      setPreview(null);
    } finally {
      setBusy(false);
    }
  }

  const guide = VOCABULARY_IMPORT_GUIDE.student;
  return (
    <Modal title="Viele Vokabeln einfügen" onClose={props.onCloseSheet}>
      {creating ? (
        <NewDeck
          screen={props}
          onCreated={(id) => {
            setDeckId(id);
            setCreating(false);
          }}
          onCancel={decks.length ? () => setCreating(false) : undefined}
        />
      ) : preview ? (
        <div className={styles.sheetForm}>
          <ImportPreview preview={preview} />
          <p className={styles.hint}>
            Sie kommen in den Stapel „{deckTitle}“. Erst mit „Übernehmen“ werden
            sie gespeichert.
          </p>
          <div className={styles.buttons}>
            <button
              type="button"
              className={styles.ghostButton}
              onClick={() => setPreview(null)}
            >
              Zurück
            </button>
            <button
              type="button"
              className={styles.cta}
              disabled={!preview.rows.length || busy}
              onClick={() => void accept()}
            >
              Übernehmen
            </button>
          </div>
        </div>
      ) : (
        <form
          className={styles.sheetForm}
          onSubmit={(event) => {
            event.preventDefault();
            if (!deckId || !hasInput) return;
            setResult("");
            setPreview(way === "type" ? previewTyped(rows) : previewText(text));
          }}
        >
          <div
            className={styles.segmentSheet}
            role="group"
            aria-label="Wie möchtest du die Vokabeln eingeben?"
          >
            {(
              [
                ["type", "Eintippen"],
                ["paste", "Einfügen oder Datei"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={way === value ? styles.segOn : styles.segOff}
                aria-pressed={way === value}
                onClick={() => setWay(value)}
              >
                {label}
              </button>
            ))}
          </div>

          {way === "type" ? (
            <>
              <p className={styles.hint}>
                Schreibe pro Zeile die Vorderseite und die Rückseite. Der Tag
                ist freiwillig. Leere Zeilen werden nicht beachtet.
              </p>
              <ImportRows
                rows={rows}
                focusId={focusId}
                onChange={changeRow}
                onAdd={addRow}
                onRemove={removeRow}
              />
            </>
          ) : (
            <>
              <details className={styles.importGuide}>
                <summary>{guide.summary}</summary>
                <p>{guide.sentences.join(" ")}</p>
              </details>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>
                  Vokabeln zum Importieren
                </span>
                <textarea
                  className={styles.textarea}
                  placeholder={"Haus\thome | house\tUnit 1\nBaum;tree"}
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                />
              </label>
              <div className={styles.importFileRow}>
                <label className={styles.fileButton}>
                  <Icon name="upload" size={16} /> Datei wählen
                  <input
                    type="file"
                    accept=".txt,.csv,.tsv,text/plain,text/csv"
                    className={styles.fileInput}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (file) void file.text().then(setText);
                    }}
                  />
                </label>
                <button
                  type="button"
                  className={styles.ghostButton}
                  onClick={downloadVocabularyTemplate}
                >
                  <Icon name="download" size={16} /> Vorlage herunterladen
                </button>
              </div>
            </>
          )}

          <div className={styles.field}>
            <span className={styles.fieldLabel}>In Stapel</span>
            <DeckChips
              decks={decks}
              value={deckId}
              onChange={setDeckId}
              onNew={() => setCreating(true)}
            />
          </div>
          {result ? (
            <span className={styles.saved} role="status">
              {result}
            </span>
          ) : null}
          <div className={styles.buttons}>
            <button
              type="button"
              className={styles.ghostButton}
              onClick={props.onCloseSheet}
            >
              Fertig
            </button>
            <button type="submit" className={styles.cta} disabled={!hasInput}>
              Vorschau ansehen
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
