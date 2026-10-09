"use client";

import { useState, type FormEvent } from "react";
import { WORD_BOX_LIMITS } from "../../../src/domain/word-box";
import { Icon } from "../../ui/icons";
import { Button, IconButton, Notice } from "../../ui/primitives";
import styles from "./wortspeicher.module.css";

/** Wortliste einer Wortbox: feste nur lesen und kopieren, eigene bearbeiten (Plan 2.2). */
export function BoxEditorScreen({
  title,
  kind,
  words,
  notice,
  ready,
  onBack,
  onRenameBox,
  onAddWords,
  onRenameWord,
  onRemoveWord,
  onRemoveBox,
  onCopy,
}: {
  title: string;
  /**
   * Feste Wortboxen: nur lesen und kopieren. Eigene: alles bearbeiten.
   * „Aus dem Unterricht“: Wörter und die ganze Wortbox löschen.
   */
  kind: "fest" | "eigen" | "unterricht";
  words: readonly string[];
  notice?: string | undefined;
  ready: boolean;
  onBack: () => void;
  onRenameBox?: ((title: string) => void) | undefined;
  onAddWords?: ((text: string) => void) | undefined;
  onRenameWord?: ((from: string, to: string) => void) | undefined;
  onRemoveWord?: ((word: string) => void) | undefined;
  onRemoveBox?: (() => void) | undefined;
  onCopy?: (() => void) | undefined;
}) {
  const editable = kind === "eigen";
  const deletable = kind !== "fest";
  const [name, setName] = useState(title);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<string>();
  const [edit, setEdit] = useState("");
  const [confirming, setConfirming] = useState(false);

  function add(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim()) return;
    onAddWords?.(draft);
    setDraft("");
  }

  function rename(event: FormEvent) {
    event.preventDefault();
    if (name.trim() && name.trim() !== title) onRenameBox?.(name.trim());
  }

  function saveWord(event: FormEvent, from: string) {
    event.preventDefault();
    if (edit.trim()) onRenameWord?.(from, edit.trim());
    setEditing(undefined);
  }

  return (
    <section className={styles.screen} aria-labelledby="wortspeicher-title">
      <header className={styles.head}>
        <div className={styles.headMain}>
          <IconButton label="Zurück zur Übersicht" square onClick={onBack}>
            <Icon name="back" size={18} />
          </IconButton>
          <div>
            <h1 id="wortspeicher-title" className={styles.title} tabIndex={-1}>
              {title}
            </h1>
            <p className={styles.subtitle}>
              {words.length === 1 ? "1 Wort" : `${words.length} Wörter`}
              {kind === "fest" ? " · feste Wortbox, nur lesen" : ""}
            </p>
          </div>
        </div>
        {kind === "fest" && onCopy ? (
          <Button disabled={!ready} onClick={onCopy}>
            Als eigene Wortbox kopieren
          </Button>
        ) : null}
      </header>

      {notice ? (
        <Notice tone="bad" role="status">
          {notice}
        </Notice>
      ) : null}

      {editable ? (
        <>
          <form className={styles.addForm} onSubmit={rename}>
            <label
              className="ui-grow ui-stack"
              style={{ ["--gap" as string]: "4px" }}
            >
              <span className="ui-tiny ui-muted">Titel der Wortbox</span>
              <input
                className="ui-field"
                value={name}
                maxLength={WORD_BOX_LIMITS.titleMax}
                onChange={(event) => setName(event.target.value)}
                autoComplete="off"
              />
            </label>
            <Button
              type="submit"
              variant="soft"
              disabled={!ready || !name.trim() || name.trim() === title}
            >
              Titel ändern
            </Button>
          </form>
          <form className={styles.addForm} onSubmit={add}>
            <label
              className="ui-grow ui-stack"
              style={{ ["--gap" as string]: "4px" }}
            >
              <span className="ui-tiny ui-muted">
                Wort hinzufügen · mehrere durch Komma, Semikolon oder
                Zeilenumbruch
              </span>
              <input
                className="ui-field"
                value={draft}
                maxLength={WORD_BOX_LIMITS.wordsPerBox * 8}
                onChange={(event) => setDraft(event.target.value)}
                onPaste={(event) => {
                  // Ein einzeiliges Feld würde Zeilenumbrüche verschlucken.
                  const pasted = event.clipboardData.getData("text");
                  if (/[\r\n]/u.test(pasted)) {
                    event.preventDefault();
                    onAddWords?.(pasted);
                  }
                }}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
              />
            </label>
            <Button type="submit" disabled={!ready || !draft.trim()}>
              Hinzufügen
            </Button>
          </form>
        </>
      ) : null}

      {words.length === 0 ? (
        <p className={styles.hint}>
          Diese Wortbox ist noch leer.
          {editable ? " Füge oben dein erstes Wort hinzu." : ""}
        </p>
      ) : (
        <ul className={styles.wordList} aria-label={`Wörter in ${title}`}>
          {words.map((word) => (
            <li key={word} className={styles.wordRow}>
              {editing === word ? (
                <form
                  className={styles.addForm}
                  style={{ flex: 1 }}
                  onSubmit={(event) => saveWord(event, word)}
                >
                  <input
                    className="ui-field"
                    aria-label={`‚${word}‘ ändern zu`}
                    value={edit}
                    maxLength={WORD_BOX_LIMITS.wordMax}
                    onChange={(event) => setEdit(event.target.value)}
                    // eslint-disable-next-line jsx-a11y/no-autofocus -- das Feld wurde gerade durch „Ändern“ geöffnet
                    autoFocus
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                  <Button type="submit" size="sm">
                    Speichern
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditing(undefined)}
                  >
                    Abbrechen
                  </Button>
                </form>
              ) : (
                <>
                  <span className={styles.wordText}>{word}</span>
                  {deletable ? (
                    <>
                      {editable ? (
                        <Button
                          size="sm"
                          variant="soft"
                          disabled={!ready}
                          aria-label={`‚${word}‘ ändern`}
                          onClick={() => {
                            setEditing(word);
                            setEdit(word);
                          }}
                        >
                          Ändern
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={!ready}
                        aria-label={`‚${word}‘ löschen`}
                        onClick={() => onRemoveWord?.(word)}
                      >
                        Löschen
                      </Button>
                    </>
                  ) : null}
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {deletable ? (
        confirming ? (
          <div
            className={styles.confirm}
            role="alertdialog"
            aria-label="Wortbox löschen"
          >
            <span>
              Wortbox ‚{title}‘ wirklich löschen? Dein Lernstand bleibt
              erhalten.
            </span>
            <Button
              variant="bad"
              onClick={() => {
                setConfirming(false);
                onRemoveBox?.();
              }}
            >
              Ja, Wortbox löschen
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Abbrechen
            </Button>
          </div>
        ) : (
          <div className={styles.actions}>
            <Button
              variant="ghost"
              disabled={!ready}
              onClick={() => setConfirming(true)}
            >
              Wortbox löschen
            </Button>
          </div>
        )
      ) : null}
    </section>
  );
}
