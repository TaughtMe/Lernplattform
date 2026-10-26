"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import { cx } from "../parts/parts";
import { ManageIcon, manageStyles as m } from "./manage-parts";
import styles from "./classes-screen.module.css";

/**
 * Klassen und Schüler nach Lehrerbereich v2 (17c). Reine Bausteine: Klassen,
 * Schüler und Aktionen kommen als Props; nur die Eingabefelder halten ihren
 * Entwurf selbst.
 */

export type NewClassValues = {
  name: string;
  teacherName: string;
  schoolYear: string;
};

/** „+ Neue Klasse“ klappt diese Zeile auf. */
export function NewClassRow({
  initial,
  onCancel,
  onCreate,
}: {
  /** Vorschlag für Lehrkraft und Schuljahr. */
  initial: NewClassValues;
  onCancel?: () => void;
  onCreate?: (values: NewClassValues) => void;
}) {
  const [values, setValues] = useState(initial);
  const titleId = useId();
  const field = (
    name: keyof NewClassValues,
    label: string,
    placeholder: string,
  ) => (
    <label className={m.field}>
      {label}
      <input
        className={m.input}
        value={values[name]}
        placeholder={placeholder}
        required
        maxLength={120}
        onChange={(event) =>
          setValues((current) => ({ ...current, [name]: event.target.value }))
        }
      />
    </label>
  );
  return (
    <form
      className={cx(m.card, styles.newRow)}
      aria-labelledby={titleId}
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        onCreate?.(values);
        setValues((current) => ({ ...current, name: "" }));
      }}
    >
      <h2 className="ui-sr-only" id={titleId}>
        Neue Klasse anlegen
      </h2>
      <div className={styles.newGrid}>
        {field("name", "Klassenname", "z. B. 7b")}
        {field("teacherName", "Lehrkraft", "")}
        {field("schoolYear", "Schuljahr", "")}
        <div className={m.actions}>
          <button type="button" className={m.soft} onClick={onCancel}>
            Abbrechen
          </button>
          <button type="submit" className={m.green}>
            Anlegen
          </button>
        </div>
      </div>
      <span className={m.hint}>
        Die Lehrkraft kommt aus den Einstellungen und ist hier änderbar.
      </span>
    </form>
  );
}

/** Klassen und gewählte Klasse nebeneinander (mobil untereinander). */
export function ClassesLayout({
  side,
  children,
}: {
  side: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={styles.layout}>
      <div className={styles.side}>{side}</div>
      {children}
    </div>
  );
}

export type ClassTab = "active" | "archive";

/** Reiter „Aktiv“ und „Archiv“ mit Zählern. */
export function ClassTabs({
  tab,
  counts,
  onTab,
}: {
  tab: ClassTab;
  counts: Record<ClassTab, number>;
  onTab?: (tab: ClassTab) => void;
}) {
  const entries: Array<[ClassTab, string]> = [
    ["active", "Aktiv"],
    ["archive", "Archiv"],
  ];
  return (
    <div className={styles.tabs} role="group" aria-label="Klassen anzeigen">
      {entries.map(([id, label]) => (
        <button
          key={id}
          type="button"
          className={cx(styles.tab, tab === id && styles.tabOn)}
          aria-pressed={tab === id}
          onClick={() => onTab?.(id)}
        >
          {label}
          <span className={styles.tabCount}>{counts[id]}</span>
        </button>
      ))}
    </div>
  );
}

export type ClassListItem = {
  id: string;
  name: string;
  /** z. B. „10 Schüler · 2026/27“ */
  sub: string;
  /** Zugänglicher Name, z. B. „Klasse 7b, 2026/27“. */
  label: string;
};

/** Klassen des gewählten Reiters. */
export function ClassList({
  items,
  selectedId,
  empty,
  onPick,
}: {
  items: readonly ClassListItem[];
  selectedId: string;
  empty: string;
  onPick?: (id: string) => void;
}) {
  if (items.length === 0) return <p className={styles.listEmpty}>{empty}</p>;
  return (
    <nav aria-label="Klassen">
      <ul className={styles.classes}>
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className={cx(
                styles.class,
                item.id === selectedId && styles.classOn,
              )}
              aria-label={item.label}
              aria-pressed={item.id === selectedId}
              onClick={() => onPick?.(item.id)}
            >
              <span className={styles.classText}>
                <span className={styles.className}>{item.name}</span>
                <span className={styles.classSub}>{item.sub}</span>
              </span>
              <span className={styles.chevron} aria-hidden="true">
                ›
              </span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Rechte Karte: Kopf der Klasse, darunter die Abschnitte. */
export function ClassDetail({
  title,
  meta,
  actions,
  children,
}: {
  title: string;
  /** z. B. „Herr Bryson · 2026/27“ */
  meta: string;
  actions: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={m.card} aria-label="Ausgewählte Klasse">
      <div className={styles.detailHead}>
        <div className={styles.detailText}>
          <h2 className={styles.detailTitle}>{title}</h2>
          <span className={styles.detailMeta}>{meta}</span>
        </div>
        <div className={styles.detailActions}>{actions}</div>
      </div>
      {children}
    </section>
  );
}

/** Knöpfe im Kopf: QR-Bogen, Archivieren bzw. Wiederherstellen, Löschen. */
export function ClassActions({
  name,
  archived,
  canPrint,
  onPrint,
  onGuestQr,
  onArchive,
  onDelete,
  extra,
}: {
  name: string;
  archived: boolean;
  canPrint: boolean;
  onPrint?: () => void;
  /** Gast-QR für geteilte Geräte; ohne Angabe (Bereich nicht freigegeben) fehlt der Knopf. */
  onGuestQr?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  /** Weitere Knöpfe, z. B. „Entfernungscode“ im Archiv. */
  extra?: ReactNode;
}) {
  return (
    <>
      {archived ? null : (
        <button
          type="button"
          className={m.green}
          disabled={!canPrint}
          onClick={onPrint}
        >
          <ManageIcon name="print" />
          QR-Bogen drucken
        </button>
      )}
      {archived || !onGuestQr ? null : (
        <button type="button" className={m.soft} onClick={onGuestQr}>
          Gast-QR (90 Minuten)
        </button>
      )}
      {extra}
      <button type="button" className={m.soft} onClick={onArchive}>
        {archived ? "Wiederherstellen" : "Archivieren"}
      </button>
      <button
        type="button"
        className={styles.delete}
        aria-label={`Klasse ${name} löschen`}
        title="Klasse löschen"
        onClick={onDelete}
      >
        <ManageIcon name="trash" />
      </button>
    </>
  );
}

/** Abschnitt mit Trennlinie in der Karte. */
export function ClassSection({ children }: { children: ReactNode }) {
  return <div className={styles.section}>{children}</div>;
}

export type AreaChip = { id: string; label: string; on: boolean };

/** „Bereiche für diese Klasse“ zum An- und Ausschalten. */
export function ClassAreas({
  areas,
  disabled = false,
  onToggle,
}: {
  areas: readonly AreaChip[];
  disabled?: boolean;
  onToggle?: (id: string) => void;
}) {
  const labelId = useId();
  return (
    <div className={styles.section}>
      <span className={m.label} id={labelId}>
        Bereiche für diese Klasse
      </span>
      <div className={styles.areas} role="group" aria-labelledby={labelId}>
        {areas.map((area) => (
          <button
            key={area.id}
            type="button"
            className={cx(styles.area, area.on && styles.areaOn)}
            aria-pressed={area.on}
            disabled={disabled}
            onClick={() => onToggle?.(area.id)}
          >
            {area.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export type StudentItem = {
  id: string;
  name: string;
  writingRelief: boolean;
};

/** Schülerliste mit Hinzufügen, QR je Kind, Schreiberleichterung, Entfernen. */
export function StudentList({
  students,
  hint,
  shownId,
  readOnly = false,
  qr,
  onAdd,
  onToggleQr,
  onRelief,
  onRemove,
}: {
  students: readonly StudentItem[];
  /** Rechts neben „Schüler“, z. B. „2 mit Schreiberleichterung“. */
  hint?: string;
  /** Kind, dessen QR-Code offen ist. */
  shownId?: string | undefined;
  /** Archivierte Klassen: ohne Hinzufügen und Ändern. */
  readOnly?: boolean;
  /** QR-Code des offenen Kindes. */
  qr?: ReactNode;
  onAdd?: (name: string) => void;
  onToggleQr?: (id: string) => void;
  onRelief?: (id: string) => void;
  onRemove?: (id: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const titleId = useId();
  return (
    <div className={styles.students}>
      <div className={styles.studentsHead}>
        <h3 className={styles.studentsTitle} id={titleId}>
          Schüler
        </h3>
        <span className={m.count}>{students.length}</span>
        {hint ? <span className={styles.studentsHint}>{hint}</span> : null}
      </div>
      {readOnly ? null : (
        <form
          className={styles.add}
          onSubmit={(event) => {
            event.preventDefault();
            const name = draft.trim();
            if (!name) return;
            onAdd?.(name);
            setDraft("");
          }}
        >
          <input
            className={cx(m.input, styles.addInput)}
            value={draft}
            maxLength={80}
            required
            placeholder="Name oder Alias, z. B. Alex"
            aria-label="Name oder Alias"
            onChange={(event) => setDraft(event.target.value)}
          />
          <button type="submit" className={m.soft}>
            Hinzufügen
          </button>
        </form>
      )}
      {students.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyTitle}>Noch keine Schüler</span>
          <span className={styles.emptyText}>
            Namen oben eingeben, dann den QR-Bogen drucken. Jeder Schüler scannt
            seinen Code einmal.
          </span>
        </div>
      ) : (
        <ul className={styles.list} aria-labelledby={titleId}>
          {students.map((student) => {
            const open = student.id === shownId;
            return (
              <li key={student.id} className={styles.student}>
                <div className={styles.studentRow}>
                  <span className={styles.avatar} aria-hidden="true">
                    {[...student.name][0]?.toLocaleUpperCase("de")}
                  </span>
                  <span className={styles.studentName}>{student.name}</span>
                  {readOnly ? null : (
                    <label
                      className={cx(styles.relief, "class-relief")}
                      title="Schreiberleichterung (LRS): wirkt nur in Laufdiktaten, die du für diese Klasse startest."
                    >
                      <input
                        type="checkbox"
                        className={styles.reliefInput}
                        aria-label={`Schreiberleichterung für ${student.name}`}
                        checked={student.writingRelief}
                        onChange={() => onRelief?.(student.id)}
                      />
                      LRS
                    </label>
                  )}
                  {readOnly ? null : (
                    <button
                      type="button"
                      className={styles.qrPill}
                      aria-label={`${student.name}: ${
                        open ? "QR-Code schließen" : "QR-Code anzeigen"
                      }`}
                      aria-expanded={open}
                      aria-controls={`schueler-qr-${student.id}`}
                      onClick={() => onToggleQr?.(student.id)}
                    >
                      QR-Code
                    </button>
                  )}
                  {readOnly ? null : (
                    <button
                      type="button"
                      className={cx(m.iconBtn, m.iconBare)}
                      aria-label={`${student.name} entfernen`}
                      onClick={() => onRemove?.(student.id)}
                    >
                      <ManageIcon name="trash" />
                    </button>
                  )}
                </div>
                {open && qr ? (
                  <div
                    className={styles.qrBox}
                    id={`schueler-qr-${student.id}`}
                  >
                    <div className={styles.qrImage}>{qr}</div>
                    <div className={styles.qrText}>
                      <strong>Einschreibungs-QR für {student.name}</strong>
                      <span>
                        Das Kind scannt ihn einmal mit seinem Gerät.
                        {student.writingRelief
                          ? " Mit Schreiberleichterung (LRS); sie wirkt nur in Laufdiktaten für diese Klasse."
                          : " „LRS“ setzt die Schreiberleichterung; danach muss das Kind den neuen QR-Code scannen."}
                      </span>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
