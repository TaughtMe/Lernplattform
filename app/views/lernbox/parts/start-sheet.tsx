"use client";

import { useState } from "react";
import { plural } from "./format";
import { Modal } from "./modal";
import type { LbDirection, LbMode, LernBoxScreenProps } from "./types";
import styles from "../lernbox-screen.module.css";

export function StartSheet(props: LernBoxScreenProps & { scope: string }) {
  const { scope } = props;
  const [mode, setMode] = useState<LbMode>(props.mode);
  const [direction, setDirection] = useState<LbDirection>(props.direction);
  const labels = props.directionLabelsFor(scope);
  const deck = props.decks.find((entry) => entry.id === scope);
  const dueDecks =
    props.todayDecks ?? props.decks.filter((entry) => entry.due > 0).length;
  // Die Richtung kommt je Vokabel aus der Tagesportion.
  const directionFromPlan = scope === props.planScope;
  const box = scope.startsWith("box:") ? Number(scope.slice(4)) : 0;
  const boxCount = props.decks.reduce(
    (sum, entry) => sum + (entry.boxes[box - 1] ?? 0),
    0,
  );
  const title =
    scope === "heute"
      ? "Heute dran"
      : scope === "errors"
        ? "Meine Fehler"
        : box
          ? `Box ${box} üben`
          : (deck?.title ?? "Stapel");
  const subtitle = box
    ? `${plural(boxCount, "Vokabel", "Vokabeln")} · nur üben, nichts wird verschoben`
    : scope === "heute"
      ? `${plural(props.dueTotal, "Vokabel", "Vokabeln")} aus ${dueDecks === props.decks.length ? "allen Stapeln" : plural(dueDecks, "Stapel", "Stapeln")}`
      : scope === "errors"
        ? `${plural(props.errorCount, "Vokabel", "Vokabeln")} zum Wiederholen`
        : deck
          ? plural(deck.due || deck.total, "Vokabel", "Vokabeln")
          : "";
  return (
    <Modal title={title} subtitle={subtitle} onClose={props.onCloseSheet}>
      <div className={styles.field}>
        <span className={styles.fieldLabel} id="lb-mode-label">
          Wie willst du üben?
        </span>
        <div
          className={styles.segmentSheet}
          role="group"
          aria-labelledby="lb-mode-label"
        >
          {(
            [
              ["writing", "Schreiben"],
              ["oral", "Mündlich"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={mode === value ? styles.segOn : styles.segOff}
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
            >
              {label}
            </button>
          ))}
        </div>
        {mode === "oral" && !box ? (
          <p className={styles.hint}>
            Bis Box 3 per Selbsteinschätzung, danach schriftlich.
          </p>
        ) : null}
      </div>
      {directionFromPlan ? null : (
        <div className={styles.field}>
          <span className={styles.fieldLabel} id="lb-direction-label">
            Richtung
          </span>
          <div
            className={styles.segmentSheet}
            role="group"
            aria-labelledby="lb-direction-label"
          >
            {(
              [
                ["forward", labels.forward],
                ["reverse", labels.reverse],
                ["mixed", "Gemischt"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={direction === value ? styles.segOn : styles.segOff}
                aria-pressed={direction === value}
                onClick={() => setDirection(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
      <button
        type="button"
        className={styles.cta}
        onClick={() => props.onStart?.({ scope, mode, direction })}
      >
        Los geht&apos;s
      </button>
    </Modal>
  );
}
