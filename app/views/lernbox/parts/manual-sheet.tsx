"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { DeckChips } from "./deck-grid";
import { Modal } from "./modal";
import { NewDeck } from "./new-deck";
import type { LernBoxScreenProps } from "./types";
import styles from "../lernbox-screen.module.css";

export function ManualSheet(props: LernBoxScreenProps) {
  const { decks } = props;
  const [deckId, setDeckId] = useState(decks[0]?.id ?? "");
  const [creating, setCreating] = useState(decks.length === 0);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [saved, setSaved] = useState("");
  const first = useRef<HTMLInputElement>(null);
  const deck = decks.find((entry) => entry.id === deckId);
  const german =
    deck?.frontLabel === "Deutsch" && deck.backLabel === "Englisch";

  useEffect(() => {
    if (!creating) first.current?.focus();
  }, [creating]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!deck || !question.trim() || !answer.trim()) return;
    const result = await props.onAddCard?.(deck.id, { question, answer });
    if (result === "added") {
      setSaved(`„${question.trim()}“ gespeichert · Box 1`);
    } else if (result === "duplicate") {
      setSaved("Diese Vokabel ist schon in der LernBox.");
    } else {
      setSaved("Das hat nicht geklappt. Bitte versuche es noch einmal.");
    }
    if (result === "added" || result === "duplicate") {
      setQuestion("");
      setAnswer("");
      first.current?.focus();
    }
  }

  return (
    <Modal title="Vokabel eintragen" onClose={props.onCloseSheet}>
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
          onSubmit={(event) => void save(event)}
        >
          <label className={styles.field}>
            <span className={styles.fieldLabel}>
              {deck?.frontLabel ?? "Vorderseite"}
            </span>
            <input
              ref={first}
              className={styles.input}
              placeholder={german ? "z. B. Frühstück" : "Wort"}
              autoComplete="off"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>
              {deck?.backLabel ?? "Rückseite"}
            </span>
            <input
              className={styles.input}
              placeholder={german ? "z. B. breakfast" : "Übersetzung"}
              autoComplete="off"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
            />
          </label>
          <p className={styles.hint}>
            Mehrere richtige Antworten mit „|“ trennen, z. B. home | house.
          </p>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>In Stapel</span>
            <DeckChips
              decks={decks}
              value={deckId}
              onChange={setDeckId}
              onNew={() => setCreating(true)}
            />
          </div>
          {saved ? (
            <span className={styles.saved} role="status">
              {saved}
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
              disabled={!question.trim() || !answer.trim()}
            >
              Speichern und nächste
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
