import type { LeitnerBox } from "../../src/domain/leitner-schedule";

const BOXES: readonly LeitnerBox[] = [1, 2, 3, 4, 5];

/** Fünf Leitner-Boxen; die aktuelle Box ist hervorgehoben. */
export function LeitnerTrack({
  label,
  currentBox,
}: {
  label: string;
  currentBox: LeitnerBox;
}) {
  return (
    <section
      className="ui-stack ui-leitner"
      aria-label={`${label}: Box ${currentBox} von 5`}
    >
      <div className="ui-between">
        <h3 className="ui-label">{label}</h3>
        <strong className="ui-small">Box {currentBox}</strong>
      </div>
      <ol className="ui-leitner__boxes" aria-label="Fünf Leitner-Boxen">
        {BOXES.map((box) => (
          <li
            className={
              box === currentBox
                ? "is-current"
                : box < currentBox
                  ? "is-passed"
                  : undefined
            }
            key={box}
            aria-current={box === currentBox ? "step" : undefined}
          >
            {box}
          </li>
        ))}
      </ol>
    </section>
  );
}
