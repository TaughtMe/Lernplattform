"use client";

import { useState, type FormEvent } from "react";
import type { LearningWordStage } from "../../../src/domain/learning-word";
import { WORD_BOX_LIMITS } from "../../../src/domain/word-box";
import { Icon } from "../../ui/icons";
import { Button, IconButton, Notice, ProgressBar } from "../../ui/primitives";
import { Sheet } from "../../ui/sheet";
import styles from "./wortspeicher.module.css";

export type WordBoxTile = {
  id: string;
  title: string;
  kind: "fest" | "eigen" | "unterricht";
  examples: string[];
  total: number;
  secure: number;
  /** Höchste Stufe mit abgeschlossener Runde und deren Bestwert. */
  headline?: { stage: LearningWordStage; bestPercent: number } | undefined;
};

/** Übersicht der Wortboxen (Design 4d und 4f). */
export function OverviewScreen({
  tiles,
  dueCount,
  notice,
  ready,
  newBoxError,
  onStart,
  onMenu,
  onCreate,
  onMixed,
}: {
  tiles: readonly WordBoxTile[];
  dueCount: number;
  notice?: string | undefined;
  /** Erst nach dem Laden der Seite sind die Knöpfe bedienbar. */
  ready: boolean;
  newBoxError?: string | undefined;
  onStart: (id: string) => void;
  onMenu: (id: string) => void;
  onCreate: (title: string) => void;
  onMixed: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (title.trim()) onCreate(title.trim());
  }

  return (
    <section className={styles.screen} aria-labelledby="wortspeicher-title">
      <header className={styles.head}>
        <h1 id="wortspeicher-title" className={styles.title} tabIndex={-1}>
          Wortspeicher
        </h1>
      </header>

      <div className="ui-card ui-card--dark ui-ws__hero">
        <div className="ui-grow">
          <p>
            <span className="ui-ws__hero-count">{dueCount}</span>{" "}
            <span className="ui-ws__hero-label">
              {dueCount === 1 ? "Trainingswort heute" : "Trainingswörter heute"}
            </span>
          </p>
          <p className="ui-small ui-muted">
            {dueCount > 0
              ? "Fällige Wörter aus deinen Runden, quer durch alle Wortboxen."
              : "Noch nichts fällig. Wähle eine Wortbox und starte eine Runde."}
          </p>
        </div>
        <Button
          variant="gold"
          disabled={!ready || dueCount === 0}
          onClick={onMixed}
        >
          Gemischt trainieren
        </Button>
      </div>

      {notice ? (
        <Notice tone="bad" role="status">
          {notice}
        </Notice>
      ) : null}

      <div className={styles.sectionHead}>
        <h2 id="wortboxen-title" className="ui-label">
          Wortboxen · antippen öffnet die Übung
        </h2>
      </div>
      <ul className={styles.tiles} aria-labelledby="wortboxen-title">
        {tiles.map((tile) => (
          <li key={tile.id} className={styles.tile}>
            <button
              type="button"
              className={styles.tileMain}
              disabled={!ready}
              onClick={() => onStart(tile.id)}
            >
              <span className={styles.tileTitle}>{tile.title}</span>
              <span className={styles.tileExamples}>
                {tile.examples.length > 0
                  ? tile.examples.join(", ")
                  : "Noch keine Wörter"}
              </span>
              <span className={styles.tileProgress}>
                <ProgressBar
                  value={tile.secure}
                  max={Math.max(1, tile.total)}
                  label={`${tile.title}: ${tile.secure} von ${tile.total} sicher`}
                  tone="green"
                />
                <span className={styles.tileCount}>
                  {tile.secure} / {tile.total} sicher
                </span>
              </span>
              <span className={styles.tileBest}>
                {tile.headline
                  ? `Stufe ${tile.headline.stage} · Bestwert ${tile.headline.bestPercent} %`
                  : "Noch nicht geübt"}
              </span>
            </button>
            <IconButton
              className={styles.tileMenu}
              label={`Wortliste von ${tile.title}`}
              disabled={!ready}
              onClick={() => onMenu(tile.id)}
            >
              <Icon name="list" size={18} />
            </IconButton>
          </li>
        ))}
        <li className={`${styles.tile} ${styles.tileNew}`}>
          <button
            type="button"
            className={styles.tileMain}
            disabled={!ready}
            onClick={() => {
              setTitle("");
              setCreating(true);
            }}
          >
            <Icon name="plus" size={22} />
            <span className={styles.tileTitle}>Neue Wortbox</span>
          </button>
        </li>
      </ul>

      <Sheet
        open={creating}
        title="Neue Wortbox"
        onClose={() => setCreating(false)}
      >
        <form className="ui-stack" onSubmit={submit}>
          <label className="ui-stack" style={{ ["--gap" as string]: "6px" }}>
            <span className="ui-small ui-muted">Name der Wortbox</span>
            <input
              className="ui-field"
              value={title}
              maxLength={WORD_BOX_LIMITS.titleMax}
              onChange={(event) => setTitle(event.target.value)}
              autoComplete="off"
            />
          </label>
          {newBoxError ? (
            <Notice tone="bad" role="alert">
              {newBoxError}
            </Notice>
          ) : null}
          <div className={styles.actions}>
            <Button type="submit" disabled={!title.trim()}>
              Wortbox anlegen
            </Button>
            <Button variant="ghost" onClick={() => setCreating(false)}>
              Abbrechen
            </Button>
          </div>
        </form>
      </Sheet>
    </section>
  );
}
