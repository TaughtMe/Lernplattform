"use client";

import { Icon } from "../../../ui/icons";
import { cx } from "../../parts/parts";
import { BoxBar } from "./box-chart";
import { plural } from "./format";
import type { LbDeck } from "./types";
import styles from "../lernbox-screen.module.css";

export function DeckGrid({
  decks,
  onStart,
  onNew,
}: {
  onNew?: () => void;
  decks: readonly LbDeck[];
  onStart: (scope: string) => void;
}) {
  return (
    <ul className={styles.deckGrid}>
      {decks.map((deck) => (
        <li key={deck.id}>
          <button
            type="button"
            className={styles.deckCard}
            onClick={() => onStart(deck.id)}
          >
            <span className={styles.deckHead}>
              <span className={styles.deckTitles}>
                <strong>{deck.title}</strong>
                <span className={styles.deckMeta}>
                  {plural(deck.total, "Vokabel", "Vokabeln")}
                  <span className={styles.wideOnly}> · {deck.sourceLabel}</span>
                </span>
              </span>
              {deck.total === 0 ? null : deck.due > 0 ? (
                <span className={styles.duePill}>{deck.due} heute</span>
              ) : (
                <span className={styles.donePill}>erledigt</span>
              )}
            </span>
            <BoxBar boxes={deck.boxes} />
          </button>
        </li>
      ))}
      {onNew ? (
        <li>
          <button type="button" className={styles.newCard} onClick={onNew}>
            <Icon name="plus" size={30} strokeWidth={2.6} />
            <span>Neuer Stapel</span>
          </button>
        </li>
      ) : null}
    </ul>
  );
}

export function DeckChips({
  decks,
  value,
  onChange,
  onNew,
}: {
  decks: readonly LbDeck[];
  value: string;
  onChange: (id: string) => void;
  onNew?: () => void;
}) {
  return (
    <div className={styles.chips} role="group" aria-label="In Stapel">
      {decks.map((deck) => (
        <button
          key={deck.id}
          type="button"
          className={cx(styles.chip, deck.id === value && styles.chipOn)}
          aria-pressed={deck.id === value}
          onClick={() => onChange(deck.id)}
        >
          {deck.title.split(" · ")[0]}
        </button>
      ))}
      {onNew ? (
        <button
          type="button"
          className={cx(styles.chip, styles.chipNew)}
          onClick={onNew}
        >
          + Neuer Stapel
        </button>
      ) : null}
    </div>
  );
}
