"use client";

import { useEffect, useRef } from "react";

export function LiveCopyGuide({
  target,
  answer,
}: {
  target: string;
  answer: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const characters = [...target];
  const typed = [...answer];
  let prefix = 0;
  while (prefix < characters.length && characters[prefix] === typed[prefix])
    prefix++;
  useEffect(() => {
    container.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [prefix]);
  return (
    <div className="live-copy-guide">
      <p>Tippe die Lösung ab</p>
      <div
        ref={container}
        className="live-copy-guide__text"
        aria-label={`Lösung: ${target}`}
      >
        {characters.map((character, index) => (
          <span
            key={index}
            data-active={index === prefix ? "true" : undefined}
            className={index < prefix ? "is-copied" : undefined}
          >
            {character === " " ? "\u00a0" : character}
          </span>
        ))}
      </div>
    </div>
  );
}
