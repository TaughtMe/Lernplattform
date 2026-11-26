import {
  MATH_KINDS,
  MATH_KIND_EXAMPLES,
  MATH_KIND_LABELS,
  type MathKindId,
} from "../../../src/domain/mental-math-kinds";

/**
 * Aufgabenarten der Mittelschule (MA-11) im freien Üben. Nichts ist
 * vorgewählt, auch nicht nach Jahrgang (Entscheidung 86): Das Kind oder die
 * Lehrkraft wählt ausdrücklich.
 */
export function MathKindPicker({
  kinds,
  disabled,
  onChange,
}: {
  kinds: readonly MathKindId[];
  disabled: boolean;
  onChange: (kinds: MathKindId[]) => void;
}) {
  return (
    <fieldset className="ui-math__fieldset">
      <legend className="ui-label">
        Aufgabenarten{" "}
        <span className="ui-muted">· nichts gewählt = normale Aufgaben</span>
      </legend>
      <div
        className="ui-grid-auto"
        style={{ ["--min" as string]: "180px", ["--gap" as string]: "8px" }}
      >
        {MATH_KINDS.map((kind) => (
          <button
            type="button"
            className="ui-select-card ui-math__op"
            aria-pressed={kinds.includes(kind)}
            disabled={disabled}
            key={kind}
            onClick={() =>
              onChange(
                MATH_KINDS.filter((entry) =>
                  entry === kind
                    ? !kinds.includes(kind)
                    : kinds.includes(entry),
                ),
              )
            }
          >
            {MATH_KIND_LABELS[kind]}
            <span className="ui-tiny ui-muted">{MATH_KIND_EXAMPLES[kind]}</span>
          </button>
        ))}
      </div>
      {kinds.length ? (
        <p className="ui-small ui-muted">
          Mit gewählten Aufgabenarten stellt die Runde nur diese Aufgaben.
          Rechenarten, „Von“, „Bis“ und die Regeln unten gelten dann nicht.
        </p>
      ) : null}
    </fieldset>
  );
}
