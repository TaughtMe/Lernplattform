"use client";

import type { LearningWordStage } from "../../../src/domain/learning-word";
import { Button, Notice } from "../../ui/primitives";
import { Sheet } from "../../ui/sheet";
import {
  BLOCK_SIZES,
  ROUND_SIZES,
  STAGE_COPY,
  type RoundSize,
} from "./stage-copy";
import styles from "./wortspeicher.module.css";

export type StartSheetStage = {
  stage: LearningWordStage;
  /** Bestwert dieser Stufe in dieser Wortbox; leer ohne Runde. */
  bestPercent?: number | undefined;
  recommended: boolean;
  /** Grund, warum die Stufe nicht wählbar ist (z. B. keine deutsche Stimme). */
  disabledHint?: string | undefined;
};

/** Startblatt: Merkstufe, Rundengröße und Starten (Plan 2.3). */
export function StartSheet({
  title,
  strategy,
  detail,
  wordCount,
  stages,
  stage,
  roundSize,
  blockSize,
  starting,
  error,
  onStage,
  onRoundSize,
  onBlockSize,
  onStart,
  onClose,
}: {
  title: string;
  strategy?: string | undefined;
  detail?: string | undefined;
  wordCount: number;
  stages: readonly StartSheetStage[];
  stage: LearningWordStage;
  roundSize: RoundSize;
  blockSize: 1 | 2 | 3 | 5;
  starting?: boolean | undefined;
  error?: string | undefined;
  onStage: (stage: LearningWordStage) => void;
  onRoundSize: (size: RoundSize) => void;
  onBlockSize: (size: 1 | 2 | 3 | 5) => void;
  onStart: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet open title={title} onClose={onClose}>
      <div className="ui-stack">
        {strategy ? (
          <p className="ui-small ui-muted">
            Strategie: <strong>{strategy}</strong>
            {detail ? ` · ${detail}` : null}
          </p>
        ) : null}
        <p className="ui-small ui-muted">
          {wordCount === 1 ? "1 Wort" : `${wordCount} Wörter`} in dieser Wortbox
        </p>

        <h3 className="ui-label" id="stufen-title">
          Merkstufe wählen
        </h3>
        <ol className={styles.stages} aria-labelledby="stufen-title">
          {stages.map((entry) => (
            <li key={entry.stage}>
              <button
                type="button"
                className={styles.stageCard}
                aria-pressed={stage === entry.stage}
                disabled={Boolean(entry.disabledHint) || starting}
                onClick={() => onStage(entry.stage)}
              >
                <span className={styles.stageNumber} aria-hidden="true">
                  {entry.stage}
                </span>
                <strong>
                  Stufe {entry.stage}: {STAGE_COPY[entry.stage].title}
                </strong>
                <small className="ui-tiny ui-muted">
                  {entry.disabledHint ?? STAGE_COPY[entry.stage].detail}
                </small>
                <span className={styles.stageBest}>
                  {entry.bestPercent === undefined
                    ? "Bestwert –"
                    : `Bestwert ${entry.bestPercent} %`}
                  {entry.recommended ? " · empfohlen" : ""}
                </span>
              </button>
            </li>
          ))}
        </ol>

        <div className={styles.settings}>
          <label>
            <span className="ui-tiny ui-muted">Wörter in dieser Runde</span>
            <select
              className="ui-input"
              value={String(roundSize)}
              disabled={starting}
              onChange={(event) =>
                onRoundSize(
                  event.target.value === "all"
                    ? "all"
                    : (Number(event.target.value) as 5 | 10 | 20),
                )
              }
            >
              {ROUND_SIZES.map((size) => (
                <option key={size} value={String(size)}>
                  {size === "all" ? "Alle Wörter" : `${size} Wörter`}
                </option>
              ))}
            </select>
          </label>
          {stage === 5 ? (
            <label>
              <span className="ui-tiny ui-muted">Wörter pro Merkblock</span>
              <select
                className="ui-input"
                value={blockSize}
                disabled={starting}
                onChange={(event) =>
                  onBlockSize(Number(event.target.value) as 1 | 2 | 3 | 5)
                }
              >
                {BLOCK_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        {error ? <Notice role="alert">{error}</Notice> : null}

        <div className={styles.actions}>
          <Button
            size="lg"
            disabled={wordCount === 0 || starting}
            onClick={onStart}
          >
            {starting && stage === 6 ? "Stimme wird vorbereitet …" : "Starten"}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
