import { useState } from "react";
import type { LibrarySortKey } from "../../../src/domain/teacher-content-summary";
import { Icon, type IconName } from "../../ui/icons";
import { cx } from "../parts/parts";
import styles from "./content-library-screen.module.css";

export type LibraryKind = "text" | "math" | "vocabulary";

export type LibraryItem = {
  id: string;
  title: string;
  kind: LibraryKind;
  /** Metazeile am Desktop, z. B. „42 Vokabeln · Englisch“. */
  meta: string;
  /** Datum der letzten Änderung, z. B. „14.09.“. */
  date: string;
  /** Datum der letzten Durchführung (Raumstart); `null` = noch nie. */
  ran: string | null;
};

export type { LibrarySortKey };

const SORTS: ReadonlyArray<[LibrarySortKey, string]> = [
  ["title", "Titel"],
  ["kind", "Aufgabentyp"],
  ["date", "Datum"],
  ["ran", "Zuletzt durchgeführt"],
];

const KINDS: Record<
  LibraryKind,
  {
    label: string;
    icon: IconName;
    /** Beschreibung in der Kachel (Desktop). */
    description: string;
    /** Name und Hinweis im Panel unter den Kacheln (mobil). */
    panelLabel: string;
    panelHint: string;
  }
> = {
  text: {
    label: "Text",
    icon: "text",
    description: "Einfügen oder tippen — wird in Wörter und Sätze zerlegt",
    panelLabel: "Text",
    panelHint: "Abschnitte werden automatisch in Stationen zerlegt",
  },
  math: {
    label: "Mathe",
    icon: "math",
    description:
      "Generator für + − · : oder Aufgaben von Hand, auch mit Lücken",
    panelLabel: "Mathe",
    panelHint: "Zahlenraum, Operationen und Lückenstellen wählen",
  },
  vocabulary: {
    label: "Vokabeln",
    icon: "cards",
    description: "Paare mit Lernrichtung, Stapel und Tags",
    panelLabel: "Vokabelstapel",
    panelHint: "Zwei Spalten einfügen oder Paare einzeln eingeben",
  },
};

/** Letzte Durchführung: nur das jüngste Datum, sonst „noch nie“. */
function ranText(item: LibraryItem) {
  return item.ran ? `Durchgeführt ${item.ran}` : "Noch nie durchgeführt";
}

const KIND_ORDER: readonly LibraryKind[] = ["text", "vocabulary", "math"];

export type ContentLibraryScreenProps = {
  /** Vorgewählte Art unter „Neu anlegen“ (mobil Grundlage des Panels). */
  kind: LibraryKind;
  items: readonly LibraryItem[];
  /** Zahl neben „Abgelegt“, z. B. „14 Inhalte“. */
  countLabel: string;
  /** Mit Klasse: Panel „Text anlegen für Klasse 7b“. */
  createFor?: string;
  /** Hinweis unter der Liste (mobil); ohne Angabe fehlt er. */
  footnote?: string;
  /** Text, wenn nichts abgelegt ist. */
  emptyText?: string;
  /** Hinweis am Ende der Seite, z. B. zum Schutz der lokalen Daten. */
  notice?: string;
  onKind?: (kind: LibraryKind) => void;
  /** „Weiter“ im Panel: den gewählten Typ anlegen. */
  onCreate?: (kind: LibraryKind) => void;
  /** Play: den Inhalt starten (Start-Overlay). */
  onOpen?: (id: string) => void;
  /** Zeile: den Inhalt in der Bearbeitungsansicht öffnen. */
  onEdit?: (id: string) => void;
  /** Mülleimer: den Inhalt nach Rückfrage aus der Ablage löschen. */
  onDelete?: (id: string) => void;
  /** Zeigt „Zuordnen“ je Zeile (Ansicht „Nicht zugeordnet“). */
  onAssign?: (id: string) => void;
  /** Aktive Sortierung; `null` = zuletzt genutzt zuerst. */
  sortKey?: LibrarySortKey | null;
  sortDir?: 1 | -1;
  /** Gleicher Schlüssel kehrt die Richtung um. */
  onSort?: (key: LibrarySortKey) => void;
  onResetSort?: () => void;
  /** Ziele der Massenaktion „Verschieben“ (Klassen und „Nicht zugeordnet“). */
  moveTargets?: ReadonlyArray<{ id: string; name: string }>;
  onDeleteMany?: (ids: readonly string[]) => void;
  onMoveMany?: (ids: readonly string[], target: string) => void;
};

/**
 * Inhalte des Lehrerbereichs (Design 3c mobil, 3d Desktop): Neu anlegen,
 * Ablage. Der Raum wird über eine Inhaltsart oder einen Eintrag geöffnet. Läuft im `TeacherFrame` und
 * reagiert auf dessen Breite.
 */
export function ContentLibraryScreen(props: ContentLibraryScreenProps) {
  const {
    kind,
    items,
    countLabel,
    createFor,
    footnote,
    emptyText,
    notice,
    onKind,
    onCreate,
    onOpen,
    onEdit,
    onDelete,
    onAssign,
    sortKey = null,
    sortDir = -1,
    onSort,
    onResetSort,
    moveTargets = [],
    onDeleteMany,
    onMoveMany,
  } = props;
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<readonly string[]>([]);
  const [confirmMany, setConfirmMany] = useState(false);
  const [moveTarget, setMoveTarget] = useState("");
  // Gelöschte oder verschobene Inhalte verschwinden auch aus der Auswahl.
  const present = picked.filter((id) => items.some((item) => item.id === id));
  const bulk = Boolean(onDeleteMany || onMoveMany);

  function leaveSelecting() {
    setSelecting(false);
    setPicked([]);
    setConfirmMany(false);
    setMoveTarget("");
  }
  function toggle(id: string) {
    setConfirmMany(false);
    setPicked((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  }
  function pickRow(id: string) {
    if (selecting) toggle(id);
    else onEdit?.(id);
  }
  const selected = KINDS[kind];

  /** Play und Mülleimer einer Zeile; der Mülleimer fragt vorher nach. */
  function rowActions(item: LibraryItem) {
    if (selecting) return null;
    if (confirmId === item.id) {
      return (
        <span
          className={styles.confirm}
          role="group"
          aria-label={`${item.title} löschen bestätigen`}
        >
          <span>Löschen?</span>
          <button
            type="button"
            className={cx(styles.edit, styles.danger)}
            onClick={() => {
              setConfirmId(null);
              onDelete?.(item.id);
            }}
          >
            Ja
          </button>
          <button
            type="button"
            className={styles.edit}
            onClick={() => setConfirmId(null)}
          >
            Nein
          </button>
        </span>
      );
    }
    return (
      <span className={styles.iconActions}>
        <button
          type="button"
          className={cx(styles.iconButton, styles.play)}
          aria-label={`${item.title} starten`}
          title="Starten"
          onClick={() => onOpen?.(item.id)}
        >
          <Icon name="play" size={18} />
        </button>
        {onDelete ? (
          <button
            type="button"
            className={cx(styles.iconButton, styles.trash)}
            aria-label={`${item.title} löschen`}
            title="Löschen"
            onClick={() => setConfirmId(item.id)}
          >
            <Icon name="trash" size={18} />
          </button>
        ) : null}
      </span>
    );
  }

  return (
    <div className={styles.content}>
      <section className={styles.section} aria-labelledby="neu-anlegen">
        <span id="neu-anlegen" className={styles.label}>
          Neu anlegen
        </span>
        <div className={styles.tiles}>
          {KIND_ORDER.map((id) => (
            <button
              key={id}
              type="button"
              className={cx(styles.tile, id === kind && styles.tileOn)}
              aria-pressed={id === kind}
              onClick={() => onKind?.(id)}
            >
              <Icon
                name={KINDS[id].icon}
                size={22}
                className={styles.tileIcon}
              />
              <span className={styles.tileName}>{KINDS[id].label}</span>
              <span className={styles.tileText}>{KINDS[id].description}</span>
            </button>
          ))}
        </div>
        <div className={styles.panel}>
          <span className={styles.panelText}>
            <span className={styles.panelTitle}>
              {createFor
                ? `${selected.label} anlegen für ${createFor}`
                : selected.panelLabel}
            </span>
            <span className={styles.panelHint}>{selected.panelHint}</span>
          </span>
          <button
            type="button"
            className={styles.next}
            onClick={() => onCreate?.(kind)}
          >
            Weiter
          </button>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="abgelegt">
        <div className={styles.listHead}>
          <span id="abgelegt" className={styles.label}>
            Abgelegt
            <span className={styles.wideOnly}>
              {" "}
              · lässt sich jederzeit wieder öffnen
            </span>
          </span>
          <span className={styles.count}>{countLabel}</span>
        </div>
        {items.length > 0 ? (
          <div className={styles.toolbar}>
            <label className={styles.sortPick}>
              <span className={styles.sortLabel}>Sortieren nach</span>
              <select
                className={styles.sortSelect}
                value={sortKey ?? ""}
                onChange={(event) => {
                  const value = event.target.value as LibrarySortKey | "";
                  if (!value) onResetSort?.();
                  else if (value !== sortKey) onSort?.(value);
                }}
              >
                <option value="">Zuletzt genutzt</option>
                {SORTS.map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            {sortKey ? (
              <button
                type="button"
                className={styles.dirButton}
                aria-label={
                  sortDir === 1
                    ? "Aufsteigend sortiert, umkehren"
                    : "Absteigend sortiert, umkehren"
                }
                title="Richtung umkehren"
                onClick={() => onSort?.(sortKey)}
              >
                {sortDir === 1 ? "↑" : "↓"}
              </button>
            ) : null}
            {bulk ? (
              <button
                type="button"
                className={cx(styles.edit, styles.selectToggle)}
                aria-pressed={selecting}
                onClick={() =>
                  selecting ? leaveSelecting() : setSelecting(true)
                }
              >
                {selecting ? "Fertig" : "Auswählen"}
              </button>
            ) : null}
          </div>
        ) : null}
        {selecting ? (
          <div
            className={styles.bulkBar}
            role="group"
            aria-label="Auswahl bearbeiten"
          >
            <label className={styles.bulkAll}>
              <input
                type="checkbox"
                checked={items.length > 0 && present.length === items.length}
                onChange={(event) => {
                  setConfirmMany(false);
                  setPicked(
                    event.target.checked ? items.map(({ id }) => id) : [],
                  );
                }}
              />
              Alle
            </label>
            <span className={styles.bulkCount} aria-live="polite">
              {present.length} ausgewählt
            </span>
            {onMoveMany ? (
              <>
                <select
                  className={styles.sortSelect}
                  aria-label="Verschieben nach"
                  value={moveTarget}
                  onChange={(event) => setMoveTarget(event.target.value)}
                >
                  <option value="">Verschieben nach …</option>
                  {moveTargets.map(({ id, name }) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={styles.edit}
                  disabled={present.length === 0 || !moveTarget}
                  onClick={() => {
                    onMoveMany(present, moveTarget);
                    leaveSelecting();
                  }}
                >
                  Verschieben
                </button>
              </>
            ) : null}
            {onDeleteMany ? (
              confirmMany ? (
                <span
                  className={styles.confirm}
                  role="group"
                  aria-label="Löschen bestätigen"
                >
                  <span>{present.length} löschen?</span>
                  <button
                    type="button"
                    className={cx(styles.edit, styles.danger)}
                    onClick={() => {
                      onDeleteMany(present);
                      leaveSelecting();
                    }}
                  >
                    Ja
                  </button>
                  <button
                    type="button"
                    className={styles.edit}
                    onClick={() => setConfirmMany(false)}
                  >
                    Nein
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  className={cx(styles.edit, styles.danger)}
                  disabled={present.length === 0}
                  onClick={() => setConfirmMany(true)}
                >
                  Auswahl löschen
                </button>
              )
            ) : null}
          </div>
        ) : null}
        {items.length === 0 ? (
          <p className={styles.empty}>
            {emptyText ?? "Hier ist noch nichts abgelegt."}
          </p>
        ) : (
          <>
            <ul className={cx(styles.list, styles.narrowList)}>
              {items.map((item) => (
                <li key={item.id} className={styles.rowWrap}>
                  {selecting ? (
                    <input
                      type="checkbox"
                      className={styles.check}
                      aria-label={`${item.title} auswählen`}
                      checked={picked.includes(item.id)}
                      onChange={() => toggle(item.id)}
                    />
                  ) : null}
                  <button
                    type="button"
                    className={styles.rowButton}
                    aria-label={
                      selecting
                        ? `${item.title} markieren`
                        : `${item.title} bearbeiten`
                    }
                    onClick={() => pickRow(item.id)}
                  >
                    <span className={styles.rowText}>
                      <span className={styles.rowTitle}>{item.title}</span>
                      <span className={styles.rowMeta}>
                        <span className={styles.pill}>
                          {KINDS[item.kind].label}
                        </span>
                        <span className={styles.used}>{item.date}</span>
                        <span className={styles.used}>{ranText(item)}</span>
                      </span>
                    </span>
                  </button>
                  {rowActions(item)}
                </li>
              ))}
            </ul>
            <ul className={cx(styles.list, styles.wideList)}>
              {items.map((item) => (
                <li
                  key={item.id}
                  className={cx(styles.row, onAssign && styles.rowAssign)}
                >
                  <span className={styles.rowLead}>
                    {selecting ? (
                      <input
                        type="checkbox"
                        className={styles.check}
                        aria-label={`${item.title} auswählen`}
                        checked={picked.includes(item.id)}
                        onChange={() => toggle(item.id)}
                      />
                    ) : null}
                    <button
                      type="button"
                      className={styles.rowMain}
                      aria-label={
                        selecting
                          ? `${item.title} markieren`
                          : `${item.title} bearbeiten`
                      }
                      onClick={() => pickRow(item.id)}
                    >
                      <span className={styles.rowText}>
                        <span className={styles.rowTitleWide}>
                          {item.title}
                        </span>
                        <span className={styles.metaLine}>{item.meta}</span>
                      </span>
                    </button>
                  </span>
                  <span className={styles.pill}>{KINDS[item.kind].label}</span>
                  <span className={styles.usedWide}>Geändert {item.date}</span>
                  <span className={styles.usedWide}>{ranText(item)}</span>
                  <span className={styles.actions}>
                    {onAssign ? (
                      <button
                        type="button"
                        className={styles.edit}
                        aria-label={`${item.title} zuordnen`}
                        onClick={() => onAssign(item.id)}
                      >
                        Zuordnen
                      </button>
                    ) : null}
                    {rowActions(item)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
        {footnote ? <p className={styles.footnote}>{footnote}</p> : null}
      </section>

      {notice ? (
        <aside className={styles.notice} aria-label="Hinweis">
          {notice}
        </aside>
      ) : null}
    </div>
  );
}
