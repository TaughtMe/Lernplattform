"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cx } from "../parts/parts";
import { ManageIcon, manageStyles as m, SwitchTrack } from "./manage-parts";
import styles from "./settings-screen.module.css";

/**
 * Einstellungen der Lehrkraft nach Lehrerbereich v2 (17a). Reine Bausteine:
 * Werte und Aktionen kommen als Props, nur kurzlebige Bedienzustände
 * (Umbenennen offen, Ausschalten bestätigen) liegen in der Ansicht.
 */

/** Eine Gruppe: Titel und Hinweis links, Karte rechts (mobil darüber). */
export function SettingsGroup({
  id,
  title,
  hint,
  children,
}: {
  id?: string;
  title: string;
  hint: string;
  children: ReactNode;
}) {
  const titleId = useId();
  return (
    <section className={styles.group} id={id} aria-labelledby={titleId}>
      <div className={styles.groupText}>
        <h2 className={styles.groupTitle} id={titleId}>
          {title}
        </h2>
        <p className={styles.groupHint}>{hint}</p>
      </div>
      {children}
    </section>
  );
}

/** Die Gruppen untereinander. */
export function SettingsGroups({ children }: { children: ReactNode }) {
  return <div className={styles.groups}>{children}</div>;
}

// ---------- Profil ----------

export type ProfileValues = {
  displayName: string;
  school: string;
  email: string;
  subjects: string;
  lernboxTag: string;
};

export type ProfileField = keyof ProfileValues;

/** Profil: speichert beim Tippen, darum ohne Speichern-Knopf. */
export function ProfileCard({
  values,
  disabled = false,
  saving = false,
  error = "",
  onChange,
}: {
  values: ProfileValues;
  disabled?: boolean;
  /** Eine Änderung wartet noch auf das Speichern. */
  saving?: boolean;
  /** Fehler beim Speichern; ersetzt den Hinweis unten. */
  error?: string;
  onChange?: (field: ProfileField, value: string) => void;
}) {
  const field = (
    name: ProfileField,
    label: string,
    placeholder: string,
    extra: { type?: string; className?: string; hint?: string } = {},
  ) => (
    <label className={cx(m.field, extra.className)}>
      {label}
      <input
        className={m.input}
        type={extra.type ?? "text"}
        value={values[name]}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={name === "lernboxTag" ? 80 : 120}
        onChange={(event) => onChange?.(name, event.target.value)}
      />
      {extra.hint ? (
        <span className={styles.fieldHint}>{extra.hint}</span>
      ) : null}
    </label>
  );
  return (
    <form
      className={m.card}
      aria-label="Persönliche Informationen"
      onSubmit={(event) => event.preventDefault()}
    >
      <div className={styles.profileGrid}>
        {field("displayName", "Anzeigename", "z. B. Tobias Becker")}
        {field("school", "Schule", "optional")}
        {field("email", "E-Mail", "optional", { type: "email" })}
        {field("subjects", "Fächer", "Deutsch, Mathematik, Englisch")}
        {field(
          "lernboxTag",
          "LernBox-Tag für Laufdiktate",
          "z. B. Buch Klasse 5",
          {
            className: cx(styles.wide, "lernbox-tag"),
            hint: "Vorschlag für den Tag jeder Runde, im Vokabelheft änderbar. Ein Tag an der Vokabel geht vor.",
          },
        )}
      </div>
      <div className={styles.cardFoot}>
        {error ? (
          <span className={styles.footError} role="alert">
            {error}
          </span>
        ) : saving ? (
          <span className={cx(m.saved, styles.footSaved)}>
            Wird gespeichert …
          </span>
        ) : (
          <span className={cx(m.saved, styles.footSaved)}>
            <ManageIcon name="check" size={15} strokeWidth={2.4} />
            Wird beim Tippen gespeichert
          </span>
        )}
      </div>
    </form>
  );
}

// ---------- Geräte abgleichen ----------

/** Hinweis oben in der Karte, z. B. „Die Anmeldung … ist abgelaufen.“ */
export function SyncAlert({
  text,
  actionLabel,
  onAction,
}: {
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className={styles.alert}>
      <ManageIcon name="warn" size={19} />
      <span className={styles.alertText}>{text}</span>
      {actionLabel ? (
        <button type="button" className={m.gold} onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export type SyncProviderOption = {
  id: string;
  name: string;
  sub: string;
  /** Zweite Zeile grün und fett (der aktive Speicherort). */
  emphasized?: boolean;
  disabled?: boolean;
};

/** „Speicherort“: drei Karten mit Optionsfeld. */
export function ProviderPicker({
  options,
  value,
  onChange,
}: {
  options: readonly SyncProviderOption[];
  value: string;
  onChange?: (id: string) => void;
}) {
  const name = useId();
  return (
    <fieldset className={styles.pickerBox}>
      <legend className={m.label}>Speicherort</legend>
      <div className={styles.providers}>
        {options.map((option) => (
          <label key={option.id} className={styles.provider}>
            <input
              type="radio"
              className={styles.radioInput}
              name={name}
              value={option.id}
              checked={option.id === value}
              disabled={option.disabled}
              onChange={() => onChange?.(option.id)}
            />
            <span className={styles.radio} aria-hidden="true" />
            <span className={styles.providerName}>{option.name}</span>
            <span
              className={cx(
                styles.providerSub,
                option.emphasized && styles.providerSubOn,
              )}
            >
              {option.sub}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Zeile mit Wolke, Speicherort, Stand und Aktion. */
export function SyncStatusRow({
  name,
  sub,
  children,
}: {
  name: string;
  sub: ReactNode;
  /** Knöpfe rechts, z. B. „Jetzt abgleichen“. */
  children?: ReactNode;
}) {
  return (
    <div className={styles.status}>
      <span className={styles.statusIcon} aria-hidden="true">
        <ManageIcon name="cloud" size={20} strokeWidth={1.9} />
      </span>
      <span className={styles.statusText}>
        <span className={styles.statusName}>{name}</span>
        <span className={styles.statusSub}>{sub}</span>
      </span>
      {children ? <div className={styles.statusActions}>{children}</div> : null}
    </div>
  );
}

export type SyncDeviceItem = {
  id: string;
  name: string;
  /** Dieses Gerät: Abzeichen und Umbenennen. */
  current: boolean;
  /** z. B. „Stand 13 · vor 12 Tagen“. */
  meta: string;
};

/** Geräteliste; das eigene Gerät lässt sich umbenennen. */
export function SyncDevices({
  devices,
  onRename,
}: {
  devices: readonly SyncDeviceItem[];
  onRename?: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const labelId = useId();
  const field = useRef<HTMLInputElement>(null);
  // Das Feld bekommt den Fokus, sobald es zum Umbenennen aufgeht.
  useEffect(() => {
    if (editing) field.current?.focus();
  }, [editing]);
  return (
    <div className={styles.devices}>
      <span className={cx(m.label, styles.devicesLabel)} id={labelId}>
        Geräte
      </span>
      <ul className={styles.deviceList} aria-labelledby={labelId}>
        {devices.map((device) => (
          <li key={device.id} className={styles.device}>
            <span className={styles.deviceName}>{device.name}</span>
            {device.current ? (
              <span className={styles.deviceBadge}>Dieses Gerät</span>
            ) : null}
            <span className={styles.deviceMeta}>{device.meta}</span>
            {device.current && onRename ? (
              <button
                type="button"
                className={m.iconBtn}
                aria-label="Umbenennen"
                aria-expanded={editing}
                onClick={() => {
                  setDraft(device.name);
                  setEditing((open) => !open);
                }}
              >
                <ManageIcon name="pencil" size={15} />
              </button>
            ) : (
              <span className={styles.deviceSpacer} />
            )}
            {device.current && editing ? (
              <form
                className={styles.rename}
                onSubmit={(event) => {
                  event.preventDefault();
                  onRename?.(draft);
                  setEditing(false);
                }}
              >
                <label className={cx(m.field, styles.renameField)}>
                  Name dieses Geräts
                  <input
                    className={m.input}
                    value={draft}
                    maxLength={80}
                    ref={field}
                    onChange={(event) => setDraft(event.target.value)}
                  />
                </label>
                <button type="submit" className={m.soft}>
                  Namen speichern
                </button>
                <button
                  type="button"
                  className={m.link}
                  onClick={() => setEditing(false)}
                >
                  Abbrechen
                </button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** „Was abgeglichen wird“ als Abzeichen mit Haken. */
export function SyncScopeChips({ labels }: { labels: readonly string[] }) {
  const labelId = useId();
  return (
    <div className={styles.section}>
      <span className={m.label} id={labelId}>
        Was abgeglichen wird
      </span>
      <ul className={styles.chips} aria-labelledby={labelId}>
        {labels.map((label) => (
          <li key={label} className={styles.chip}>
            <ManageIcon name="check" size={15} strokeWidth={2.4} />
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Abschnitt mit Trennlinie, z. B. für Schritte der Einrichtung. */
export function SyncSection({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cx(styles.section, className)}>{children}</div>;
}

/** Verschlüsselung als Schalter; darunter optional ein Formular. */
export function EncryptionSwitch({
  on,
  hint,
  disabled = false,
  onToggle,
  children,
}: {
  on: boolean;
  hint: string;
  disabled?: boolean;
  onToggle?: () => void;
  children?: ReactNode;
}) {
  const titleId = useId();
  const hintId = useId();
  return (
    <>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-labelledby={titleId}
        aria-describedby={hintId}
        className={styles.switchRow}
        disabled={disabled}
        onClick={onToggle}
      >
        <span className={styles.switchText}>
          <span className={styles.switchTitle} id={titleId}>
            Verschlüsselung
          </span>
          <span className={styles.switchHint} id={hintId}>
            {hint}
          </span>
        </span>
        <SwitchTrack on={on} />
      </button>
      {children ? <div className={styles.switchExtra}>{children}</div> : null}
    </>
  );
}

/** „Abgleich ausschalten …“ mit Rückfrage. */
export function SyncOff({
  onOff,
}: {
  onOff?: (options: { deleteRemote: boolean }) => void;
}) {
  const [confirm, setConfirm] = useState(false);
  return (
    <div className={styles.off}>
      {confirm ? (
        <div
          className={styles.offConfirm}
          role="group"
          aria-label="Abgleich ausschalten"
        >
          <p className={styles.offText}>
            Deine Daten auf diesem Gerät bleiben in jedem Fall erhalten.
          </p>
          <div className={styles.row}>
            <button
              type="button"
              className={m.soft}
              onClick={() => {
                setConfirm(false);
                onOff?.({ deleteRemote: false });
              }}
            >
              Nur auf diesem Gerät ausschalten
            </button>
            <button
              type="button"
              className={cx(m.soft, m.danger)}
              onClick={() => {
                setConfirm(false);
                onOff?.({ deleteRemote: true });
              }}
            >
              Auch Cloud-Datei löschen
            </button>
            <button
              type="button"
              className={m.link}
              onClick={() => setConfirm(false)}
            >
              Abbrechen
            </button>
          </div>
        </div>
      ) : (
        <span>
          <button
            type="button"
            className={cx(m.link, m.danger, styles.offButton)}
            onClick={() => setConfirm(true)}
          >
            Abgleich ausschalten …
          </button>
        </span>
      )}
    </div>
  );
}

// ---------- Daten auf diesem Gerät ----------

export type DeviceStats = {
  classes: number;
  students: number;
  materials: number;
  assignments: number;
};

/** Zahlen, Sicherung als Datei und der Schutzhinweis. */
export function DeviceDataCard({
  stats,
  onExport,
  onImport,
}: {
  stats: DeviceStats;
  onExport?: () => void;
  onImport?: (file: File) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const entries: Array<[string, number]> = [
    ["Klassen", stats.classes],
    ["Schüler", stats.students],
    ["Materialien", stats.materials],
    ["Aufgaben", stats.assignments],
  ];
  return (
    <div className={m.card}>
      <dl className={styles.stats}>
        {entries.map(([label, value]) => (
          <div key={label} className={styles.stat}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <div className={styles.dataActions}>
        <button
          type="button"
          className={m.soft}
          title="Lehrerdatenbank als Datei sichern"
          onClick={onExport}
        >
          <ManageIcon name="download" />
          Sicherung exportieren
        </button>
        <button
          type="button"
          className={m.soft}
          title="Lehrerdatenbank aus einer Datei laden"
          onClick={() => input.current?.click()}
        >
          <ManageIcon name="upload" />
          Sicherung importieren
        </button>
        <input
          ref={input}
          className={styles.fileInput}
          type="file"
          accept="application/json,.json"
          aria-label="Lehrerdatenbank auswählen"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) onImport?.(file);
          }}
        />
      </div>
      <p className={styles.shield}>
        <ManageIcon name="lock" />
        <span>
          <strong>Dieses Gerät ist die Schutzgrenze.</strong> Lehrkraftdaten
          bleiben lokal. Nutze ein geschütztes, nicht gemeinsam verwendetes
          Geräteprofil.
        </span>
      </p>
    </div>
  );
}
