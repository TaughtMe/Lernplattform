"use client";

import { useState } from "react";
import { Icon } from "../../../ui/icons";
import { DeckChips } from "./deck-grid";
import { Modal } from "./modal";
import { NewDeck } from "./new-deck";
import type { LernBoxScreenProps } from "./types";
import styles from "../lernbox-screen.module.css";

export function ImportSheet(props: LernBoxScreenProps) {
  const { decks } = props;
  const [deckId, setDeckId] = useState(decks[0]?.id ?? "");
  const [creating, setCreating] = useState(decks.length === 0);
  const [text, setText] = useState("");
  const [result, setResult] = useState("");
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
      ) : (
        <form
          className={styles.sheetForm}
          onSubmit={(event) => {
            event.preventDefault();
            if (!deckId || !text.trim()) return;
            void props.onImportCards?.(deckId, text).then((message) => {
              setResult(message);
              setText("");
            });
          }}
        >
          <p className={styles.hint}>
            Eine Vokabel pro Zeile. Spalten aus Excel oder Sheets, oder mit
            Semikolon: Vorderseite; Rückseite; Tag (optional).
          </p>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Vokabeln zum Importieren</span>
            <textarea
              className={styles.textarea}
              placeholder={"Haus\thome | house\tUnit 1\nBaum;tree"}
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
          </label>
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
            <button
              type="submit"
              className={styles.cta}
              disabled={!text.trim()}
            >
              Importieren
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
