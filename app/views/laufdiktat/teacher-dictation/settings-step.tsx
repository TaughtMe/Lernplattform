"use client";

import { Icon } from "../../../ui/icons";
import { cx, Eyebrow } from "../../parts/parts";
import styles from "../teacher-dictation-screen.module.css";
import type {
  ContentKind,
  DictationMode,
  DictationOption,
  TeacherDictationScreenProps,
} from "./types";
import { MODES } from "./constants";

function optionList(mode: DictationMode, kind: ContentKind) {
  const station = mode === "STATION";
  return [
    {
      id: "tts",
      label: "Vorlesen erlauben",
      hint: "Zählt als Spicker",
      show: true,
    },
    {
      id: "shuffle",
      label: station
        ? "Reihenfolge je Schülernummer mischen"
        : "Reihenfolge pro Schüler mischen",
      hint: "",
      show: true,
    },
    {
      id: "strict",
      label: "Nur getippte Eingaben",
      hint: "Verhindert Einfügen und Autokorrektur",
      show: !station,
    },
    {
      id: "taskHelp",
      label: "Aufgabe nach Fehlern zeigen",
      hint: "Mathe: nach 2 Fehlern steht die Aufgabe wieder im Antwortfeld",
      show: !station && kind === "math",
    },
    { id: "stars", label: "Sterne anzeigen", hint: "", show: !station },
    { id: "ink", label: "Tinten-Angriff", hint: "", show: mode === "BATTLE" },
    {
      id: "flicker",
      label: "Flimmer-Angriff",
      hint: "",
      show: mode === "BATTLE",
    },
  ].filter((option) => option.show) as Array<{
    id: DictationOption;
    label: string;
    hint: string;
  }>;
}

function ModeButtons({
  mode,
  onMode,
  onOpenOptions,
}: TeacherDictationScreenProps) {
  return (
    <div className={styles.modeList}>
      {MODES.map((entry) => (
        <button
          key={entry.id}
          type="button"
          className={styles.mode}
          aria-pressed={entry.id === mode}
          onClick={() => {
            onMode?.(entry.id);
            onOpenOptions?.();
          }}
        >
          <span className={styles.modeIcon}>
            <Icon name={entry.icon} size={22} />
          </span>
          <span className={styles.modeText}>
            <span className={styles.modeTitle}>{entry.title}</span>
            <span className={styles.modeSub}>{entry.sub}</span>
          </span>
          <span className={styles.radio}>
            <Icon name="check" size={13} strokeWidth={3.4} />
          </span>
        </button>
      ))}
    </div>
  );
}

export function ModeDetails({
  mode,
  content,
  options,
  classChoice,
  stationCount,
  onToggleOption,
  onStationCount,
}: TeacherDictationScreenProps) {
  const current = MODES.find((entry) => entry.id === mode) ?? MODES[0]!;
  return (
    <div className={styles.details}>
      <div className={styles.detailsHead}>
        <span className={styles.detailsTitle}>{current.title}</span>
        <span className={styles.detailsSub}>{current.sub}</span>
      </div>
      <div className={styles.flow}>
        <Eyebrow>Ablauf</Eyebrow>
        <ol className={styles.flow}>
          {current.flow.map((text, flowIndex) => (
            <li key={text} className={styles.flowStep}>
              <span className={styles.flowNumber}>{flowIndex + 1}</span>
              {text}
            </li>
          ))}
        </ol>
      </div>
      <div className={styles.divider} />
      <div className={styles.options}>
        <Eyebrow>Optionen</Eyebrow>
        {mode === "STATION" ? (
          <div className={styles.stationCount}>
            Anzahl Stationen
            <span className={styles.stepper}>
              <button
                type="button"
                aria-label="Weniger"
                onClick={() => onStationCount?.(stationCount - 1)}
              >
                −
              </button>
              <output>{stationCount}</output>
              <button
                type="button"
                aria-label="Mehr"
                onClick={() => onStationCount?.(stationCount + 1)}
              >
                +
              </button>
            </span>
          </div>
        ) : null}
        {optionList(mode, content.kind).map((option) => (
          <button
            key={option.id}
            type="button"
            className={styles.option}
            aria-pressed={options[option.id]}
            onClick={() => onToggleOption?.(option.id)}
          >
            <span className={styles.checkbox}>
              <Icon name="check" size={13} strokeWidth={3.4} />
            </span>
            <span className={styles.optionText}>
              <span className={styles.optionLabel}>{option.label}</span>
              {option.hint ? (
                <span className={styles.optionHint}>{option.hint}</span>
              ) : null}
            </span>
          </button>
        ))}
        {classChoice && classChoice.options.length > 0 ? (
          <label className={styles.classPick}>
            <span className={styles.optionLabel}>Klasse (optional)</span>
            <select
              className={styles.classSelect}
              value={classChoice.value}
              onChange={(event) => classChoice.onChange(event.target.value)}
            >
              <option value="">Keine Klasse</option>
              {classChoice.options.map(({ id, name }) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
            <span className={styles.optionHint}>
              Nur in Runden für diese Klasse wirkt die Schreiberleichterung.
            </span>
          </label>
        ) : null}
      </div>
    </div>
  );
}

export function SettingsStep(props: TeacherDictationScreenProps) {
  return (
    <div className={cx(styles.stage, styles.settings)}>
      <div className={styles.column}>
        <span className={cx(styles.label, styles.narrowOnly)}>
          Modus antippen · Optionen öffnen sich darüber
        </span>
        <Eyebrow className={styles.wideOnly}>Spielmodus wählen</Eyebrow>
        <ModeButtons {...props} />
      </div>
      <section className={styles.settingsPanel} aria-label="Optionen">
        <ModeDetails {...props} />
      </section>
    </div>
  );
}
