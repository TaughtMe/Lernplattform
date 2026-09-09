"use client";

import { useMemo } from "react";
import katex from "katex";

type MathDisplayProps = {
  text: string;
  isLatex?: boolean;
  displayMode?: boolean;
  className?: string;
};

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
      return katex.renderToString(text, {
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
