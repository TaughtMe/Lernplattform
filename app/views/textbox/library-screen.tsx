"use client";

import { useState } from "react";
import type { TextboxTextSummary } from "../../../src/domain/textbox-progress";
import type { TextboxSession } from "../../../src/domain/textbox-session";
import {
  TEXTBOX_DIFFICULTY_LABELS,
  TEXTBOX_PHENOMENA,
  TEXTBOX_PHENOMENON_LABELS,
  type TextboxDifficulty,
  type TextboxPhenomenon,
  type TextboxText,
} from "../../../src/domain/textbox-text";
import {
  Button,
  EmptyState,
  Notice,
  Pill,
  Segmented,
} from "../../ui/primitives";
import styles from "./textbox.module.css";

export type LibraryEntry = {
  text: TextboxText;
  summary: TextboxTextSummary | undefined;
  open: TextboxSession | undefined;
};

type DifficultyFilter = TextboxDifficulty | "alle";
type StatusFilter = "alle" | "neu" | "geuebt";

/** Bibliothek und Laufzettel in einem: Filter, Bestwert und angefangene Übungen. */
export function LibraryScreen({
  entries,
  pending,
  notice,
  onStart,
  onResume,
  onRestart,
  onCancelPending,
  onDetails,
}: {
  entries: readonly LibraryEntry[];
  /** Text mit angefangener Einheit, für den „Fortsetzen“ angeboten wird. */
  pending: LibraryEntry | undefined;
  notice?: string | undefined;
  onStart: (textId: string) => void;
  onResume: (textId: string) => void;
  onRestart: (textId: string) => void;
  onCancelPending: () => void;
  onDetails: (textId: string) => void;
}) {
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("alle");
  const [phenomenon, setPhenomenon] = useState<TextboxPhenomenon | "alle">(
    "alle",
  );
  const [status, setStatus] = useState<StatusFilter>("alle");

  const visible = entries.filter(({ text, summary }) => {
    if (difficulty !== "alle" && text.difficulty !== difficulty) return false;
    if (phenomenon !== "alle" && !text.phenomena.includes(phenomenon)) {
      return false;
    }
    if (status === "neu" && summary) return false;
    if (status === "geuebt" && !summary) return false;
    return true;
  });

  return (
    <section className={styles.screen} aria-labelledby="textbox-title">
      <header>
        <h1 id="textbox-title" className={styles.title} tabIndex={-1}>
          Textbox
        </h1>
        <p className={styles.subtitle}>
          Wähle einen Text. Du liest ihn, schreibst ihn viermal mit immer
          weniger Hilfe auf und siehst deinen Bestwert.
        </p>
      </header>
      {notice ? <Notice tone="bad">{notice}</Notice> : null}
      {pending ? (
        <div
          className={styles.resume}
          role="group"
          aria-label="Angefangene Übung"
        >
          <p className={styles.resumeTitle}>
            Du hast „{pending.text.title}“ schon angefangen.
          </p>
          <p className={styles.hint}>
            Du bist bei Durchgang{" "}
            {Math.min(4, (pending.open?.rounds.length ?? 0) + 1)} von 4. „Neu
            beginnen“ verwirft die angefangene Übung.
          </p>
          <div className={styles.actions}>
            <Button onClick={() => onResume(pending.text.id)}>
              Fortsetzen
            </Button>
            <Button variant="ghost" onClick={() => onRestart(pending.text.id)}>
              Neu beginnen
            </Button>
            <Button variant="link" onClick={onCancelPending}>
              Abbrechen
            </Button>
          </div>
        </div>
      ) : null}
      <div className={styles.filters}>
        <Segmented<DifficultyFilter>
          label="Schwierigkeit"
          value={difficulty}
          onChange={setDifficulty}
          options={[
            { value: "alle", label: "Alle" },
            ...(["leicht", "mittel", "schwer"] as const).map((value) => ({
              value,
              label: TEXTBOX_DIFFICULTY_LABELS[value],
            })),
          ]}
        />
        <label className={styles.field}>
          Schwerpunkt
          <select
            className={styles.select}
            value={phenomenon}
            onChange={(event) =>
              setPhenomenon(event.target.value as TextboxPhenomenon | "alle")
            }
          >
            <option value="alle">Alle Schwerpunkte</option>
            {TEXTBOX_PHENOMENA.map((value) => (
              <option key={value} value={value}>
                {TEXTBOX_PHENOMENON_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          Status
          <select
            className={styles.select}
            value={status}
            onChange={(event) => setStatus(event.target.value as StatusFilter)}
          >
            <option value="alle">Alle Texte</option>
            <option value="neu">Neu</option>
            <option value="geuebt">Geübt</option>
          </select>
        </label>
      </div>
      {visible.length === 0 ? (
        <EmptyState title="Keine passenden Texte">
          Ändere die Auswahl, um mehr Texte zu sehen.
        </EmptyState>
      ) : (
        <ul className={styles.list} aria-label="Texte">
          {visible.map(({ text, summary, open }) => (
            <li key={text.id} className={styles.row}>
              <div>
                <h2 className={styles.rowTitle}>{text.title}</h2>
                <div className={styles.meta}>
                  <Pill>{TEXTBOX_DIFFICULTY_LABELS[text.difficulty]}</Pill>
                  {text.phenomena.map((value) => (
                    <Pill key={value}>{TEXTBOX_PHENOMENON_LABELS[value]}</Pill>
                  ))}
                  {open ? <Pill tone="accent">Angefangen</Pill> : null}
                </div>
              </div>
              <p className={styles.best}>
                {summary?.sessions ?? 0}{" "}
                {(summary?.sessions ?? 0) === 1 ? "Übung" : "Übungen"}
                <span className={styles.bestValue}>
                  <span className="ui-sr-only">Bestwert: </span>
                  {summary?.bestPercent === undefined
                    ? "–"
                    : `${summary.bestPercent} %`}
                </span>
              </p>
              <Button
                className={styles.rowAction}
                variant={open ? "ghost" : "primary"}
                aria-label={`${text.title} ${open ? "weiterüben" : "üben"}`}
                onClick={() => onStart(text.id)}
              >
                {open ? "Weiter" : summary ? "Nochmal" : "Üben"}
              </Button>
              {summary ? (
                <Button
                  className={styles.rowAction}
                  variant="soft"
                  aria-label={`${text.title}: Verlauf ansehen`}
                  onClick={() => onDetails(text.id)}
                >
                  Verlauf
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
