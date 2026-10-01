"use client";

import { Icon } from "../../ui/icons";
import { cx } from "../parts/parts";
import styles from "./vocabulary-editor.module.css";

export type VocabularySideValue = {
  primary: string;
  alternatives: readonly string[];
};
export type VocabularyRow = {
  id: string;
  left: VocabularySideValue;
  right: VocabularySideValue;
  /** Eigener LernBox-Tag; leer gilt der Standard-Tag. */
  tag?: string | undefined;
};
export type VocabularyDirectionChoice =
  "left-to-right" | "right-to-left" | "mixed";
export type VocabularyTransfer = "none" | "errors" | "all";
type Side = "left" | "right";

export type VocabularyEditorProps = {
  pairs: readonly VocabularyRow[];
  languages: ReadonlyArray<{ locale: string; label: string }>;
  locales: { left: string; right: string };
  direction: VocabularyDirectionChoice;
  caseSensitive: boolean;
  transfer: VocabularyTransfer;
  /** Tag dieser Runde für Vokabeln ohne eigenen Tag. */
  roundTag?: string;
  /** Vorschlag aus den Einstellungen, solange kein Runden-Tag gesetzt ist. */
  defaultTag?: string;
  tableInput: string;
  onLocale?: (side: Side, locale: string) => void;
  onPrimary?: (id: string, side: Side, value: string) => void;
  onAlternatives?: (id: string, side: Side, values: string[]) => void;
  onRemove?: (id: string) => void;
  onAdd?: () => void;
  onDirection?: (direction: VocabularyDirectionChoice) => void;
  onCaseSensitive?: (value: boolean) => void;
  onTransfer?: (value: VocabularyTransfer) => void;
  onTag?: (id: string, value: string) => void;
  onRoundTag?: (value: string) => void;
  onTableInput?: (value: string) => void;
  onImportTable?: () => void;
  onImportFile?: (file: File | undefined) => void;
};

/** Vokabelheft des Lehrer-Laufdiktats: Paare links, Abfrage rechts. */
export function VocabularyEditor(props: VocabularyEditorProps) {
  const label = (locale: string) =>
    props.languages.find((language) => language.locale === locale)?.label ??
    locale;
  const left = label(props.locales.left);
  const right = label(props.locales.right);
  const directions: ReadonlyArray<[VocabularyDirectionChoice, string]> = [
    ["left-to-right", `${left} → ${right}`],
    ["right-to-left", `${right} → ${left}`],
    ["mixed", "Beide Richtungen gemischt"],
  ];
  // Der Runden-Tag; ohne Eingabe gilt der Vorschlag aus den Einstellungen.
  const roundTag = props.roundTag?.trim() || props.defaultTag?.trim() || "";
  const filled = props.pairs.filter(
    (pair) => pair.left.primary.trim() && pair.right.primary.trim(),
  ).length;

  return (
    <div className={styles.editor}>
      <section className={styles.book} aria-labelledby="vocabulary-title">
        <div className={styles.bookHead}>
          <div>
            <h2 id="vocabulary-title" className={styles.title}>
              Vokabelheft
            </h2>
            <p className={styles.hint}>
              Weitere richtige Antworten mit | trennen.
            </p>
          </div>
          <span className={styles.count}>
            {filled} {filled === 1 ? "Vokabel" : "Vokabeln"}
          </span>
        </div>

        <div className={styles.languages}>
          {(["left", "right"] as const).map((side) => (
            <select
              key={side}
              className={styles.select}
              aria-label={side === "left" ? "Sprache links" : "Sprache rechts"}
              value={props.locales[side]}
              onChange={(event) => props.onLocale?.(side, event.target.value)}
            >
              {props.languages.map((language) => (
                <option key={language.locale} value={language.locale}>
                  {language.label}
                </option>
              ))}
            </select>
          ))}
          <span className={styles.spacer} aria-hidden="true" />
        </div>

        <ol className={styles.rows} aria-label="Vokabeln">
          {props.pairs.map((pair, index) => (
            <li key={pair.id} className={styles.row}>
              {(["left", "right"] as const).map((side) => (
                <span key={side} className={styles.cell}>
                  <input
                    className={styles.input}
                    aria-label={
                      side === "left"
                        ? `Vokabel ${index + 1}`
                        : `Übersetzung ${index + 1}`
                    }
                    placeholder={
                      side === "left" ? `Vokabel ${index + 1}` : "Übersetzung"
                    }
                    value={pair[side].primary}
                    onChange={(event) =>
                      props.onPrimary?.(pair.id, side, event.target.value)
                    }
                  />
                  <input
                    // Ungesteuert, damit „a | “ beim Tippen stehen bleibt.
                    key={`${pair.id}-${side}-${pair[side].alternatives.join("|")}`}
                    className={cx(styles.input, styles.alternatives)}
                    aria-label={`Weitere Antworten ${side === "left" ? "Vokabel" : "Übersetzung"} ${index + 1}`}
                    placeholder="Weitere Antworten: … | …"
                    defaultValue={pair[side].alternatives.join(" | ")}
                    onBlur={(event) =>
                      props.onAlternatives?.(
                        pair.id,
                        side,
                        event.target.value
                          .split("|")
                          .map((part) => part.trim())
                          .filter(Boolean),
                      )
                    }
                  />
                </span>
              ))}
              <button
                type="button"
                className={styles.remove}
                aria-label={`Vokabel ${index + 1} löschen`}
                onClick={() => props.onRemove?.(pair.id)}
              >
                <Icon name="trash" size={17} />
              </button>
              {props.transfer !== "none" ? (
                <input
                  className={cx(styles.input, styles.tag)}
                  aria-label={`LernBox-Tag Vokabel ${index + 1}`}
                  placeholder={
                    roundTag
                      ? `Tag: ${roundTag} (eigener Tag geht vor)`
                      : "Eigener Tag (optional)"
                  }
                  maxLength={80}
                  value={pair.tag ?? ""}
                  onChange={(event) =>
                    props.onTag?.(pair.id, event.target.value)
                  }
                />
              ) : null}
            </li>
          ))}
        </ol>

        <div className={styles.bookActions}>
          <button type="button" className={styles.add} onClick={props.onAdd}>
            <Icon name="plus" size={16} />
            Vokabel hinzufügen
          </button>
          {props.onImportFile ? (
            <label className={styles.file}>
              <Icon name="upload" size={16} />
              Datei importieren
              <input
                type="file"
                accept=".txt,.csv,.tsv,text/plain,text/csv"
                className={styles.fileInput}
                onChange={(event) => {
                  props.onImportFile?.(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
          ) : null}
        </div>
      </section>

      <aside className={styles.settings} aria-label="Abfrage">
        <fieldset className={styles.group}>
          <legend className={styles.groupTitle}>
            <Icon name="swap" size={17} />
            Abfragerichtung
          </legend>
          {directions.map(([value, text]) => (
            <label key={value} className={styles.choice}>
              <input
                type="radio"
                name="vocabulary-direction"
                className={styles.radio}
                checked={props.direction === value}
                onChange={() => props.onDirection?.(value)}
              />
              {text}
            </label>
          ))}
        </fieldset>

        <label className={cx(styles.choice, styles.check)}>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={props.caseSensitive}
            onChange={(event) => props.onCaseSensitive?.(event.target.checked)}
          />
          <span className={styles.choiceText}>
            Groß-/Kleinschreibung prüfen
            <span className={styles.choiceHint}>
              Standardmäßig aus, damit Handytastaturen nicht stören.
            </span>
          </span>
        </label>

        <label className={cx(styles.choice, styles.check)}>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={props.transfer !== "none"}
            onChange={(event) =>
              props.onTransfer?.(event.target.checked ? "errors" : "none")
            }
          />
          <span className={styles.choiceText}>
            In die LernBox übernehmen
            <span className={styles.choiceHint}>
              Nach der Runde landen die Vokabeln in der persönlichen LernBox.
            </span>
          </span>
        </label>
        {props.transfer !== "none" ? (
          <select
            className={styles.select}
            aria-label="Welche Vokabeln übernehmen?"
            value={props.transfer}
            onChange={(event) =>
              props.onTransfer?.(event.target.value as VocabularyTransfer)
            }
          >
            <option value="errors">Nur fehlerhafte Vokabeln</option>
            <option value="all">Alle Vokabeln</option>
          </select>
        ) : null}
        {props.transfer !== "none" ? (
          <label className={styles.tagField}>
            <span className={styles.choiceText}>
              Tag für diese Runde
              <span className={styles.choiceHint}>
                Gilt für alle Vokabeln ohne eigenen Tag.
              </span>
            </span>
            <input
              className={cx(styles.input, styles.tagInput)}
              maxLength={80}
              placeholder={props.defaultTag || "z. B. Unit 3"}
              value={props.roundTag ?? ""}
              onChange={(event) => props.onRoundTag?.(event.target.value)}
            />
          </label>
        ) : null}

        <hr className={styles.divider} />

        <div className={styles.paste}>
          <h3 className={styles.pasteTitle}>Tabelle einfügen</h3>
          <p className={styles.hint}>
            Zwei Spalten aus Excel/Sheets kopieren oder Semikolon verwenden.
            Alternativen mit | trennen.
          </p>
          <textarea
            className={styles.table}
            aria-label="Tabelle einfügen"
            placeholder={"Haus\thome | house\nBaum\ttree"}
            value={props.tableInput}
            onChange={(event) => props.onTableInput?.(event.target.value)}
          />
          <button
            type="button"
            className={styles.apply}
            disabled={!props.tableInput.trim()}
            onClick={props.onImportTable}
          >
            Liste übernehmen
          </button>
        </div>
      </aside>
    </div>
  );
}
