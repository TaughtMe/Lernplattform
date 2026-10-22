"use client";

import { useState, type CSSProperties } from "react";
import { Icon } from "../../../ui/icons";
import { cx } from "../../parts/parts";
import { BOX_COLORS } from "./box-chart";
import type { LbCard, LbCardInput, LernBoxScreenProps } from "./types";
import styles from "../lernbox-screen.module.css";

/** Box der Karte; „lange nicht geübt“ ruhig als Text darunter (nicht nur Farbe). */
function BoxCell({ card, dot }: { card: LbCard; dot: CSSProperties }) {
  return (
    <td className={styles.cellBox}>
      <span className={styles.boxLabel} style={dot}>
        <span className={styles.boxDot} aria-hidden="true" />
        Box {card.box}
      </span>
      {card.longUnpracticed ? (
        <span className={styles.longNote}>lange nicht geübt</span>
      ) : null}
    </td>
  );
}

export function CardRow({
  card,
  ...props
}: LernBoxScreenProps & { card: LbCard }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<LbCardInput>({
    question: card.question,
    answer: card.answer,
    tag: card.tag ?? "",
  });
  const [deckId, setDeckId] = useState(card.deckId);

  function open() {
    setDraft({
      question: card.question,
      answer: card.answer,
      tag: card.tag ?? "",
    });
    setDeckId(card.deckId);
    setEditing(true);
  }
  function done() {
    if (draft.question.trim() && draft.answer.trim()) {
      props.onSaveCard?.(card.id, draft, deckId);
    }
    setEditing(false);
  }
  const dot = {
    "--box": BOX_COLORS[card.box - 1],
  } as CSSProperties;

  if (!editing) {
    return (
      <tr className={styles.row}>
        <td className={styles.cellQuestion}>{card.question}</td>
        <td className={styles.cellAnswer}>{card.answer}</td>
        <td className={styles.cellDeck}>{card.deckTitle}</td>
        <td className={styles.cellTag}>
          {card.tag ? (
            <span className={styles.tag} title={card.tag}>
              {card.tag}
            </span>
          ) : null}
        </td>
        <BoxCell card={card} dot={dot} />
        <td className={styles.cellAction}>
          <button
            type="button"
            className={styles.rowButton}
            aria-label={`${card.question} bearbeiten`}
            onClick={open}
          >
            <Icon name="pencil" size={16} strokeWidth={2.2} />
          </button>
        </td>
      </tr>
    );
  }
  return (
    <tr className={cx(styles.row, styles.rowEditing)}>
      <td className={styles.cellQuestion}>
        <input
          className={styles.cellInput}
          aria-label="Vorderseite"
          value={draft.question}
          onChange={(event) =>
            setDraft({ ...draft, question: event.target.value })
          }
        />
      </td>
      <td className={styles.cellAnswer}>
        <input
          className={styles.cellInput}
          aria-label="Rückseite"
          value={draft.answer}
          onChange={(event) =>
            setDraft({ ...draft, answer: event.target.value })
          }
        />
      </td>
      <td className={styles.cellDeck}>
        <select
          className={styles.cellSelect}
          aria-label="Stapel"
          value={deckId}
          onChange={(event) => setDeckId(event.target.value)}
        >
          {props.decks.map((deck) => (
            <option key={deck.id} value={deck.id}>
              {deck.title}
            </option>
          ))}
        </select>
      </td>
      <td className={styles.cellTag}>
        <input
          className={styles.tagInput}
          placeholder="+ Tag"
          aria-label="Tag"
          maxLength={40}
          value={draft.tag}
          onChange={(event) => setDraft({ ...draft, tag: event.target.value })}
        />
      </td>
      <BoxCell card={card} dot={dot} />
      <td className={styles.cellAction}>
        <button
          type="button"
          className={styles.rowButton}
          aria-label={`${card.question} löschen`}
          onClick={() => props.onDeleteCards?.([card.id])}
        >
          <Icon name="trash" size={16} strokeWidth={2.2} />
        </button>
        <button
          type="button"
          className={cx(styles.rowButton, styles.rowButtonOn)}
          aria-label="Fertig"
          onClick={done}
        >
          <Icon name="check" size={16} strokeWidth={2.6} />
        </button>
      </td>
    </tr>
  );
}
