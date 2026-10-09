"use client";

import { useState } from "react";
import { WORD_BOX_LIMITS } from "../../../src/domain/word-box";
import { Button, Notice } from "../../ui/primitives";
import { Sheet } from "../../ui/sheet";
import styles from "./wortspeicher.module.css";

export const TEXTBOX_BOX_TITLE = "Aus der Textbox";
export const ERROR_BOX_TITLE = "Meine Fehlerwörter";
const NEW_BOX = "neu";

/**
 * Blatt „Wörter aus der Textbox“ (`?woerter=`, Plan 2.9). Es wird nichts ohne
 * eine der beiden Aktionen gespeichert.
 */
export function TextboxWordsSheet({
  words,
  source = "textbox",
  ownBoxes,
  error,
  saved,
  onPractice,
  onSave,
  onClose,
}: {
  words: readonly string[];
  /** Woher die Wörter kommen: aus der Textbox oder von den Fehlern der Fortschrittsseite. */
  source?: "textbox" | "fehler";
  ownBoxes: readonly { id: string; title: string }[];
  error?: string | undefined;
  /** Titel der Wortbox, in der die Wörter gerade gespeichert wurden. */
  saved?: string | undefined;
  onPractice: () => void;
  /** `boxId` ist `undefined` für eine neue Wortbox mit dem Titel. */
  onSave: (target: { boxId?: string; title: string }) => void;
  onClose: () => void;
}) {
  const sheetTitle =
    source === "fehler"
      ? "Wörter mit den meisten Fehlern"
      : "Wörter aus der Textbox";
  const [saving, setSaving] = useState(false);
  const [target, setTarget] = useState(NEW_BOX);
  const [title, setTitle] = useState(
    source === "fehler" ? ERROR_BOX_TITLE : TEXTBOX_BOX_TITLE,
  );

  return (
    <Sheet open title={sheetTitle} onClose={onClose}>
      <div className="ui-stack">
        <p className="ui-small ui-muted">
          {words.length === 1 ? "1 Wort" : `${words.length} Wörter`}{" "}
          {source === "fehler"
            ? "aus deinem Fortschritt"
            : "aus deiner Textbox-Übung"}
          :
        </p>
        <ul className={styles.missed} aria-label={sheetTitle}>
          {words.map((word) => (
            <li key={word}>{word}</li>
          ))}
        </ul>

        {saved ? (
          <Notice tone="good" role="status">
            Die Wörter liegen jetzt in der Wortbox ‚{saved}‘.
          </Notice>
        ) : null}
        {error ? (
          <Notice tone="bad" role="alert">
            {error}
          </Notice>
        ) : null}

        {saving ? (
          <form
            className="ui-stack"
            onSubmit={(event) => {
              event.preventDefault();
              if (target === NEW_BOX) {
                if (title.trim()) onSave({ title: title.trim() });
              } else {
                const box = ownBoxes.find((entry) => entry.id === target);
                if (box) onSave({ boxId: box.id, title: box.title });
              }
            }}
          >
            <label className="ui-stack" style={{ ["--gap" as string]: "6px" }}>
              <span className="ui-small ui-muted">Wortbox</span>
              <select
                className="ui-input"
                value={target}
                onChange={(event) => setTarget(event.target.value)}
              >
                <option value={NEW_BOX}>Neue Wortbox</option>
                {ownBoxes.map((box) => (
                  <option key={box.id} value={box.id}>
                    {box.title}
                  </option>
                ))}
              </select>
            </label>
            {target === NEW_BOX ? (
              <label
                className="ui-stack"
                style={{ ["--gap" as string]: "6px" }}
              >
                <span className="ui-small ui-muted">
                  Name der neuen Wortbox
                </span>
                <input
                  className="ui-field"
                  value={title}
                  maxLength={WORD_BOX_LIMITS.titleMax}
                  onChange={(event) => setTitle(event.target.value)}
                  autoComplete="off"
                />
              </label>
            ) : null}
            <div className={styles.actions}>
              <Button
                type="submit"
                disabled={target === NEW_BOX && !title.trim()}
              >
                Speichern
              </Button>
              <Button variant="ghost" onClick={() => setSaving(false)}>
                Abbrechen
              </Button>
            </div>
          </form>
        ) : (
          <div className={styles.actions}>
            <Button size="lg" onClick={onPractice}>
              Jetzt üben
            </Button>
            <Button size="lg" variant="soft" onClick={() => setSaving(true)}>
              In eine Wortbox speichern
            </Button>
          </div>
        )}
      </div>
    </Sheet>
  );
}
