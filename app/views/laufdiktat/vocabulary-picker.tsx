"use client";

import { useEffect, useId, useRef } from "react";
import {
  pickerLocale,
  vocabularyLanguageLabel,
  type VocabularyPair,
} from "../../../src/domain/running-dictation";
import type {
  CatalogPackage,
  CatalogTagGroup,
} from "../../../src/domain/vocabulary-catalog";
import { Icon } from "../../ui/icons";
import { ModalDialog } from "../lehrer/modal-dialog";
import styles from "./vocabulary-picker.module.css";

export type VocabularyPickerProps = {
  open: boolean;
  /** Schon nach Klasse, Sprache und Suche gefiltert. */
  packages: readonly CatalogPackage[];
  /** Pakete, die nur wegen ihres Sprachpaars fehlen. */
  hiddenByLanguage: number;
  query: string;
  allClasses: boolean;
  /** Name der Raumklasse für Schalter und Leerzustand. */
  className?: string | undefined;
  selected: ReadonlySet<string>;
  /** Aufgeklappte Pakete (Paket-IDs). */
  expanded: ReadonlySet<string>;
  onQuery?: (value: string) => void;
  onAllClasses?: (value: boolean) => void;
  onToggle?: (keys: readonly string[], checked: boolean) => void;
  onExpand?: (packageId: string, open: boolean) => void;
  onClear?: () => void;
  onConfirm?: () => void;
  onClose?: () => void;
};

const keysOf = (groups: readonly CatalogTagGroup[]) =>
  groups.flatMap((group) => group.pairs.map(({ key }) => key));

function side(value: VocabularyPair["left"]) {
  return [value.primary, ...value.alternatives].join(" | ");
}

function languagesOf(entry: CatalogPackage) {
  const label = (locale: string) =>
    vocabularyLanguageLabel(pickerLocale(locale, locale));
  return `${label(entry.promptLocale)} → ${label(entry.answerLocale)}`;
}

/** „Alle“-Kästchen mit Zwischenzustand, wenn nur ein Teil gewählt ist. */
function GroupCheckbox({
  label,
  keys,
  selected,
  onToggle,
}: {
  label: string;
  keys: readonly string[];
  selected: ReadonlySet<string>;
  onToggle?: ((keys: readonly string[], checked: boolean) => void) | undefined;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const picked = keys.filter((key) => selected.has(key)).length;
  const all = keys.length > 0 && picked === keys.length;
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = picked > 0 && !all;
  }, [picked, all]);
  return (
    <span className={styles.boxWrap}>
      <input
        ref={ref}
        type="checkbox"
        className={styles.box}
        aria-label={label}
        checked={all}
        onChange={(event) => onToggle?.(keys, event.target.checked)}
      />
    </span>
  );
}

/**
 * Auswahldialog „Aus meinen Vokabeln wählen“: Pakete der Ablage als
 * Überschriften, darunter Tags und Vokabeln zum Ankreuzen.
 */
export function VocabularyPicker(props: VocabularyPickerProps) {
  const uid = useId();
  const total = props.selected.size;
  const searching = props.query.trim() !== "";

  function empty() {
    if (searching) return "Keine Vokabel passt zur Suche.";
    if (!props.allClasses && props.className)
      return `Für Klasse ${props.className} liegen keine Vokabelpakete ab. „Alle Klassen“ zeigt alle.`;
    if (props.hiddenByLanguage > 0)
      return "Keine Vokabelpakete mit diesem Sprachpaar.";
    return "Keine Vokabelpakete vorhanden.";
  }

  return (
    <ModalDialog
      open={props.open}
      label="Aus meinen Vokabeln wählen"
      className={styles.dialog}
      onClose={() => props.onClose?.()}
    >
      <div className={styles.inner}>
        <header className={styles.head}>
          <h2 className={styles.title}>Aus meinen Vokabeln wählen</h2>
          <button
            type="button"
            className={styles.closeButton}
            aria-label="Schließen"
            onClick={props.onClose}
          >
            <Icon name="close" size={20} />
          </button>
        </header>

        <div className={styles.controls}>
          <input
            type="search"
            className={styles.search}
            aria-label="Vokabeln durchsuchen"
            placeholder="Vokabel oder Tag suchen"
            value={props.query}
            onChange={(event) => props.onQuery?.(event.target.value)}
          />
          <label className={styles.switch}>
            <input
              type="checkbox"
              className={styles.switchBox}
              checked={props.allClasses}
              onChange={(event) => props.onAllClasses?.(event.target.checked)}
            />
            Alle Klassen
          </label>
        </div>
        {!props.allClasses && props.className ? (
          <p className={styles.note}>Gezeigt: Klasse {props.className}</p>
        ) : null}
        {props.hiddenByLanguage > 0 ? (
          <p className={styles.note}>
            {props.hiddenByLanguage === 1
              ? "1 Paket in anderen Sprachen ausgeblendet"
              : `${props.hiddenByLanguage} Pakete in anderen Sprachen ausgeblendet`}
          </p>
        ) : null}

        <div className={styles.scroll}>
          {props.packages.length === 0 ? (
            <p className={styles.empty}>{empty()}</p>
          ) : (
            <ul className={styles.packages} aria-label="Vokabelpakete">
              {props.packages.map((entry, index) => {
                const open = props.expanded.has(entry.id);
                const panelId = `${uid}-panel-${index}`;
                const all = keysOf(entry.groups);
                const plainGroup =
                  entry.groups.length === 1 && entry.groups[0]?.tag === null;
                return (
                  <li key={entry.id} className={styles.package}>
                    <div className={styles.packageHead}>
                      <GroupCheckbox
                        label={`Alle Vokabeln aus ${entry.title} auswählen`}
                        keys={all}
                        selected={props.selected}
                        onToggle={props.onToggle}
                      />
                      <h3 className={styles.packageTitle}>
                        <button
                          type="button"
                          className={styles.expand}
                          aria-expanded={open}
                          aria-controls={panelId}
                          onClick={() => props.onExpand?.(entry.id, !open)}
                        >
                          <span className={styles.expandText}>
                            <span className={styles.packageName}>
                              {entry.title}
                            </span>
                            <span className={styles.packageMeta}>
                              {entry.count}{" "}
                              {entry.count === 1 ? "Vokabel" : "Vokabeln"} ·{" "}
                              {languagesOf(entry)}
                            </span>
                          </span>
                          <Icon name={open ? "up" : "down"} size={18} />
                        </button>
                      </h3>
                    </div>
                    <div id={panelId} hidden={!open} className={styles.panel}>
                      {entry.groups.map((group) => (
                        <div key={group.tag ?? "ohne"} className={styles.group}>
                          {plainGroup ? null : (
                            <div className={styles.groupHead}>
                              <GroupCheckbox
                                label={
                                  group.tag
                                    ? `Alle Vokabeln mit Tag ${group.tag} aus ${entry.title} auswählen`
                                    : `Alle Vokabeln ohne Tag aus ${entry.title} auswählen`
                                }
                                keys={keysOf([group])}
                                selected={props.selected}
                                onToggle={props.onToggle}
                              />
                              <h4 className={styles.groupTitle}>
                                {group.tag ?? "Ohne Tag"}
                              </h4>
                            </div>
                          )}
                          <ul className={styles.pairs}>
                            {group.pairs.map(({ key, pair }) => (
                              <li key={key}>
                                <label className={styles.pair}>
                                  <input
                                    type="checkbox"
                                    className={styles.box}
                                    checked={props.selected.has(key)}
                                    onChange={(event) =>
                                      props.onToggle?.(
                                        [key],
                                        event.target.checked,
                                      )
                                    }
                                  />
                                  <span className={styles.pairText}>
                                    {side(pair.left)} → {side(pair.right)}
                                  </span>
                                </label>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <footer className={styles.foot}>
          <p className={styles.count} role="status">
            {total} ausgewählt
          </p>
          <button
            type="button"
            className={styles.clear}
            disabled={total === 0}
            onClick={props.onClear}
          >
            Auswahl leeren
          </button>
          <button
            type="button"
            className={styles.confirm}
            disabled={total === 0}
            onClick={props.onConfirm}
          >
            Übernehmen
          </button>
        </footer>
      </div>
    </ModalDialog>
  );
}
