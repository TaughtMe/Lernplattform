"use client";

import katex from "katex";
import "katex/dist/katex.min.css";

/** Renders KaTeX source (fractions, roots, exponents). `throwOnError: false` shows a visible error span instead of crashing on malformed input. */
export function MathDisplay({ latex }: { latex: string }) {
  const html = katex.renderToString(latex, { throwOnError: false, output: "html" });
  return <span className="math-display" dangerouslySetInnerHTML={{ __html: html }} />;
}
