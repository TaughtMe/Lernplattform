import { buildLearningWordPattern } from "../../../src/domain/learning-word";
import styles from "./wortspeicher.module.css";

/** Stufe 1 bis 3: Das Wort bzw. sein Lückenmuster als große Vorgabe. */
export function StagePrompt({
  word,
  stage,
}: {
  word: string;
  stage: 1 | 2 | 3;
}) {
  const text = stage === 1 ? word : buildLearningWordPattern(word, stage);
  return (
    <h2
      className={styles.prompt}
      aria-label={
        stage === 1
          ? undefined
          : `Vorgabe: ${Array.from(text)
              .map((letter) => (letter === "_" ? "Lücke" : letter))
              .join(" ")}`
      }
    >
      {text}
    </h2>
  );
}
