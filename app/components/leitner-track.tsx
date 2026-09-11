import type { LeitnerBox } from "../../src/domain/leitner-schedule";

const BOXES: readonly LeitnerBox[] = [1, 2, 3, 4, 5];

export function LeitnerTrack({
  label,
  currentBox,
}: {
  label: string;
  currentBox: LeitnerBox;
}) {
  return (
    <section
      className="leitner-track"
      aria-label={`${label}: Box ${currentBox} von 5`}
    >
      <div className="leitner-track__heading">
        <h3>{label}</h3>
        <strong>Box {currentBox}</strong>
      </div>
      <ol className="leitner-boxes" aria-label="Fünf Leitner-Boxen">
        {BOXES.map((box) => (
          <li
            className={
              box === currentBox
                ? "leitner-box is-current"
                : box < currentBox
                  ? "leitner-box is-passed"
                  : "leitner-box"
            }
            key={box}
            aria-current={box === currentBox ? "step" : undefined}
          >
            <span>Box {box}</span>
            <strong aria-hidden={box === currentBox ? undefined : true}>
              {box === currentBox ? "1" : ""}
            </strong>
          </li>
        ))}
      </ol>
    </section>
  );
}
