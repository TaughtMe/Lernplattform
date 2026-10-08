import { Fragment, type ReactNode } from "react";
import type { LayoutToken } from "../../../src/domain/text-compare";

/**
 * Setzt einen Text aus Wörtern und Satzzeichen so zusammen, wie er im
 * Original steht (Leerraum vor dem Token wie im Original).
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
      {tokens.map((token, position) => (
        <Fragment key={position}>
          {token.spaceBefore ? " " : null}
          {token.kind === "word" ? renderWord(token) : token.text}
        </Fragment>
      ))}
    </p>
  );
}
