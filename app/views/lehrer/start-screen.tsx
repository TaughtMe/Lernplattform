"use client";

import Link from "next/link";
import { useState, type KeyboardEvent } from "react";
import { cx } from "../parts/parts";
import styles from "./start-screen.module.css";

export type StartKind = "text" | "vocabulary" | "math";

export type StartTab = "prepared" | "archive";

export type StartClassChip = {
  /** Kurzname, z. B. „7b“. */
  label: string;
  /** Die gewählte Klasse ist hervorgehoben. */
  own: boolean;
};

export type StartRow = {
  id: string;
  title: string;
  kind: StartKind;
  /** Modus · Optionen (vorbereitet) bzw. Modus · durchgeführt-Datum (Archiv). */
  meta: string;
  classes: readonly StartClassChip[];
  /**
   * Gehört auch zu anderen Klassen: Löschen bietet dann „Aus 7b entfernen“
   * an, weil es ein Eintrag für alle Klassen ist, keine Kopie.
   */
  shared?: boolean;
};

export type StartSource = { id: string; label: string; count: number };

export type StartOtherRow = {
  id: string;
  title: string;
  kind: StartKind;
  /** z. B. „18 Vokabeln · noch nie durchgeführt“. */
  meta: string;
  /** Gerade zur eigenen Klasse geholt („✓ Bei 7b“). */
  added: boolean;
};

export type StartOther = {
  sources: readonly StartSource[];
  source: string;
  onSource?: (id: string) => void;
  query: string;
  onQuery?: (query: string) => void;
  rows: readonly StartOtherRow[];
  emptyText: string;
  /** „+ Auch für 7b“: die eigene Klasse dazunehmen. */
  onAdd?: (id: string) => void;
  /** „✓ Bei 7b“ noch einmal: die eigene Klasse wieder abnehmen. */
  onRemove?: (id: string) => void;
};

export type StartRoom = {
  /** Raumcode. */
  code: string;
  /** Zusatz, z. B. „18 von 24“; ohne Angabe nur der Code. */
  detail?: string;
  href: string;
};

export type StartScreenProps = {
  /** Zeile über dem Titel, z. B. „Klasse 7b · Start“. */
  eyebrow: string;
  /** Kurzname der gewählten Klasse („7b“); ohne Angabe „Nicht zugeordnet“. */
  classShort?: string;
  /** Laufender Raum dieses Browserfensters; ohne Angabe fehlt der Hinweis. */
  room?: StartRoom;
  /** Ziele der drei Kacheln (Schritt 1 des Editors). */
  createHref: Record<StartKind, string>;
  tab: StartTab;
  onTab?: (tab: StartTab) => void;
  prepared: readonly StartRow[];
  archived: readonly StartRow[];
  /** Text für einen leeren Reiter. */
  emptyText: Record<StartTab, string>;
  onStart?: (id: string) => void;
  onEdit?: (id: string) => void;
  /** `class`: nur aus der gewählten Klasse nehmen, `all`: ganz löschen. */
  onDelete?: (id: string, scope: "class" | "all") => void;
  /** Archiv: „Wieder vorbereiten“. */
  onPrepareAgain?: (id: string) => void;
  /** „Aus anderen Klassen holen“; ohne Angabe fehlt der Abschnitt. */
  other?: StartOther;
  /** Hinweis am Ende der Seite, z. B. zum Schutz der lokalen Daten. */
  notice?: string;
};

const KINDS: Record<StartKind, { label: string; glyph: string; cta: string }> =
  {
    text: { label: "Text", glyph: "Aa", cta: "Text einfügen" },
    vocabulary: { label: "Vokabeln", glyph: "⇄", cta: "Vokabeln eingeben" },
    math: { label: "Mathe", glyph: "±", cta: "Aufgaben erzeugen" },
  };
const KIND_ORDER: readonly StartKind[] = ["text", "vocabulary", "math"];

/** So viele Zeilen zeigt das Handy, bevor „Alle N anzeigen“ erscheint. */
const PHONE_ROWS = 4;

/**
 * Startseite des Lehrerbereichs (Lehrerbereich v2, 15a Desktop, 15c Tablet,
 * 15d Handy): oben drei Kacheln für ein neues Laufdiktat, darunter die Reiter
 * „Vorbereitet“ und „Archiv“ der gewählten Klasse und unten „Aus anderen
 * Klassen holen“. Läuft im `TeacherFrame` (Layout `page`) und reagiert auf
 * dessen Breite.
 */
export function StartScreen(props: StartScreenProps) {
  const { tab, classShort, other } = props;
  const [expanded, setExpanded] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const rows = tab === "prepared" ? props.prepared : props.archived;
  const own = classShort ?? "";

  function tabKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next: StartTab = tab === "prepared" ? "archive" : "prepared";
    props.onTab?.(next);
    document.getElementById(`start-tab-${next}`)?.focus();
  }

  const tabs: ReadonlyArray<{
    id: StartTab;
    long: string;
    short: string;
    count: number;
  }> = [
    {
      id: "prepared",
      long: classShort ? `Vorbereitet für ${classShort}` : "Vorbereitet",
      short: "Vorbereitet",
      count: props.prepared.length,
    },
    {
      id: "archive",
      long: "Archiv · durchgeführt",
      short: "Archiv",
      count: props.archived.length,
    },
  ];

  return (
    <div className={styles.start}>
      <section className={styles.stage} aria-labelledby="start-title">
        <div className={styles.stageHead}>
          <div className={styles.titleBlock}>
            <p className={styles.eyebrow}>{props.eyebrow}</p>
            <h1 id="start-title" className={styles.title}>
              Neues Laufdiktat
            </h1>
          </div>
          {props.room ? (
            <div className={styles.roomPill}>
              <span className={styles.roomState}>
                <span className={styles.liveDot} aria-hidden="true" />
                Raum {props.room.code} läuft
                {props.room.detail ? ` · ${props.room.detail}` : ""}
              </span>
              <Link href={props.room.href} className={styles.roomLink}>
                Zum Raum
              </Link>
            </div>
          ) : null}
        </div>
        <div className={styles.tiles}>
          {KIND_ORDER.map((kind) => (
            <Link
              key={kind}
              href={props.createHref[kind]}
              className={styles.tile}
            >
              <span className={styles.glyph} aria-hidden="true">
                {KINDS[kind].glyph}
              </span>
              <span className={styles.tileText}>
                <span className={styles.tileLabel}>{KINDS[kind].label}</span>
                <span className={styles.tileCta}>{KINDS[kind].cta}</span>
              </span>
              <svg
                className={styles.tileArrow}
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M5 12h13M13 6.5l5.5 5.5-5.5 5.5" />
              </svg>
            </Link>
          ))}
        </div>
      </section>

      <div className={styles.lower}>
        <section className={styles.listSection} aria-label="Laufdiktate">
          <div
            className={styles.tabBar}
            role="tablist"
            aria-label={
              classShort
                ? `Laufdiktate der Klasse ${classShort}`
                : "Laufdiktate"
            }
          >
            {tabs.map((item) => {
              const active = item.id === tab;
              return (
                <button
                  key={item.id}
                  id={`start-tab-${item.id}`}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-controls="start-panel"
                  tabIndex={active ? 0 : -1}
                  className={cx(styles.tab, active && styles.tabActive)}
                  onClick={() => {
                    setExpanded(false);
                    setConfirmId(null);
                    props.onTab?.(item.id);
                  }}
                  onKeyDown={tabKey}
                >
                  <span className={styles.long}>{item.long}</span>
                  <span className={styles.short}>{item.short}</span>
                  <span className={styles.count}>{item.count}</span>
                </button>
              );
            })}
            <span className={styles.tabHint}>
              {tab === "prepared"
                ? "Nach dem Durchführen wandert es ins Archiv"
                : "Wieder vorbereiten holt es zurück"}
            </span>
          </div>
          <div
            id="start-panel"
            role="tabpanel"
            aria-labelledby={`start-tab-${tab}`}
            className={cx(styles.listBox, !expanded && styles.collapsed)}
          >
            {rows.length === 0 ? (
              <p className={styles.empty}>{props.emptyText[tab]}</p>
            ) : (
              <ul className={styles.rows}>
                {rows.map((row, index) => (
                  <li key={row.id} className={styles.row}>
                    <span className={styles.kindCol}>
                      {KINDS[row.kind].label}
                    </span>
                    <span className={styles.main}>
                      <span className={styles.rowTitle}>{row.title}</span>
                      <span className={styles.rowLine}>
                        <span className={styles.kindInline}>
                          {KINDS[row.kind].label}
                        </span>
                        <span className={styles.meta}>{row.meta}</span>
                        <span className={styles.chipsInline}>
                          <ClassChips chips={row.classes} />
                        </span>
                      </span>
                    </span>
                    <span className={styles.chipsCol}>
                      <ClassChips chips={row.classes} />
                    </span>
                    {confirmId === row.id ? (
                      <span
                        className={styles.confirm}
                        role="group"
                        aria-label={`${row.title} löschen bestätigen`}
                      >
                        {row.shared && own ? (
                          <button
                            type="button"
                            className={styles.confirmButton}
                            onClick={() => {
                              setConfirmId(null);
                              props.onDelete?.(row.id, "class");
                            }}
                          >
                            Aus {own} entfernen
                          </button>
                        ) : (
                          <span>Löschen?</span>
                        )}
                        <button
                          type="button"
                          className={cx(styles.confirmButton, styles.danger)}
                          onClick={() => {
                            setConfirmId(null);
                            props.onDelete?.(row.id, "all");
                          }}
                        >
                          {row.shared && own ? "Überall löschen" : "Ja"}
                        </button>
                        <button
                          type="button"
                          className={styles.confirmButton}
                          onClick={() => setConfirmId(null)}
                        >
                          {row.shared && own ? "Abbrechen" : "Nein"}
                        </button>
                      </span>
                    ) : (
                      <span className={styles.actions}>
                        {tab === "prepared" ? (
                          <button
                            type="button"
                            className={cx(
                              styles.startButton,
                              index === 0 && styles.hot,
                            )}
                            aria-label={`${row.title} starten`}
                            onClick={() => props.onStart?.(row.id)}
                          >
                            <PlayIcon />
                          </button>
                        ) : (
                          <button
                            type="button"
                            className={cx(styles.startButton, styles.again)}
                            aria-label={`${row.title} wieder vorbereiten`}
                            onClick={() => props.onPrepareAgain?.(row.id)}
                          >
                            <AgainIcon />
                            <span className={styles.againText}>
                              Wieder vorbereiten
                            </span>
                          </button>
                        )}
                        <button
                          type="button"
                          className={cx(styles.toolButton, styles.edit)}
                          aria-label={`${row.title} bearbeiten`}
                          onClick={() => props.onEdit?.(row.id)}
                        >
                          <svg
                            className={styles.editIcon}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M4 20h4l10.5-10.5-4-4L4 16z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className={cx(styles.toolButton, styles.remove)}
                          aria-label={`${row.title} löschen`}
                          onClick={() => setConfirmId(row.id)}
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 12.5h9l1-12.5M10 11v5M14 11v5" />
                          </svg>
                        </button>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {rows.length > PHONE_ROWS ? (
              <button
                type="button"
                className={styles.more}
                aria-expanded={expanded}
                aria-controls="start-panel"
                onClick={() => setExpanded((value) => !value)}
              >
                {expanded ? "Weniger anzeigen" : `Alle ${rows.length} anzeigen`}
              </button>
            ) : null}
          </div>
        </section>

        {other ? <OtherSection other={other} own={own} /> : null}

        {props.notice ? <p className={styles.notice}>{props.notice}</p> : null}
      </div>
    </div>
  );
}

function ClassChips({ chips }: { chips: readonly StartClassChip[] }) {
  return chips.map((chip) => (
    <span
      key={chip.label}
      className={cx(styles.chip, chip.own && styles.chipOwn)}
    >
      {chip.label}
    </span>
  ));
}

/** „Aus anderen Klassen holen“: Quelle wählen, suchen, „+ Auch für 7b“. */
function OtherSection({ other, own }: { other: StartOther; own: string }) {
  const searching = other.query.trim() !== "";
  return (
    <section className={styles.other} aria-labelledby="start-other">
      <div className={styles.otherBar}>
        <h2 id="start-other" className={styles.otherLabel}>
          Aus anderen Klassen holen
        </h2>
        <div className={styles.sources} role="group" aria-label="Quelle">
          {other.sources.map((source) => (
            <button
              key={source.id}
              type="button"
              className={cx(
                styles.source,
                !searching && source.id === other.source && styles.sourceActive,
              )}
              aria-pressed={!searching && source.id === other.source}
              onClick={() => other.onSource?.(source.id)}
            >
              {source.label}
              <span className={styles.sourceCount}>{source.count}</span>
            </button>
          ))}
        </div>
        <label className={styles.search}>
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="6.5" />
            <path d="M16 16l4 4" />
          </svg>
          <span className={styles.field}>
            <input
              type="search"
              className={styles.input}
              aria-label="In allen Klassen suchen"
              placeholder=" "
              value={other.query}
              onChange={(event) => other.onQuery?.(event.target.value)}
            />
            <span className={styles.placeholder} aria-hidden="true">
              <span className={styles.searchLong}>In allen suchen</span>
              <span className={styles.searchShort}>Suchen</span>
            </span>
          </span>
        </label>
      </div>
      <div className={styles.otherBox}>
        {other.rows.length === 0 ? (
          <p className={styles.empty}>{other.emptyText}</p>
        ) : (
          <ul className={styles.rows}>
            {other.rows.map((row) => (
              <li key={row.id} className={styles.otherRow}>
                <span className={styles.kindCol}>{KINDS[row.kind].label}</span>
                <span className={styles.otherMain}>
                  <span className={styles.otherTitle}>{row.title}</span>
                  <span className={styles.otherLine}>
                    <span className={styles.otherKindChip}>
                      {KINDS[row.kind].label}
                    </span>
                    <span className={styles.otherKindText}>
                      {KINDS[row.kind].label}
                    </span>
                    <span className={styles.otherMeta}>{row.meta}</span>
                  </span>
                </span>
                <button
                  type="button"
                  className={cx(styles.add, row.added && styles.added)}
                  aria-label={
                    row.added
                      ? `${row.title} bei ${own}, wieder abnehmen`
                      : `${row.title} auch für ${own}`
                  }
                  onClick={() =>
                    row.added ? other.onRemove?.(row.id) : other.onAdd?.(row.id)
                  }
                >
                  <span className={styles.addLong}>
                    {row.added ? `✓ Bei ${own}` : `+ Auch für ${own}`}
                  </span>
                  <span className={styles.addShort}>
                    {row.added ? `✓ ${own}` : `+ ${own}`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function PlayIcon() {
  return (
    <svg
      className={styles.playIcon}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8 5.5 18.5 12 8 18.5z" />
    </svg>
  );
}

function AgainIcon() {
  return (
    <svg
      className={styles.againIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v3.5H8" />
    </svg>
  );
}

/**
 * Hinweis „Raum läuft“ für die mobile Kopfzeile des Rahmens (`barExtra`):
 * am Tablet mit Code und „Zum Raum“ (15c), am Handy kurz (15d).
 */
export function RoomBarPill({ room }: { room: StartRoom }) {
  const label = room.detail
    ? `${room.code} · ${room.detail}`
    : `Raum ${room.code}`;
  return (
    <Link href={room.href} className={styles.barPill}>
      <span className={styles.barLong}>
        <span className={styles.barState}>
          <span className={styles.liveDot} aria-hidden="true" />
          {label}
        </span>
        <span className={styles.barLink}>Zum Raum</span>
      </span>
      <span className={styles.barShort}>
        <span className={styles.barDot} aria-hidden="true" />
        Raum läuft
      </span>
    </Link>
  );
}
