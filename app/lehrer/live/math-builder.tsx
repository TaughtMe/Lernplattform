"use client";

import {
  countMathChainNumbers,
  displayMathNumber,
  evaluateMentalMathExpression,
  isLatexMathSyntax,
  MULTIPLICATION_TABLES,
  tokenizeMathChain,
} from "../../../src/domain/mental-math";
import { MathDisplay } from "../../components/math-display";
import { Icon } from "../../ui/icons";
import { Button, NumberStepper, Toggle } from "../../ui/primitives";
import { Sheet } from "../../ui/sheet";
import type {
  TeacherLiveModel,
  TeacherLiveRefs,
} from "./use-teacher-live-room";

const OPERATIONS = [
  { op: "+", label: "+", title: "Plus-Aufgaben" },
  { op: "-", label: "−", title: "Minus-Aufgaben" },
  { op: "*", label: "·", title: "Mal-Aufgaben" },
  { op: "/", label: ":", title: "Geteilt-Aufgaben" },
] as const;

const TOOLBAR = [
  { label: "+", insert: " + ", cursorOffset: 3 },
  { label: "−", insert: " − ", cursorOffset: 3 },
  { label: "·", insert: " · ", cursorOffset: 3 },
  { label: ":", insert: " : ", cursorOffset: 3 },
  { label: "( )", insert: "()", cursorOffset: 1 },
  { label: "xʸ", insert: "^", cursorOffset: 1 },
  { label: "√", insert: "\\sqrt{}", cursorOffset: 6 },
  { label: "a/b", insert: "\\frac{}{}", cursorOffset: 6 },
];

/** Brüche, Wurzeln und Potenzen werden mit KaTeX gesetzt, alles andere als Text. */
function MathLine({ line }: { line: string }) {
  const value = evaluateMentalMathExpression(line);
  if (value === null) return <>{line}</>;
  if (!isLatexMathSyntax(line))
    return <>{`${line} = ${displayMathNumber(value)}`}</>;
  return (
    <>
      <MathDisplay text={line} isLatex /> = {displayMathNumber(value)}
    </>
  );
}

export function MathBuilder({
  t,
  mathEditInputRef,
}: {
  t: TeacherLiveModel;
} & Pick<TeacherLiveRefs, "mathEditInputRef">) {
  return (
    <div className="ui-stack">
      <div className="ui-row ui-wrap ui-live__math-bar">
        <div className="ui-row" role="group" aria-label="Rechenarten">
          {OPERATIONS.map(({ op, label, title }) => (
            <button
              type="button"
              key={op}
              className="ui-chip ui-live__char"
              title={title}
              aria-label={title}
              aria-pressed={t.mathOps.includes(op)}
              onClick={() => t.toggleMathOperation(op)}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="ui-row">
          <span className="ui-label">Bis</span>
          <NumberStepper
            label="Höchster Wert"
            value={t.mathMax}
            min={-999}
            max={1000}
            onChange={t.setMathMax}
          />
        </span>
        <span className="ui-row">
          <span className="ui-label">Anzahl</span>
          <NumberStepper
            label="Anzahl Aufgaben"
            value={t.mathCount}
            min={1}
            max={50}
            onChange={t.setMathCount}
          />
        </span>
        <Button variant="dark" size="sm" onClick={t.generateMathTasks}>
          <Icon name="sparkles" size={16} />
          Aufgaben erzeugen
        </Button>
        <button
          type="button"
          className="ui-icon-btn ui-icon-btn--square"
          aria-label="Weitere Regeln"
          title="Weitere Regeln"
          onClick={() => t.setMathSettingsOpen(true)}
        >
          <Icon name="sliders" size={18} />
        </button>
      </div>

      <div className="ui-live__columns">
        <TaskList t={t} mathEditInputRef={mathEditInputRef} />
        <Preview t={t} />
      </div>

      <Sheet
        open={t.mathSettingsOpen}
        title="Weitere Regeln"
        onClose={() => t.setMathSettingsOpen(false)}
      >
        <div className="ui-grid2">
          <span className="ui-stack" style={{ ["--gap" as string]: "4px" }}>
            <span className="ui-label">Von</span>
            <NumberStepper
              label="Kleinster Wert"
              value={t.mathMin}
              min={-999}
              max={t.mathMax}
              onChange={t.setMathMin}
            />
          </span>
          <span className="ui-stack" style={{ ["--gap" as string]: "4px" }}>
            <span className="ui-label">Bis</span>
            <NumberStepper
              label="Größter Wert"
              value={t.mathMax}
              min={t.mathMin}
              max={1000}
              onChange={t.setMathMax}
            />
          </span>
        </div>
        <Toggle
          label="Negative Ergebnisse"
          checked={t.mathAllowNegative}
          onChange={t.setMathAllowNegative}
        />
        <Toggle
          label="0 als Rechenzahl vermeiden"
          checked={t.mathExcludeZeroOperand}
          onChange={t.setMathExcludeZeroOperand}
        />
        <Toggle
          label="Ergebnis 0 vermeiden"
          checked={t.mathExcludeZeroResult}
          onChange={t.setMathExcludeZeroResult}
        />
        <Toggle
          label="Lückenaufgaben"
          checked={t.mathGap}
          onChange={t.setMathGap}
        />
        {t.mathOps.some((op) => op === "*" || op === "/") ? (
          <fieldset className="ui-stack ui-live__fieldset">
            <legend className="ui-label">
              Einmaleins-Reihen · nichts gewählt bedeutet alle
            </legend>
            <div className="ui-row ui-wrap">
              {MULTIPLICATION_TABLES.map((table) => (
                <button
                  type="button"
                  key={table}
                  className="ui-chip ui-live__char"
                  aria-pressed={t.mathTables.includes(table)}
                  onClick={() => t.toggleMathTable(table)}
                >
                  {table}
                </button>
              ))}
            </div>
          </fieldset>
        ) : null}
      </Sheet>
    </div>
  );
}

function EditRow({
  t,
  mathEditInputRef,
}: { t: TeacherLiveModel } & Pick<TeacherLiveRefs, "mathEditInputRef">) {
  return (
    <li className="ui-live__math-edit">
      <span className="ui-row">
        <input
          ref={mathEditInputRef}
          className="ui-input"
          value={t.mathDraft}
          aria-label="Aufgabe"
          placeholder="z. B. 4 + 4"
          onChange={(event) => t.setMathDraft(event.target.value)}
          onBlur={() => t.commitMathEdit(false)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === "Tab") {
              event.preventDefault();
              t.commitMathEdit(true);
            }
            if (event.key === "Escape") t.cancelMathEdit();
          }}
        />
        {t.mathDraft.trim() ? (
          <span
            className={`ui-small ui-live__math-result${
              t.mathDraftResult === null ? " is-invalid" : ""
            }`}
          >
            {t.mathDraftResult === null
              ? "ungültig"
              : `= ${displayMathNumber(t.mathDraftResult)}`}
          </span>
        ) : null}
      </span>
      <span
        className="ui-row ui-wrap"
        role="group"
        aria-label="Rechenzeichen einfügen"
      >
        {TOOLBAR.map((item) => (
          <button
            key={item.label}
            type="button"
            className="ui-chip ui-live__char"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => t.insertAtMathCursor(item.insert, item.cursorOffset)}
          >
            {item.label}
          </button>
        ))}
      </span>
    </li>
  );
}

function TaskList({
  t,
  mathEditInputRef,
}: { t: TeacherLiveModel } & Pick<TeacherLiveRefs, "mathEditInputRef">) {
  const appending = t.mathEditIndex === t.mathLines.length;
  return (
    <section className="ui-stack" aria-label="Aufgabenliste">
      <h2 className="ui-label">{t.mathLines.length} Aufgaben</h2>
      <ul className="ui-list ui-live__math-list">
        {t.mathLines.length === 0 && t.mathEditIndex === null ? (
          <li className="ui-empty ui-small">
            Noch keine Aufgaben. Oben erzeugen oder unten selbst hinzufügen.
          </li>
        ) : (
          t.mathLines.map((line, index) =>
            t.mathEditIndex === index ? (
              <EditRow
                key={`edit-${index}`}
                t={t}
                mathEditInputRef={mathEditInputRef}
              />
            ) : (
              <li key={`${line}-${index}`} className="ui-live__math-row">
                <button
                  type="button"
                  className="ui-live__math-text"
                  title="Zum Bearbeiten klicken"
                  onClick={() => t.startEditMathRow(index)}
                >
                  <MathLine line={line} />
                </button>
                <button
                  type="button"
                  className="ui-icon-btn"
                  aria-label="Neu würfeln"
                  title="Neu würfeln"
                  onClick={() => t.rerollMathLine(index)}
                >
                  <Icon name="refresh" size={16} />
                </button>
                <button
                  type="button"
                  className="ui-icon-btn"
                  aria-label="Löschen"
                  title="Löschen"
                  onClick={() => t.deleteMathLine(index)}
                >
                  <Icon name="trash" size={16} />
                </button>
              </li>
            ),
          )
        )}
        {appending ? (
          <EditRow t={t} mathEditInputRef={mathEditInputRef} />
        ) : null}
      </ul>
      {!appending ? (
        <Button variant="ghost" size="sm" onClick={t.startAppendMathLine}>
          + Aufgabe hinzufügen
        </Button>
      ) : null}
    </section>
  );
}

/** Schülersicht; bei Lückenaufgaben wird hier die Lücke gewählt. */
function Preview({ t }: { t: TeacherLiveModel }) {
  return (
    <section className="ui-stack" aria-label="Vorschau">
      <h2 className="ui-label">
        {t.mathGap ? "Vorschau (Lücken)" : "Vorschau"}
      </h2>
      {t.mathLines.length === 0 ? (
        <p className="ui-empty ui-small">
          Die Vorschau erscheint, sobald Aufgaben da sind.
        </p>
      ) : (
        <>
          {t.mathGap ? (
            <p className="ui-small ui-muted">
              Tippe die Zahl an, die zur Lücke (_) werden soll.
            </p>
          ) : null}
          <ol className="ui-list ui-live__preview">
            {t.mathLines.map((line, index) => (
              <li key={`${line}-${index}`}>
                <span className="ui-live__section-number" aria-hidden="true">
                  {index + 1}
                </span>
                {t.mathGap ? (
                  <GapPicker t={t} line={line} index={index} />
                ) : (
                  <span>
                    <MathLine line={line} />
                  </span>
                )}
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}

function GapPicker({
  t,
  line,
  index,
}: {
  t: TeacherLiveModel;
  line: string;
  index: number;
}) {
  const tokens = tokenizeMathChain(line);
  const value = evaluateMentalMathExpression(line);
  if (!tokens || value === null)
    return (
      <span>
        <MathLine line={line} />
      </span>
    );
  const numberCount = countMathChainNumbers(tokens);
  const active = t.mathGaps[index] ?? t.defaultMathGapIndex(numberCount);
  const numberIndexes = tokens.map((token, tokenIndex) =>
    token.kind === "symbol"
      ? -1
      : tokens.slice(0, tokenIndex).filter((item) => item.kind !== "symbol")
          .length,
  );
  return (
    <span className="ui-row ui-wrap ui-live__gaps">
      {tokens.map((token, tokenIndex) => {
        if (token.kind === "symbol")
          return (
            <span key={tokenIndex} aria-hidden="true">
              {token.text}
            </span>
          );
        const gapIndex = numberIndexes[tokenIndex] ?? 0;
        return (
          <button
            key={tokenIndex}
            type="button"
            className="ui-chip ui-live__char"
            aria-pressed={active === gapIndex}
            onClick={() => t.setMathLineGap(index, gapIndex)}
          >
            {active === gapIndex ? "_" : displayMathNumber(token.value)}
          </button>
        );
      })}
      <span aria-hidden="true">=</span>
      <button
        type="button"
        className="ui-chip ui-live__char"
        aria-pressed={active === numberCount}
        onClick={() => t.setMathLineGap(index, numberCount)}
      >
        {active === numberCount ? "_" : displayMathNumber(value)}
      </button>
    </span>
  );
}
