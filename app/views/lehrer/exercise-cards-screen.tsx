"use client";

import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import {
  exerciseCardHref,
  exerciseCardTitle,
  MATH_CARD_OPERATIONS,
  MATH_CARD_RANGES,
  type ExerciseCard,
} from "../../../src/domain/exercise-card";
import { LEARNING_WORD_COLLECTIONS } from "../../../src/domain/german-learning-content";
import { LEARNING_WORD_STAGES } from "../../../src/domain/learning-word";
import type { MentalMathOperation } from "../../../src/domain/mental-math";
import {
  MATH_KIND_LABELS,
  MATH_KINDS,
  type MathKindId,
} from "../../../src/domain/mental-math-kinds";
import { cx } from "../parts/parts";
import styles from "./exercise-cards-screen.module.css";
import { manageStyles as m } from "./manage-parts";

/** Obergrenze: zwölf Karten sind vier A4-Seiten à 2 × 3. */
export const MAX_EXERCISE_CARDS = 12;

const OPERATION_LABEL: Record<MentalMathOperation, string> = {
  add: "Plus",
  subtract: "Minus",
  multiply: "Mal",
  divide: "Geteilt",
};

function toggle<T>(list: readonly T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

/**
 * Übungskarten (L25-4, Lehrerseite): Wortbox- und Kopfrechenkarten wählen und
 * als Bogen mit QR-Codes drucken. Nichts ist vorgewählt (Entscheidung 86).
 * Reine Ansicht: Karten, Adresse und Aktionen kommen als Props.
 */
export function ExerciseCardsScreen({
  cards,
  origin,
  onAdd,
  onRemove,
  onPrint,
}: {
  cards: readonly ExerciseCard[];
  /** `window.location.origin`; leer, solange er noch nicht bekannt ist. */
  origin: string;
  onAdd: (card: ExerciseCard) => void;
  onRemove: (index: number) => void;
  onPrint: () => void;
}) {
  const [collectionId, setCollectionId] = useState("");
  const [stage, setStage] = useState("");
  const [operations, setOperations] = useState<MentalMathOperation[]>([]);
  const [range, setRange] = useState("");
  const [kinds, setKinds] = useState<MathKindId[]>([]);
  const full = cards.length >= MAX_EXERCISE_CARDS;

  const stageValue = LEARNING_WORD_STAGES.find(
    (item) => String(item) === stage,
  );
  const rangeValue = MATH_CARD_RANGES.find((item) => String(item) === range);

  return (
    <div className={styles.layout}>
      <div className={cx(m.card, styles.panel, styles.screenOnly)}>
        <fieldset className={styles.group}>
          <legend className={styles.legend}>Wortbox</legend>
          <div className={styles.row}>
            <label className={m.field}>
              Wortbox
              <select
                className={m.select}
                value={collectionId}
                onChange={(event) => setCollectionId(event.target.value)}
              >
                <option value="">Wortbox wählen</option>
                {LEARNING_WORD_COLLECTIONS.map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.title}
                  </option>
                ))}
              </select>
            </label>
            <label className={m.field}>
              Stufe
              <select
                className={m.select}
                value={stage}
                onChange={(event) => setStage(event.target.value)}
              >
                <option value="">Stufe wählen</option>
                {LEARNING_WORD_STAGES.map((item) => (
                  <option key={item} value={item}>
                    Stufe {item}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className={m.soft}
              disabled={full || !collectionId || stageValue === undefined}
              onClick={() => {
                if (!collectionId || stageValue === undefined) return;
                onAdd({ kind: "wortbox", collectionId, stage: stageValue });
              }}
            >
              Wortbox-Karte hinzufügen
            </button>
          </div>
        </fieldset>

        <fieldset className={styles.group}>
          <legend className={styles.legend}>Kopfrechnen: Rechenarten</legend>
          <div className={styles.row}>
            {MATH_CARD_OPERATIONS.map((operation) => (
              <label key={operation} className={styles.check}>
                <input
                  type="checkbox"
                  checked={operations.includes(operation)}
                  onChange={() =>
                    setOperations((list) => toggle(list, operation))
                  }
                />
                {OPERATION_LABEL[operation]}
              </label>
            ))}
          </div>
          <div className={styles.row}>
            <label className={m.field}>
              Zahlenraum
              <select
                className={m.select}
                value={range}
                onChange={(event) => setRange(event.target.value)}
              >
                <option value="">Zahlenraum wählen</option>
                {MATH_CARD_RANGES.map((max) => (
                  <option key={max} value={max}>
                    bis {max}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className={m.soft}
              disabled={full || operations.length === 0 || !rangeValue}
              onClick={() => {
                if (rangeValue === undefined || operations.length === 0) return;
                onAdd({ kind: "kopfrechnen", operations, max: rangeValue });
              }}
            >
              Rechenkarte hinzufügen
            </button>
          </div>
        </fieldset>

        <fieldset className={styles.group}>
          <legend className={styles.legend}>Kopfrechnen: Mittelschule</legend>
          <div className={styles.row}>
            {MATH_KINDS.map((kind) => (
              <label key={kind} className={styles.check}>
                <input
                  type="checkbox"
                  checked={kinds.includes(kind)}
                  onChange={() => setKinds((list) => toggle(list, kind))}
                />
                {MATH_KIND_LABELS[kind]}
              </label>
            ))}
          </div>
          <div className={styles.row}>
            <button
              type="button"
              className={m.soft}
              disabled={full || kinds.length === 0}
              onClick={() => {
                if (kinds.length === 0) return;
                onAdd({ kind: "kopfrechnen", mathKinds: kinds });
              }}
            >
              Karte mit Aufgabenarten hinzufügen
            </button>
          </div>
        </fieldset>
      </div>

      <div className={cx(m.card, styles.panel, styles.screenOnly)}>
        <div className={styles.row}>
          <h2 className={styles.legend}>Auf dem Bogen</h2>
          <span className={m.count}>
            {cards.length} von {MAX_EXERCISE_CARDS}
          </span>
        </div>
        {cards.length === 0 ? (
          <p className={m.hint}>
            Noch keine Karte. Wähle oben eine Übung und füge sie hinzu.
          </p>
        ) : (
          <ul className={styles.list}>
            {cards.map((card, index) => (
              <li key={exerciseCardHref(card)} className={styles.item}>
                <span>{exerciseCardTitle(card)}</span>
                <button
                  type="button"
                  className={m.soft}
                  aria-label={`${exerciseCardTitle(card)} entfernen`}
                  onClick={() => onRemove(index)}
                >
                  Entfernen
                </button>
              </li>
            ))}
          </ul>
        )}
        {full ? (
          <p className={m.hint}>
            Der Bogen ist voll. Entferne eine Karte, um eine andere
            hinzuzufügen.
          </p>
        ) : null}
        <div className={m.actions}>
          <button
            type="button"
            className={m.green}
            disabled={cards.length === 0 || !origin}
            onClick={onPrint}
          >
            Bogen drucken
          </button>
        </div>
      </div>

      {cards.length > 0 && origin ? (
        <ul className={styles.sheet} aria-label="Bogen mit Übungskarten">
          {cards.map((card) => (
            <li key={exerciseCardHref(card)} className={styles.card}>
              <p className={styles.cardTitle}>{exerciseCardTitle(card)}</p>
              <span className={styles.qr}>
                <QRCodeSVG
                  value={`${origin}${exerciseCardHref(card)}`}
                  size={256}
                  level="M"
                  role="img"
                  aria-label={`QR-Code: ${exerciseCardTitle(card)}`}
                />
              </span>
              <p className={styles.scan}>Mit dem Tablet scannen</p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
