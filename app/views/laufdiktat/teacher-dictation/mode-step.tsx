"use client";

import { useId, useState } from "react";
import { Icon } from "../../../ui/icons";
import { cx } from "../../parts/parts";
import styles from "../dictation-editor.module.css";
import { dictationOptionList } from "./editor-options";
import type {
  DictationMode,
  EditorMode,
  TeacherDictationScreenProps,
} from "./types";

const NEW_CLASS = "__neu__";

const WORD_STORE = [
  { value: "none", label: "Aus" },
  { value: "errors", label: "Falsch geschriebene Wörter" },
  { value: "all", label: "Alle Wörter" },
] as const;

/**
 * Schritt 2 „Modus“ (Design 14c): Modi als große Auswahlkarten, rechts die
 * Optionen des Raums. Unter 900 px (16a/16b) bekommen die Modi die ganze
 * Breite; ein Tipp auf einen Modus öffnet seine Einstellungen als Fenster.
 */
export function ModeStep(
  props: TeacherDictationScreenProps & {
    modes: readonly EditorMode[];
    onChooseMode: (mode: DictationMode) => void;
  },
) {
  const titleId = useId();
  return (
    <div className={styles.modeGrid}>
      <div className={styles.modeList} role="group" aria-label="Modus">
        {props.modes.map((mode) => (
          <button
            key={mode.id}
            type="button"
            className={styles.modeCard}
            aria-pressed={mode.id === props.mode}
            onClick={() => props.onChooseMode(mode.id)}
          >
            <span className={styles.modeTexts}>
              <span className={styles.modeTitle}>{mode.title}</span>{" "}
              <span className={styles.modeText}>{mode.text}</span>
            </span>
            <span className={styles.radio} aria-hidden="true" />
          </button>
        ))}
        <span className={cx(styles.modeHint, styles.phoneOnly)}>
          Modus antippen öffnet seine Einstellungen.
        </span>
      </div>
      <section className={styles.optionsPanel} aria-labelledby={titleId}>
        <span className={styles.panelTitle} id={titleId}>
          Optionen
        </span>
        <OptionRows {...props} variant="check" />
      </section>
    </div>
  );
}

/**
 * Die Optionen des gewählten Modus: neben den Modi als Kästchen (14c), im
 * Fenster als Schalter (16a/16b). Dazu Stationen, Wortspeicher und Klasse.
 */
export function OptionRows(
  props: TeacherDictationScreenProps & { variant: "check" | "switch" },
) {
  const list =
    props.optionList ?? dictationOptionList(props.mode, props.content.kind);
  const rowClass =
    props.variant === "check" ? styles.checkRow : styles.switchRow;
  return (
    <>
      {props.mode === "STATION" ? (
        <div className={styles.countRow}>
          <span className={styles.optionLabel}>Anzahl Stationen</span>
          <span className={styles.stepper}>
            <button
              type="button"
              aria-label="Weniger Stationen"
              onClick={() => props.onStationCount?.(props.stationCount - 1)}
            >
              −
            </button>
            <output aria-live="polite">{props.stationCount}</output>
            <button
              type="button"
              aria-label="Mehr Stationen"
              onClick={() => props.onStationCount?.(props.stationCount + 1)}
            >
              +
            </button>
          </span>
        </div>
      ) : null}
      {list.map((option) => (
        <button
          key={option.id}
          type="button"
          className={rowClass}
          aria-pressed={props.options[option.id]}
          onClick={() => props.onToggleOption?.(option.id)}
        >
          {props.variant === "check" ? (
            <span className={styles.checkbox}>
              <Icon name="check" size={13} strokeWidth={3.4} />
            </span>
          ) : null}
          <span className={styles.optionTexts}>
            <span className={styles.optionLabel}>{option.label}</span>{" "}
            <span className={styles.optionHint}>{option.hint}</span>
          </span>
          {props.variant === "switch" ? (
            <span className={styles.switch} aria-hidden="true">
              <span className={styles.knob} />
            </span>
          ) : null}
        </button>
      ))}
      {props.content.kind === "text" && props.wordStore ? (
        <div className={styles.choiceBlock}>
          <div
            className={styles.choices}
            role="group"
            aria-label="Wörter in den Wortspeicher"
          >
            {WORD_STORE.map((choice) => (
              <button
                key={choice.value}
                type="button"
                className={styles.choice}
                aria-pressed={props.wordStore?.value === choice.value}
                onClick={() => props.wordStore?.onChange(choice.value)}
              >
                {choice.label}
              </button>
            ))}
          </div>
          <span className={styles.optionHint}>
            Wörter in den Wortspeicher: Die Wörter bleiben auf den Geräten der
            Kinder. Du siehst sie nicht.
          </span>
        </div>
      ) : null}
      <ClassField {...props} />
    </>
  );
}

/** Klasse des Raums; nur mit Klasse wirkt die Schreiberleichterung. */
function ClassField(props: TeacherDictationScreenProps) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const choice = props.classChoice;
  if (!choice || (choice.options.length === 0 && !props.onCreateClass)) {
    return null;
  }
  return (
    <div className={styles.choiceBlock}>
      <label className={styles.classField}>
        <span className={styles.optionLabel}>Klasse</span>
        <select
          className={styles.select}
          value={creating ? NEW_CLASS : choice.value}
          onChange={(event) => {
            if (event.target.value === NEW_CLASS) {
              setCreating(true);
              return;
            }
            setCreating(false);
            choice.onChange(event.target.value);
          }}
        >
          <option value="">Keine Klasse</option>
          {choice.options.map(({ id, name: className }) => (
            <option key={id} value={id}>
              {className}
            </option>
          ))}
          {props.onCreateClass ? (
            <option value={NEW_CLASS}>Neue Klasse …</option>
          ) : null}
        </select>
      </label>
      {creating ? (
        <span className={styles.newClass}>
          <input
            type="text"
            className={styles.textField}
            aria-label="Name der neuen Klasse"
            placeholder="z. B. 7b"
            maxLength={120}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <button
            type="button"
            className={styles.smallButton}
            disabled={!name.trim()}
            onClick={() => {
              void Promise.resolve(props.onCreateClass?.(name)).then(() => {
                setCreating(false);
                setName("");
              });
            }}
          >
            Klasse anlegen
          </button>
        </span>
      ) : null}
      <span className={styles.optionHint}>
        Nur in Runden für diese Klasse wirkt die Schreiberleichterung.
      </span>
    </div>
  );
}
