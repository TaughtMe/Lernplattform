"use client";

import { useState } from "react";
import { supportsLearningBoxForms } from "../../../../src/domain/learning-box-forms";
import { cx } from "../../parts/parts";
import { plural } from "./format";
import { Modal } from "./modal";
import type { LbDirection, LbKind, LernBoxScreenProps } from "./types";
import styles from "../lernbox-screen.module.css";

/** Reihenfolge der Fragearten, egal in welcher Reihenfolge sie angetippt werden. */
const KIND_ORDER: readonly LbKind[] = ["writing", "oral", "choice"];

export function StartSheet(props: LernBoxScreenProps & { scope: string }) {
  const { scope } = props;
  // Eine oder mehrere Fragearten (LF-3); Zuordnen ist eine eigene Lernform.
  const [kinds, setKinds] = useState<readonly LbKind[]>([props.mode]);
  const [matchOn, setMatchOn] = useState(false);
  // Die Vorgabe (zuletzt geübte Art) ist nur ein Vorschlag: Der erste Tipp ersetzt sie.
  const [touched, setTouched] = useState(false);
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
  // Auswahl und Zuordnen gibt es nur für einen Stapel mit genug Karten (LF-8).
  const formsOffered =
    props.formsVisible === true &&
    deck !== undefined &&
    !box &&
    supportsLearningBoxForms(deck.total);
  const match = formsOffered && matchOn;
  const buttons: ReadonlyArray<readonly [LbKind | "match", string]> = [
    ["writing", "Schreiben"],
    ["oral", "Mündlich"],
    ...(formsOffered
      ? ([
          ["choice", "Auswahl"],
          ["match", "Zuordnen"],
        ] as const)
      : []),
  ];
  const pressed = (value: LbKind | "match") =>
    value === "match" ? match : !match && kinds.includes(value);
  function pick(value: LbKind | "match") {
    if (value === "match") return setMatchOn(true);
    setMatchOn(false);
    setTouched(true);
    // Ohne Auswahl und Zuordnen gibt es nur eine Frageart.
    if (!formsOffered || match || !touched) return setKinds([value]);
    setKinds((current) => {
      if (!current.includes(value))
        return KIND_ORDER.filter(
          (kind) => kind === value || current.includes(kind),
        );
      // Mindestens eine bleibt gewählt.
      return current.length > 1
        ? current.filter((kind) => kind !== value)
        : current;
    });
  }
  function start() {
    const [first] = kinds;
    if (match) props.onStartForm?.({ scope, form: "match", direction });
    else if (kinds.length === 1 && (first === "writing" || first === "oral"))
      props.onStart?.({ scope, mode: first, direction });
    else props.onStartMixed?.({ scope, kinds, direction });
  }
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
            buttons.length > 2 && styles.segmentWide,
          )}
          role="group"
          aria-labelledby="lb-mode-label"
        >
          {buttons.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={pressed(value) ? styles.segOn : styles.segOff}
              aria-pressed={pressed(value)}
              onClick={() => pick(value)}
            >
              {label}
            </button>
          ))}
        </div>
        {formsOffered && !match ? (
          <p className={styles.hint}>
            Du kannst mehrere wählen. Sie wechseln sich ab.
          </p>
        ) : null}
        {!match && kinds.includes("oral") && !box ? (
          <p className={styles.hint}>
            Mündlich zählt bis Box 3. Danach musst du schreiben.
          </p>
        ) : null}
        {!match && kinds.includes("choice") ? (
          <p className={styles.hint}>
            Auswahl: Such die richtige von vier Antworten. Das ändert deine
            Boxen nicht.
          </p>
        ) : null}
        {match ? (
          <p className={styles.hint}>
            Finde die Paare. Nur üben, nichts wird verschoben.
          </p>
        ) : null}
      </div>
      {directionFromPlan || match ? null : (
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
      <button type="button" className={styles.cta} onClick={start}>
        Los geht&apos;s
      </button>
    </Modal>
  );
}
