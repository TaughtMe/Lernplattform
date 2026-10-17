"use client";

import { useState, type FormEvent } from "react";
import { Modal } from "./modal";
import type { LernBoxScreenProps } from "./types";
import styles from "../lernbox-screen.module.css";

export function NewDeck({
  screen,
  onCreated,
  onCancel,
}: {
  screen: LernBoxScreenProps;
  onCreated: (id: string) => void;
  onCancel?: (() => void) | undefined;
}) {
  const [title, setTitle] = useState("");
  const [folderId, setFolderId] = useState("");
  const [front, setFront] = useState(screen.languages[0]?.locale ?? "de-DE");
  const [back, setBack] = useState(screen.languages[1]?.locale ?? "en-GB");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    const id = await screen.onCreateDeck?.({
      title: title.trim(),
      folderId: folderId || null,
      frontLocale: front,
      backLocale: back,
    });
    setBusy(false);
    if (id) {
      setTitle("");
      onCreated(id);
    }
  }
  return (
    <form className={styles.newDeck} onSubmit={(event) => void submit(event)}>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Name des neuen Stapels</span>
        <input
          className={styles.input}
          placeholder="z. B. Unit 3"
          maxLength={80}
          autoComplete="off"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>
      <div className={styles.twoCols}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Vorderseite</span>
          <select
            className={styles.select}
            value={front}
            onChange={(event) => setFront(event.target.value)}
          >
            {screen.languages.map((language) => (
              <option key={language.locale} value={language.locale}>
                {language.label}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Rückseite</span>
          <select
            className={styles.select}
            value={back}
            onChange={(event) => setBack(event.target.value)}
          >
            {screen.languages.map((language) => (
              <option key={language.locale} value={language.locale}>
                {language.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {screen.folders.length ? (
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Ordner</span>
          <select
            className={styles.select}
            value={folderId}
            onChange={(event) => setFolderId(event.target.value)}
          >
            <option value="">Ohne Ordner</option>
            {screen.folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.title}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <div className={styles.buttons}>
        {onCancel ? (
          <button
            type="button"
            className={styles.ghostButton}
            onClick={onCancel}
          >
            Abbrechen
          </button>
        ) : null}
        <button
          type="submit"
          className={styles.cta}
          disabled={!title.trim() || busy}
        >
          Stapel anlegen
        </button>
      </div>
    </form>
  );
}

export function DeckSheet(props: LernBoxScreenProps) {
  return (
    <Modal title="Neuer Stapel" onClose={props.onCloseSheet}>
      <NewDeck
        screen={props}
        onCreated={() => props.onCloseSheet?.()}
        onCancel={props.onCloseSheet}
      />
    </Modal>
  );
}
