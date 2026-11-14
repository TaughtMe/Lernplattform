"use client";

import { useState } from "react";
import { supportsLearningBoxForms } from "../../../../src/domain/learning-box-forms";
import { cx } from "../../parts/parts";
import { plural } from "./format";
import { Modal } from "./modal";
import type { LbDirection, LbForm, LbMode, LernBoxScreenProps } from "./types";
import styles from "../lernbox-screen.module.css";

export function StartSheet(props: LernBoxScreenProps & { scope: string }) {
  const { scope } = props;
  const [mode, setMode] = useState<LbMode | LbForm>(props.mode);
  const [direction, setDirection] = useState<LbDirection>(props.direction);
  const labels = props.directionLabelsFor(scope);
  const deck = props.decks.find((entry) => entry.id === scope);
  const dueDecks =
    props.todayDecks ??
    props.decks.filter((entry) => entry.state !== "done").length;
  // Die Richtung kommt je Vokabel aus der Tagesportion.
  const directionFromPlan = scope === props.planScope;
  const box = scope.startsWith("box:") ? Number(scope.slice(4)) : 0;
  const boxCount = props.decks.reduce(
    (sum, entry) => sum + (entry.boxes[box - 1] ?? 0),
    0,
  );
  // Zuordnen und Test gibt es nur für einen Stapel mit genug Karten (LF-8).
  const formsOffered =
    props.formsVisible === true &&
    deck !== undefined &&
    !box &&
    supportsLearningBoxForms(deck.total);
  const form = formsOffered && (mode === "match" || mode === "test");
  const modes: ReadonlyArray<readonly [LbMode | LbForm, string]> = [
    ["writing", "Schreiben"],
    ["oral", "Mündlich"],
    ...(formsOffered
      ? ([
          ["match", "Zuordnen"],
          ["test", "Test"],
        ] as const)
      : []),
  ];
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
          ? plural(deck.due || deck.fresh || deck.total, "Vokabel", "Vokabeln")
          : "";
  return (
    <Modal title={title} subtitle={subtitle} onClose={props.onCloseSheet}>
      <div className={styles.field}>
        <span className={styles.fieldLabel} id="lb-mode-label">
          Wie willst du üben?
        </span>
        <div
          className={cx(
            styles.segmentSheet,
            modes.length > 2 && styles.segmentWide,
          )}
          role="group"
          aria-labelledby="lb-mode-label"
        >
          {modes.map(([value, label]) => (
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
            Mündlich zählt bis Box 3. Danach musst du schreiben.
          </p>
        ) : null}
        {form && mode === "match" ? (
          <p className={styles.hint}>
            Finde die Paare. Nur üben, nichts wird verschoben.
          </p>
        ) : null}
        {form && mode === "test" ? (
          <p className={styles.hint}>
            Bis zu 10 Fragen. Nur geschriebene Antworten zu Karten, die heute
            dran sind, zählen für deine Boxen.
          </p>
        ) : null}
      </div>
      {directionFromPlan || (form && mode === "match") ? null : (
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
        onClick={() =>
          form && (mode === "match" || mode === "test")
            ? props.onStartForm?.({ scope, form: mode, direction })
            : props.onStart?.({
                scope,
                mode: mode === "oral" ? "oral" : "writing",
                direction,
              })
        }
      >
        Los geht&apos;s
      </button>
    </Modal>
  );
}
