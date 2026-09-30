"use client";

import type { ReactNode, Ref } from "react";
import { Icon } from "../../ui/icons";
import { cx } from "../parts/parts";
import styles from "./math-editor.module.css";

export type MathOperator = "+" | "-" | "*" | "/";

/** Teil einer Aufgabe in der Vorschau; Zahlen können zur Lücke werden. */
export type MathPreviewPart =
  | { kind: "symbol"; text: string }
  | { kind: "number"; text: string; gapIndex: number };

export type MathPreviewRow =
  | { kind: "plain"; content: ReactNode }
  | { kind: "gaps"; parts: readonly MathPreviewPart[]; active: number };

export type MathEditorProps = {
  operators: readonly MathOperator[];
  min: number;
  max: number;
  count: number;
  allowNegative: boolean;
  excludeZeroOperand: boolean;
  excludeZeroResult: boolean;
  gap: boolean;
  tables: { all: readonly number[]; active: readonly number[] };
  settingsOpen: boolean;
  /** Aufgaben mit Ergebnis, z. B. „7 + 5 = 12“ (Formeln als Knoten). */
  lines: readonly ReactNode[];
  preview: readonly MathPreviewRow[];
  edit: {
    index: number | null;
    draft: string;
    /** „= 12“, „ungültig“ oder leer. */
    result: string;
    invalid: boolean;
  };
  /** Eingabefeld der bearbeiteten Aufgabe (Rechenzeichen an der Cursorposition). */
  inputRef?: Ref<HTMLInputElement>;
  onToggleOperator?: (operator: MathOperator) => void;
  onMin?: (value: number) => void;
  onMax?: (value: number) => void;
  onCount?: (value: number) => void;
  onAllowNegative?: (value: boolean) => void;
  onExcludeZeroOperand?: (value: boolean) => void;
  onExcludeZeroResult?: (value: boolean) => void;
  onGap?: (value: boolean) => void;
  onToggleTable?: (table: number) => void;
  onToggleSettings?: () => void;
  onGenerate?: () => void;
  onEdit?: (index: number) => void;
  onReroll?: (index: number) => void;
  onDelete?: (index: number) => void;
  onAppend?: () => void;
  onDraft?: (value: string) => void;
  onCommit?: (continueEditing: boolean) => void;
  onCancel?: () => void;
  onInsert?: (token: string, cursorOffset: number) => void;
  onChooseGap?: (line: number, gapIndex: number) => void;
};

const OPERATORS: ReadonlyArray<{
  op: MathOperator;
  label: string;
  title: string;
}> = [
  { op: "+", label: "+", title: "Plus-Aufgaben" },
  { op: "-", label: "−", title: "Minus-Aufgaben" },
  { op: "*", label: "·", title: "Mal-Aufgaben" },
  { op: "/", label: ":", title: "Geteilt-Aufgaben" },
];

const TOOLBAR = [
  { label: "+", insert: " + ", offset: 3 },
  { label: "−", insert: " − ", offset: 3 },
  { label: "·", insert: " · ", offset: 3 },
  { label: ":", insert: " : ", offset: 3 },
  { label: "( )", insert: "()", offset: 1 },
  { label: "xʸ", insert: "^", offset: 1 },
  { label: "√", insert: "\\sqrt{}", offset: 6 },
  { label: "a/b", insert: "\\frac{}{}", offset: 6 },
];

function Stepper({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange?: ((value: number) => void) | undefined;
}) {
  const clamp = (next: number) => Math.min(max, Math.max(min, next));
  return (
    <span className={styles.stepper} role="group" aria-label={label}>
      <button
        type="button"
        aria-label={`${label} verringern`}
        disabled={value <= min}
        onClick={() => onChange?.(clamp(value - step))}
      >
        −
      </button>
      <input
        className={styles.stepperValue}
        type="number"
        inputMode="numeric"
        aria-label={label}
        value={value}
        min={min}
        max={max}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next)) onChange?.(clamp(Math.round(next)));
        }}
      />
      <button
        type="button"
        aria-label={`${label} erhöhen`}
        disabled={value >= max}
        onClick={() => onChange?.(clamp(value + step))}
      >
        +
      </button>
    </span>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange?: ((value: boolean) => void) | undefined;
}) {
  return (
    <label className={styles.check}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange?.(event.target.checked)}
      />
      {label}
    </label>
  );
}

/** Mathe-Aufgaben für das Lehrer-Laufdiktat: erzeugen, bearbeiten, Lücken wählen. */
export function MathEditor({ inputRef, ...props }: MathEditorProps) {
  const appending = props.edit.index === props.lines.length;
  const multiplies = props.operators.some((op) => op === "*" || op === "/");

  const editRow = (
    <div className={styles.editRow}>
      <span className={styles.editLine}>
        <input
          ref={inputRef}
          className={styles.editInput}
          value={props.edit.draft}
          aria-label="Aufgabe"
          placeholder="z. B. 4 + 4"
          onChange={(event) => props.onDraft?.(event.target.value)}
          onBlur={() => props.onCommit?.(false)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === "Tab") {
              event.preventDefault();
              props.onCommit?.(true);
            }
            if (event.key === "Escape") props.onCancel?.();
          }}
        />
        {props.edit.result ? (
          <span
            className={cx(styles.result, props.edit.invalid && styles.invalid)}
          >
            {props.edit.result}
          </span>
        ) : null}
      </span>
      <span
        className={styles.toolbar}
        role="group"
        aria-label="Rechenzeichen einfügen"
      >
        {TOOLBAR.map((item) => (
          <button
            key={item.label}
            type="button"
            className={styles.token}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => props.onInsert?.(item.insert, item.offset)}
          >
            {item.label}
          </button>
        ))}
      </span>
    </div>
  );

  return (
    <div className={styles.editor}>
      <div className={styles.bar}>
        <div className={styles.operators} role="group" aria-label="Rechenarten">
          {OPERATORS.map(({ op, label, title }) => (
            <button
              key={op}
              type="button"
              className={styles.operator}
              title={title}
              aria-label={title}
              aria-pressed={props.operators.includes(op)}
              onClick={() => props.onToggleOperator?.(op)}
            >
              {label}
            </button>
          ))}
        </div>
        <span className={styles.field}>
          <span className={styles.fieldLabel}>Bis:</span>
          <Stepper
            label="Höchster Wert"
            value={props.max}
            min={Math.max(1, props.min)}
            max={1000}
            onChange={props.onMax}
          />
        </span>
        <span className={styles.field}>
          <span className={styles.fieldLabel}>Anzahl:</span>
          <Stepper
            label="Anzahl Aufgaben"
            value={props.count}
            min={1}
            max={50}
            onChange={props.onCount}
          />
        </span>
        <button
          type="button"
          className={styles.generate}
          onClick={props.onGenerate}
        >
          <Icon name="sparkles" size={18} />
          Aufgaben erzeugen
        </button>
      </div>

      <div className={styles.panels}>
        <section className={styles.panel} aria-label="Aufgabenliste">
          <h2 className={styles.panelTitle}>{props.lines.length} Aufgaben</h2>
          {props.lines.length === 0 && props.edit.index === null ? (
            <div className={styles.empty}>
              <Icon name="sparkles" size={28} />
              <strong>Noch keine Aufgaben.</strong>
              <span>Oben erzeugen oder unten selbst hinzufügen.</span>
            </div>
          ) : (
            <ul className={styles.list}>
              {props.lines.map((line, index) =>
                props.edit.index === index ? (
                  <li key={`edit-${index}`}>{editRow}</li>
                ) : (
                  <li key={index} className={styles.row}>
                    <span className={styles.number} aria-hidden="true">
                      {index + 1}
                    </span>
                    <button
                      type="button"
                      className={styles.line}
                      title="Zum Bearbeiten klicken"
                      onClick={() => props.onEdit?.(index)}
                    >
                      {line}
                    </button>
                    <button
                      type="button"
                      className={styles.icon}
                      aria-label={`Aufgabe ${index + 1} neu würfeln`}
                      title="Neu würfeln"
                      onClick={() => props.onReroll?.(index)}
                    >
                      <Icon name="refresh" size={16} />
                    </button>
                    <button
                      type="button"
                      className={cx(styles.icon, styles.danger)}
                      aria-label={`Aufgabe ${index + 1} löschen`}
                      title="Löschen"
                      onClick={() => props.onDelete?.(index)}
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </li>
                ),
              )}
              {appending ? <li>{editRow}</li> : null}
            </ul>
          )}
          {!appending ? (
            <button
              type="button"
              className={styles.append}
              onClick={props.onAppend}
            >
              <Icon name="plus" size={16} />
              Aufgabe hinzufügen
            </button>
          ) : null}
        </section>

        <section className={styles.panel} aria-label="Vorschau">
          <div className={styles.panelHead}>
            <h2 className={styles.panelTitle}>
              {props.settingsOpen
                ? "Einstellungen"
                : props.gap
                  ? "Vorschau · Lücken"
                  : "Vorschau"}
            </h2>
            <button
              type="button"
              className={cx(styles.gear, props.settingsOpen && styles.gearOn)}
              aria-label="Zahlenraum und Regeln"
              aria-expanded={props.settingsOpen}
              onClick={props.onToggleSettings}
            >
              <Icon name="gear" size={17} />
            </button>
          </div>

          {props.settingsOpen ? (
            <div className={styles.settings}>
              <span className={styles.groupTitle}>Zahlenraum</span>
              <div className={styles.range}>
                <span className={styles.field}>
                  <span className={styles.fieldLabel}>Von:</span>
                  <Stepper
                    label="Kleinster Wert"
                    value={props.min}
                    min={-999}
                    max={props.max}
                    onChange={props.onMin}
                  />
                </span>
                <span className={styles.field}>
                  <span className={styles.fieldLabel}>Bis:</span>
                  <Stepper
                    label="Größter Wert"
                    value={props.max}
                    min={Math.max(1, props.min)}
                    max={1000}
                    onChange={props.onMax}
                  />
                </span>
              </div>
              <p className={styles.note}>
                <strong>Bis</strong> ist der höchste Wert in jeder Aufgabe –
                auch das Ergebnis – und gilt für alle Rechenarten.{" "}
                <strong>Von</strong> ist die untere Grenze und wirkt nur bei +
                und −.
              </p>
              <span className={styles.groupTitle}>Regeln</span>
              <Check
                label="Negative Ergebnisse zulassen"
                checked={props.allowNegative}
                onChange={props.onAllowNegative}
              />
              <Check
                label="0 als Rechenzahl vermeiden"
                checked={props.excludeZeroOperand}
                onChange={props.onExcludeZeroOperand}
              />
              <Check
                label="Ergebnis 0 vermeiden"
                checked={props.excludeZeroResult}
                onChange={props.onExcludeZeroResult}
              />
              <span className={styles.groupTitle}>Aufgabenform</span>
              <Check
                label="Lückenaufgaben"
                checked={props.gap}
                onChange={props.onGap}
              />
              {multiplies ? (
                <>
                  <span className={styles.groupTitle}>
                    Einmaleins-Reihen · nichts gewählt bedeutet alle
                  </span>
                  <div className={styles.tables}>
                    {props.tables.all.map((table) => (
                      <button
                        key={table}
                        type="button"
                        className={styles.operator}
                        aria-pressed={props.tables.active.includes(table)}
                        onClick={() => props.onToggleTable?.(table)}
                      >
                        {table}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          ) : props.preview.length === 0 ? (
            <div className={styles.empty}>
              <Icon name="sparkles" size={28} />
              <strong>Noch keine Aufgaben.</strong>
              <span>Die Vorschau erscheint, sobald Aufgaben da sind.</span>
            </div>
          ) : (
            <>
              {props.gap ? (
                <p className={styles.note}>
                  Tippe die Zahl an, die zur Lücke (_) werden soll.
                </p>
              ) : null}
              <ol className={styles.list}>
                {props.preview.map((row, index) => (
                  <li key={index} className={styles.row}>
                    <span className={styles.number} aria-hidden="true">
                      {index + 1}
                    </span>
                    {row.kind === "plain" ? (
                      <span className={styles.previewLine}>{row.content}</span>
                    ) : (
                      <span className={styles.gaps}>
                        {row.parts.map((part, partIndex) =>
                          part.kind === "symbol" ? (
                            <span key={partIndex} aria-hidden="true">
                              {part.text}
                            </span>
                          ) : (
                            <button
                              key={partIndex}
                              type="button"
                              className={styles.gapNumber}
                              aria-pressed={row.active === part.gapIndex}
                              aria-label={`${part.text} als Lücke`}
                              onClick={() =>
                                props.onChooseGap?.(index, part.gapIndex)
                              }
                            >
                              {row.active === part.gapIndex ? "_" : part.text}
                            </button>
                          ),
                        )}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
