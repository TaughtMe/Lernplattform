"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ANIMALS, animalFileName } from "../../../src/domain/learner-profile";
import { TEXTBOX_WORKSHEET_PATH } from "../../../src/domain/practice-bridge";
import {
  EMPTY_TEXTBOX_FILTER,
  TEXTBOX_STAND_LABELS,
  activeFilterChips,
  matchesTextboxFilter,
  phenomenaInLibrary,
  removeFilterChip,
  type TextboxFilter,
} from "../../../src/domain/textbox-filter";
import {
  textboxStand,
  type TextboxStand,
  type TextboxTextSummary,
} from "../../../src/domain/textbox-progress";
import type { TextboxSession } from "../../../src/domain/textbox-session";
import {
  TEXTBOX_DIFFICULTIES,
  TEXTBOX_DIFFICULTY_LABELS,
  TEXTBOX_PHENOMENON_LABELS,
  type TextboxDifficulty,
  type TextboxPhenomenon,
  type TextboxText,
} from "../../../src/domain/textbox-text";
import { Icon } from "../../ui/icons";
import { Button, ButtonLink, Notice } from "../../ui/primitives";
import { cx } from "../parts/parts";
import styles from "./library-screen.module.css";

/** Vorschläge nach einer Wortspeicher-Übung (Plan 2.22). */
export type LibraryBridge = {
  /** Anzahl der mitgebrachten Wörter. */
  total: number;
  suggestions: readonly { text: TextboxText; matches: readonly string[] }[];
};

export type LibraryEntry = {
  text: TextboxText;
  summary: TextboxTextSummary | undefined;
  open: TextboxSession | undefined;
};

const STANDS: readonly TextboxStand[] = ["neu", "begonnen", "gemeistert"];

function matchSentence(matches: number, total: number) {
  if (total === 1) return "Enthält dein Wort.";
  return `Enthält ${matches} deiner ${total} Wörter.`;
}

/** Durchgang, in dem eine angefangene Einheit weitergeht (1 bis 4). */
function openRound(session: TextboxSession) {
  return Math.min(4, session.rounds.length + 1);
}

function levelNumber(difficulty: TextboxDifficulty) {
  return TEXTBOX_DIFFICULTIES.indexOf(difficulty) + 1;
}

function LevelDots({
  level,
  className,
}: {
  level: number;
  className?: string;
}) {
  return (
    <span className={cx(styles.dots, className)} aria-hidden="true">
      {[1, 2, 3].map((k) => (
        <span key={k} className={k <= level ? styles.dotOn : styles.dotOff} />
      ))}
    </span>
  );
}

/** Statuspille einer Karte: offener Durchgang, gemeistert, Bestwert oder neu. */
function statusOf(entry: LibraryEntry, stand: TextboxStand) {
  const best = entry.summary?.bestPercent;
  if (entry.open) {
    return {
      label: `Durchgang ${openRound(entry.open)} offen`,
      tone: styles.pillOpen,
    };
  }
  if (stand === "gemeistert") {
    return { label: "Gemeistert", tone: styles.pillDone };
  }
  if (stand === "begonnen" && best !== undefined) {
    return { label: `Bestwert ${best} %`, tone: styles.pillBest };
  }
  return { label: "Neu", tone: styles.pillNew };
}

/** Tier, das über einer Linie lugt (rein schmückend, erst nach der Hydrierung gewählt). */
function Peek() {
  const [animal, setAnimal] = useState<string | undefined>(undefined);
  const pick = () =>
    animalFileName(ANIMALS[Math.floor(Math.random() * ANIMALS.length)]!.name);
  useEffect(() => {
    // Zufall erst im Browser: Server und Client erzeugen so dasselbe HTML.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- der Zufall darf erst im Browser entstehen, sonst weicht das Server-HTML ab
    setAnimal(pick());
  }, []);
  return (
    <span className={styles.peek} data-peek aria-hidden="true">
      {animal ? (
        // eslint-disable-next-line @next/next/no-img-element -- Tier-SVG in fester Größe, keine Bildoptimierung nötig
        <img
          src={`/animals/${animal}.svg`}
          alt=""
          className={styles.peekAnimal}
          onAnimationIteration={() => setAnimal(pick())}
        />
      ) : null}
      <span className={styles.peekLine} />
    </span>
  );
}

/** Auswahl der Texte: Weitermachen, Filter und Kartenraster (Design 9b/9c). */
export function LibraryScreen({
  entries,
  pending,
  notice,
  onStart,
  onResume,
  onRestart,
  onCancelPending,
  onDetails,
  bridge,
  initialPhenomenon,
  onStartSuggested,
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
  bridge?: LibraryBridge | undefined;
  initialPhenomenon?: TextboxPhenomenon | undefined;
  onStartSuggested?:
    ((textId: string, matches: readonly string[]) => void) | undefined;
}) {
  const [filter, setFilter] = useState<TextboxFilter>(() => ({
    ...EMPTY_TEXTBOX_FILTER,
    phenomena: initialPhenomenon ? [initialPhenomenon] : [],
  }));
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"desktop" | "mobile">("desktop");
  const [sheetKind, setSheetKind] = useState<"thema" | "stand">("thema");
  const standButton = useRef<HTMLButtonElement>(null);
  const openerOf = (kind: "thema" | "stand") =>
    kind === "stand" ? standButton : phenomenonButton;
  const sheetKindRef = useRef<"thema" | "stand">("thema");
  useEffect(() => {
    sheetKindRef.current = sheetKind;
  });
  const probe = useRef<HTMLSpanElement>(null);
  const phenomenonButton = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const sheetId = useId();

  const rated = entries.map((entry) => ({
    ...entry,
    stand: textboxStand(entry.summary, entry.open !== undefined),
  }));
  const visible = rated.filter((entry) =>
    matchesTextboxFilter(entry.text, entry.stand, filter),
  );
  const resumable = rated.filter((entry) => entry.open !== undefined);
  const phenomena = phenomenaInLibrary(entries.map((entry) => entry.text));
  const standCounts = Object.fromEntries(
    STANDS.map((stand) => [
      stand,
      rated.filter((entry) => entry.stand === stand).length,
    ]),
  ) as Record<TextboxStand, number>;
  const chips = activeFilterChips(filter);
  const countText =
    visible.length === entries.length
      ? `${entries.length} Texte`
      : `${visible.length} von ${entries.length} Texten`;

  // Öffnen und Schließen des Schwerpunkt-Feldes: ab 900 px Breite als
  // Aufklappfeld (ohne Modalität), darunter als Blatt von unten.
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (sheetOpen && !element.open) {
      if (sheetMode === "mobile" && typeof element.showModal === "function") {
        element.showModal();
      } else if (typeof element.show === "function") {
        element.show();
      } else {
        element.setAttribute("open", "");
      }
    }
    if (!sheetOpen && element.open) {
      if (typeof element.close === "function") element.close();
      else element.removeAttribute("open");
    }
  }, [sheetOpen, sheetMode]);

  // Klick außerhalb schließt das Aufklappfeld (das Blatt schließt über den Hintergrund).
  useEffect(() => {
    if (!sheetOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        dialog.current?.contains(target) ||
        phenomenonButton.current?.contains(target) ||
        standButton.current?.contains(target)
      ) {
        return;
      }
      setSheetOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setSheetOpen(false);
      openerOf(sheetKind).current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [sheetOpen, sheetKind]);

  // Klick auf den Hintergrund (::backdrop) trifft das Dialog-Element selbst.
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const onClick = (event: MouseEvent) => {
      if (event.target === element) {
        setSheetOpen(false);
        openerOf(sheetKindRef.current).current?.focus();
      }
    };
    element.addEventListener("click", onClick);
    return () => element.removeEventListener("click", onClick);
  }, []);

  function closeSheet() {
    setSheetOpen(false);
    openerOf(sheetKind).current?.focus();
  }

  function toggleSheet(kind: "thema" | "stand") {
    if (sheetOpen && sheetKind === kind) {
      closeSheet();
      return;
    }
    setSheetKind(kind);
    const desktop =
      probe.current !== null &&
      getComputedStyle(probe.current).display !== "none";
    setSheetMode(desktop ? "desktop" : "mobile");
    setSheetOpen(true);
  }

  function togglePhenomenon(id: TextboxPhenomenon) {
    setFilter((current) => ({
      ...current,
      phenomena: current.phenomena.includes(id)
        ? current.phenomena.filter((entry) => entry !== id)
        : [...current.phenomena, id],
    }));
  }

  function toggleStand(stand: TextboxStand) {
    setFilter((current) => ({
      ...current,
      stands: current.stands.includes(stand)
        ? current.stands.filter((entry) => entry !== stand)
        : [...current.stands, stand],
    }));
  }

  function pickDifficulty(difficulty: TextboxDifficulty) {
    setFilter((current) => ({
      ...current,
      difficulty: current.difficulty === difficulty ? undefined : difficulty,
    }));
  }

  const selectedLevel = filter.difficulty ? levelNumber(filter.difficulty) : 0;

  return (
    <section className={styles.screen} aria-labelledby="textbox-title">
      <span ref={probe} className={styles.probe} aria-hidden="true" />
      <header className={styles.head}>
        <h1 id="textbox-title" className={styles.title} tabIndex={-1}>
          Textbox
        </h1>
        <input
          type="search"
          className={styles.search}
          value={filter.query}
          onChange={(event) =>
            setFilter((current) => ({ ...current, query: event.target.value }))
          }
          placeholder="Text suchen …"
          aria-label="Text suchen"
          autoComplete="off"
        />
      </header>
      {notice ? <Notice tone="bad">{notice}</Notice> : null}
      {pending ? (
        <div
          className={styles.card}
          role="group"
          aria-label="Angefangene Übung"
        >
          <p className={styles.noticeTitle}>
            Du hast „{pending.text.title}“ schon angefangen.
          </p>
          <p className={styles.noticeText}>
            Du bist bei Durchgang {pending.open ? openRound(pending.open) : 1}{" "}
            von 4. „Neu beginnen“ verwirft die angefangene Übung.
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
      {bridge ? (
        <section className={styles.card} aria-labelledby="textbox-suggestions">
          <h2 id="textbox-suggestions" className={styles.sectionTitle}>
            Passende Texte zu deinen Wörtern
          </h2>
          {bridge.suggestions.length === 0 ? (
            <p className={styles.noticeText}>
              Zu deinen Wörtern gibt es noch keinen passenden Text. Such dir
              unten einen Text aus.
            </p>
          ) : (
            <ul className={styles.suggestions} aria-label="Vorschläge">
              {bridge.suggestions.map(({ text, matches }) => (
                <li key={text.id} className={styles.suggestion}>
                  <div>
                    <h3 className={styles.suggestionTitle}>{text.title}</h3>
                    <p className={styles.noticeText}>
                      {matchSentence(matches.length, bridge.total)}
                    </p>
                  </div>
                  <Button
                    aria-label={`${text.title} mit deinen Wörtern üben`}
                    onClick={() => onStartSuggested?.(text.id, matches)}
                  >
                    Üben
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
      {resumable.length > 0 ? (
        <section className={styles.resume} aria-labelledby="textbox-resume">
          <h2 id="textbox-resume" className={styles.resumeTitle}>
            Weitermachen
          </h2>
          <ul className={styles.resumeGrid} aria-label="Angefangene Übungen">
            {resumable.map(({ text, open }) => {
              const round = openRound(open!);
              return (
                <li key={text.id} className={styles.resumeCard}>
                  <span className={styles.resumeText}>
                    <span className={styles.resumeName}>{text.title}</span>
                    <span className={styles.resumeSub}>
                      {TEXTBOX_DIFFICULTY_LABELS[text.difficulty]} ·{" "}
                      {TEXTBOX_PHENOMENON_LABELS[text.phenomena[0]!]}
                    </span>
                  </span>
                  <Button
                    className={styles.resumeButton}
                    aria-label={`${text.title} fortsetzen`}
                    onClick={() => onResume(text.id)}
                  >
                    Fortsetzen
                  </Button>
                  <span className={styles.resumeProgress}>
                    <span className={styles.segments} aria-hidden="true">
                      {[1, 2, 3, 4].map((k) => (
                        <span
                          key={k}
                          className={
                            k < round
                              ? styles.segDone
                              : k === round
                                ? styles.segNow
                                : styles.segTodo
                          }
                        />
                      ))}
                    </span>
                    <span className={styles.resumeRound}>
                      Durchgang {round} von 4
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
      <div className={styles.filterArea}>
        <div className={styles.filterBar}>
          <div className={cx(styles.filterGroup, styles.levelGroup)}>
            <span className={styles.filterLabel} aria-hidden="true">
              Schwierigkeit
            </span>
            <div
              className={styles.segmented}
              role="group"
              aria-label="Schwierigkeit"
            >
              <span className={styles.levelShort} aria-hidden="true">
                Stufe
              </span>
              <span className={styles.dotButtons}>
                {TEXTBOX_DIFFICULTIES.map((difficulty) => {
                  const level = levelNumber(difficulty);
                  return (
                    <button
                      key={difficulty}
                      type="button"
                      className={styles.dotButton}
                      aria-label={TEXTBOX_DIFFICULTY_LABELS[difficulty]}
                      aria-pressed={
                        filter.difficulty === difficulty ? true : undefined
                      }
                      title={TEXTBOX_DIFFICULTY_LABELS[difficulty]}
                      onClick={() => pickDifficulty(difficulty)}
                    >
                      <span
                        className={
                          level <= selectedLevel
                            ? styles.levelDotOn
                            : styles.levelDot
                        }
                      />
                    </button>
                  );
                })}
              </span>
            </div>
          </div>
          <div className={cx(styles.filterGroup, styles.standGroup)}>
            <span className={styles.filterLabel} aria-hidden="true">
              Stand
            </span>
            <div className={styles.segmented} role="group" aria-label="Stand">
              {STANDS.map((stand) => (
                <button
                  key={stand}
                  type="button"
                  className={styles.segment}
                  aria-pressed={filter.stands.includes(stand)}
                  onClick={() => toggleStand(stand)}
                >
                  {TEXTBOX_STAND_LABELS[stand]}
                </button>
              ))}
            </div>
            <button
              ref={standButton}
              type="button"
              className={cx(
                styles.phenomenonButton,
                styles.standButton,
                (sheetOpen && sheetKind === "stand") || filter.stands.length > 0
                  ? styles.phenomenonActive
                  : undefined,
              )}
              aria-expanded={sheetOpen && sheetKind === "stand"}
              aria-controls={sheetId}
              onClick={() => toggleSheet("stand")}
            >
              {filter.stands.length > 0
                ? `Stand · ${filter.stands.length}`
                : "Stand"}
            </button>
          </div>
          <div className={cx(styles.filterGroup, styles.phenomenonGroup)}>
            <button
              ref={phenomenonButton}
              type="button"
              className={cx(
                styles.phenomenonButton,
                ((sheetOpen && sheetKind === "thema") ||
                  filter.phenomena.length > 0) &&
                  styles.phenomenonActive,
              )}
              aria-expanded={sheetOpen && sheetKind === "thema"}
              aria-controls={sheetId}
              onClick={() => toggleSheet("thema")}
            >
              {filter.phenomena.length > 0
                ? `Thema · ${filter.phenomena.length}`
                : "Thema"}
              <Icon name="down" size={16} strokeWidth={2.2} />
            </button>
            <dialog
              ref={dialog}
              id={sheetId}
              className={styles.sheet}
              aria-label={sheetKind === "stand" ? "Stand" : "Thema"}
              onCancel={(event) => {
                // Escape: der Aufruf schließt, nicht der Browser.
                event.preventDefault();
                closeSheet();
              }}
            >
              <span className={styles.sheetHandle} aria-hidden="true" />
              <span className={styles.sheetTitle} aria-hidden="true">
                {sheetKind === "stand" ? "Stand" : "Thema"}
              </span>
              <fieldset className={styles.sheetList}>
                <legend className="ui-sr-only">
                  {sheetKind === "stand" ? "Stand" : "Thema"}
                </legend>
                {sheetKind === "stand"
                  ? STANDS.map((stand) => (
                      <label key={stand} className={styles.option}>
                        <input
                          type="checkbox"
                          className={styles.optionInput}
                          checked={filter.stands.includes(stand)}
                          onChange={() => toggleStand(stand)}
                        />
                        <span className={styles.optionBox} aria-hidden="true">
                          <Icon name="check" size={14} strokeWidth={3} />
                        </span>
                        <span className={styles.optionLabel}>
                          {TEXTBOX_STAND_LABELS[stand]}
                        </span>
                        <span className={styles.optionCount}>
                          {standCounts[stand]}
                        </span>
                      </label>
                    ))
                  : phenomena.map(({ id, label, count }) => (
                      <label key={id} className={styles.option}>
                        <input
                          type="checkbox"
                          className={styles.optionInput}
                          checked={filter.phenomena.includes(id)}
                          onChange={() => togglePhenomenon(id)}
                        />
                        <span className={styles.optionBox} aria-hidden="true">
                          <Icon name="check" size={14} strokeWidth={3} />
                        </span>
                        <span className={styles.optionLabel}>{label}</span>
                        <span className={styles.optionCount}>{count}</span>
                      </label>
                    ))}
              </fieldset>
              <button
                type="button"
                className={styles.sheetDone}
                onClick={closeSheet}
              >
                {sheetMode === "mobile" ? `${countText} anzeigen` : "Fertig"}
              </button>
            </dialog>
          </div>
        </div>
        <p className={styles.count} aria-live="polite">
          {countText}
        </p>
        <div className={styles.strip}>
          {chips.length === 0 ? <Peek /> : null}
          {chips.map((chip) => (
            <button
              key={`${chip.key}:${chip.value}`}
              type="button"
              className={styles.chip}
              aria-label={`Filter „${chip.label}“ entfernen`}
              onClick={() =>
                setFilter((current) =>
                  removeFilterChip(current, chip.key, chip.value),
                )
              }
            >
              <span className={styles.chipFace}>
                {chip.label}
                <Icon name="close" size={12} strokeWidth={2.6} />
              </span>
            </button>
          ))}
          {chips.length > 0 ? (
            <button
              type="button"
              className={styles.clearAll}
              onClick={() =>
                setFilter((current) => ({
                  ...EMPTY_TEXTBOX_FILTER,
                  query: current.query,
                }))
              }
            >
              Alle entfernen
            </button>
          ) : null}
        </div>
      </div>
      {visible.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyText}>Kein Text passt zu diesen Filtern.</p>
          <button
            type="button"
            className={styles.emptyButton}
            onClick={() => setFilter(EMPTY_TEXTBOX_FILTER)}
          >
            Filter zurücksetzen
          </button>
        </div>
      ) : (
        <ul className={styles.grid} aria-label="Texte">
          {visible.map((entry) => {
            const { text, summary, open, stand } = entry;
            const status = statusOf(entry, stand);
            const best = summary?.bestPercent;
            const level = levelNumber(text.difficulty);
            return (
              <li key={text.id} className={styles.item}>
                <article className={styles.cardItem}>
                  <div className={styles.cardTop}>
                    <span className={styles.levelLine}>
                      <LevelDots level={level} />
                      {TEXTBOX_DIFFICULTY_LABELS[text.difficulty]}
                    </span>
                    <span className={cx(styles.pill, status.tone)}>
                      {status.label}
                    </span>
                  </div>
                  <h3 className={styles.cardTitle}>
                    <button
                      type="button"
                      className={styles.cardButton}
                      onClick={() => onStart(text.id)}
                    >
                      {text.title}{" "}
                      <span className="ui-sr-only">
                        {open ? "weiterüben" : "üben"}
                      </span>
                    </button>
                  </h3>
                  <ul className={styles.tags} aria-label="Schwerpunkte">
                    {text.phenomena.map((id) => (
                      <li key={id} className={styles.tag}>
                        {TEXTBOX_PHENOMENON_LABELS[id]}
                      </li>
                    ))}
                  </ul>
                  <div className={styles.best}>
                    <span className={styles.bar} aria-hidden="true">
                      <span
                        className={styles.barFill}
                        style={{ width: `${best ?? 0}%` }}
                      />
                    </span>
                    <span className={styles.bestValue}>
                      <span className="ui-sr-only">Bestwert: </span>
                      {best === undefined ? "–" : `${best} %`}
                      <span className="ui-sr-only">
                        {" "}
                        ({summary?.sessions ?? 0}{" "}
                        {(summary?.sessions ?? 0) === 1 ? "Übung" : "Übungen"})
                      </span>
                    </span>
                  </div>
                  <div className={styles.cardFoot}>
                    <LevelDots level={level} />
                    <span className={styles.footText}>
                      {TEXTBOX_PHENOMENON_LABELS[text.phenomena[0]!]}
                    </span>
                  </div>
                  {summary ? (
                    <button
                      type="button"
                      className={styles.history}
                      data-history
                      aria-label={`${text.title}: Verlauf ansehen`}
                      onClick={() => onDetails(text.id)}
                    >
                      Verlauf
                    </button>
                  ) : null}
                </article>
              </li>
            );
          })}
        </ul>
      )}
      <div className={styles.foot}>
        <ButtonLink variant="link" href={TEXTBOX_WORKSHEET_PATH}>
          Laufzettel ansehen und drucken
        </ButtonLink>
      </div>
    </section>
  );
}
