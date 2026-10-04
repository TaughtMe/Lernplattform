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
  /** Datum der letzten Nutzung, z. B. „14.09.“. */
  used: string;
};

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
  onOpen?: (id: string) => void;
  onEdit?: (id: string) => void;
  /** Zeigt „Zuordnen“ je Zeile (Ansicht „Nicht zugeordnet“). */
  onAssign?: (id: string) => void;
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
    onAssign,
  } = props;
  const selected = KINDS[kind];
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
        {items.length === 0 ? (
          <p className={styles.empty}>
            {emptyText ?? "Hier ist noch nichts abgelegt."}
          </p>
        ) : (
          <>
            <ul className={cx(styles.list, styles.narrowList)}>
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={styles.rowButton}
                    aria-label={`${item.title} öffnen`}
                    onClick={() => onOpen?.(item.id)}
                  >
                    <span className={styles.rowText}>
                      <span className={styles.rowTitle}>{item.title}</span>
                      <span className={styles.rowMeta}>
                        <span className={styles.pill}>
                          {KINDS[item.kind].label}
                        </span>
                        <span className={styles.used}>{item.used}</span>
                      </span>
                    </span>
                    <Icon
                      name="forward"
                      size={18}
                      strokeWidth={2}
                      className={styles.chevron}
                    />
                  </button>
                </li>
              ))}
            </ul>
            <ul className={cx(styles.list, styles.wideList)}>
              {items.map((item) => (
                <li
                  key={item.id}
                  className={cx(styles.row, onAssign && styles.rowAssign)}
                >
                  <span className={styles.rowText}>
                    <span className={styles.rowTitleWide}>{item.title}</span>
                    <span className={styles.metaLine}>{item.meta}</span>
                  </span>
                  <span className={styles.pill}>{KINDS[item.kind].label}</span>
                  <span className={styles.usedWide}>{item.used}</span>
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
                    <button
                      type="button"
                      className={styles.edit}
                      aria-label={`${item.title} bearbeiten`}
                      onClick={() => onEdit?.(item.id)}
                    >
                      Bearbeiten
                    </button>
                    <button
                      type="button"
                      className={styles.openButton}
                      aria-label={`${item.title} öffnen`}
                      onClick={() => onOpen?.(item.id)}
                    >
                      Öffnen
                    </button>
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
