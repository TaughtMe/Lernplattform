"use client";

import { type CSSProperties } from "react";
import { plural } from "./format";
import type { LbDeck } from "./types";
import styles from "../lernbox-screen.module.css";

export const BOX_COLORS = [
  "#c7674a",
  "#d98a3d",
  "#e0a83a",
  "#7a9e5a",
  "#2f6b4f",
];

export function BoxChart({
  decks,
  onPick,
}: {
  decks: readonly LbDeck[];
  onPick: (box: number) => void;
}) {
  const totals = [0, 1, 2, 3, 4].map((index) =>
    decks.reduce((sum, deck) => sum + (deck.boxes[index] ?? 0), 0),
  );
  const max = Math.max(1, ...totals);
  return (
    <ul className={styles.bars}>
      {totals.map((count, index) => (
        <li key={index} className={styles.barItem}>
          <button
            type="button"
            className={styles.barButton}
            disabled={count === 0}
            aria-label={`Box ${index + 1}: ${plural(count, "Vokabel", "Vokabeln")} üben`}
            onClick={() => onPick(index + 1)}
          >
            <span className={styles.barCount}>{count}</span>
            <span
              className={styles.bar}
              aria-hidden="true"
              style={
                {
                  height: `${Math.round(18 + (92 * count) / max)}px`,
                  background: BOX_COLORS[index],
                } as CSSProperties
              }
            />
            <span className={styles.barLabel}>Box {index + 1}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function BoxBar({ boxes }: { boxes: readonly number[] }) {
  return (
    <span
      className={styles.boxBar}
      role="img"
      aria-label={`Boxverteilung: ${boxes.map((count, index) => `Box ${index + 1}: ${count}`).join(", ")}`}
    >
      {boxes.map((count, index) =>
        count > 0 ? (
          <span
            key={index}
            style={
              {
                flexGrow: count,
                background: BOX_COLORS[index],
              } as CSSProperties
            }
          />
        ) : null,
      )}
    </span>
  );
}
