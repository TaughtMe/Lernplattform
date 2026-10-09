import {
  describeLetterDiff,
  diffLetters,
  type LetterDiff,
} from "../../../src/domain/letter-diff";
import styles from "./wortspeicher.module.css";

function letterClass(kind: LetterDiff["kind"], mine: boolean) {
  if (kind === "gleich") return styles.letter;
  if (kind === "fehlt" && mine)
    return `${styles.letter} ${styles.letterMissing}`;
  return `${styles.letter} ${styles.letterWrong}`;
}

/**
 * Eingabe und richtiges Wort untereinander. Abweichungen sind nie nur farbig:
 * Unterstreichung bzw. gestrichelter Rahmen, dazu eine Textliste für
 * Screenreader („3. Buchstabe: m statt n“).
 */
export function LetterCompare({
  expected,
  actual,
}: {
  expected: string;
  actual: string;
}) {
  const diff = diffLetters(expected, actual);
  const notes = describeLetterDiff(diff);
  return (
    <div>
      <p className="ui-sr-only">
        Du hast „{actual}“ geschrieben, richtig ist „{expected}“.
      </p>
      <div className={styles.compare} aria-hidden="true">
        <span className={styles.compareLabel}>Du</span>
        <span className={styles.letters}>
          {diff.map((entry, index) => (
            <span key={`a${index}`} className={letterClass(entry.kind, true)}>
              {entry.kind === "fehlt" ? "·" : entry.actual}
            </span>
          ))}
        </span>
        <span className={styles.compareLabel}>Richtig</span>
        <span className={styles.letters}>
          {diff
            .filter((entry) => entry.kind !== "zuviel")
            .map((entry, index) => (
              <span
                key={`e${index}`}
                className={
                  entry.kind === "gleich"
                    ? styles.letter
                    : `${styles.letter} ${styles.letterWrong}`
                }
              >
                {entry.expected}
              </span>
            ))}
        </span>
      </div>
      {notes.length > 0 ? (
        <ul className={styles.diffList} aria-label="Das ist anders">
          {notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
