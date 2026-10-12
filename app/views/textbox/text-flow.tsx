import { Fragment, type ReactNode } from "react";
import type { LayoutToken } from "../../../src/domain/text-compare";
import styles from "./text-flow.module.css";

/** Gruppen aus einem Wort und den Satzzeichen, die im Original direkt folgen. */
function groupTokens(tokens: readonly LayoutToken[]) {
  const groups: { head: LayoutToken; trailing: LayoutToken[] }[] = [];
  for (const token of tokens) {
    const last = groups[groups.length - 1];
    if (token.kind === "punct" && !token.spaceBefore && last) {
      last.trailing.push(token);
    } else {
      groups.push({ head: token, trailing: [] });
    }
  }
  return groups;
}

/**
 * Setzt einen Text aus Wörtern und Satzzeichen so zusammen, wie er im
 * Original steht (Leerraum vor dem Token wie im Original). Ein Wort bleibt
 * mit den direkt folgenden Satzzeichen zusammen, damit kein Punkt allein
 * in die nächste Zeile bricht.
 */
export function TextFlow({
  tokens,
  renderWord,
  className,
  id,
}: {
  tokens: readonly LayoutToken[];
  renderWord: (token: LayoutToken) => ReactNode;
  className?: string | undefined;
  id?: string | undefined;
}) {
  return (
    <p className={className} id={id}>
      {groupTokens(tokens).map(({ head, trailing }, position) => (
        <Fragment key={position}>
          {head.spaceBefore ? " " : null}
          <span className={styles.nowrap}>
            {head.kind === "word" ? (
              <span className={styles.word}>{renderWord(head)}</span>
            ) : (
              head.text
            )}
            {trailing.map((token) => token.text).join("")}
          </span>
        </Fragment>
      ))}
    </p>
  );
}
