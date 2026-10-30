"use client";

import { useMemo } from "react";
import katex from "katex";
import { stripMathDelimiters } from "../../src/domain/mental-math";

type MathDisplayProps = {
  text: string;
  isLatex?: boolean;
  displayMode?: boolean;
  className?: string;
};

/**
 * Macht aus einer getippten Rechenzeile KaTeX-Quelltext: Umrandung mit `$`
 * entfällt, das Dezimalkomma bekommt keinen Abstand, `*` wird zum Malpunkt.
 */
function katexSource(text: string) {
  return stripMathDelimiters(text)
    .replace(/(\d),(?=\d)/g, "$1{,}")
    .replace(/\*/g, "\\cdot ");
}

/**
 * Shows a math prompt: plain text normally, or KaTeX-rendered for the more
 * complex manually typed tasks (fraction/power/root, see LiveWord.isLatex).
 * Renders the raw text instead of crashing on invalid LaTeX, since that can
 * happen with free-form manual input.
 */
export function MathDisplay({
  text,
  isLatex,
  displayMode = false,
  className,
}: MathDisplayProps) {
  const html = useMemo(() => {
    if (!isLatex) return null;
    try {
      return katex.renderToString(katexSource(text), {
        throwOnError: false,
        displayMode,
        strict: false,
        trust: false,
        maxExpand: 1000,
        maxSize: 50,
      });
    } catch {
      return null;
    }
  }, [text, isLatex, displayMode]);

  if (html) {
    // katex.renderToString returns controlled, self-generated markup (not
    // user HTML), so this is safe to inject directly.
    return (
      <span className={className} dangerouslySetInnerHTML={{ __html: html }} />
    );
  }
  return <span className={className}>{text}</span>;
}

/**
 * Text mit eingebetteten Formeln: Was zwischen zwei `$` steht, wird mit KaTeX
 * gesetzt, der Rest bleibt Text. So können Lösungsschritte einen Bruch
 * enthalten („Jetzt rechnest du zu Ende: 23 + $\frac{1}{2}$.“).
 */
export function MathText({ text }: { text: string }) {
  const parts = text.split(/\$([^$]+)\$/);
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <MathDisplay key={index} text={part} isLatex />
        ) : (
          part
        ),
      )}
    </>
  );
}
