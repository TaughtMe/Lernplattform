"use client";

import { useLayoutEffect, useRef, useState } from "react";

type Options = {
  min: number;
  max: number;
  step?: number;
};

export function useAutoFitFontSize(
  text: string,
  { min, max, step = 2 }: Options,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLHeadingElement>(null);
  const [fontSize, setFontSize] = useState(max);

  useLayoutEffect(() => {
    const fit = () => {
      const container = containerRef.current;
      const el = textRef.current;
      if (!container || !el || !text) return;

      let size = max;
      el.style.fontSize = `${size}px`;
      while (
        size > min &&
        (el.scrollWidth > container.clientWidth ||
          el.scrollHeight > container.clientHeight)
      ) {
        size -= step;
        el.style.fontSize = `${size}px`;
      }
      setFontSize((prev) => (prev === size ? prev : size));
    };

    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  });

  return { containerRef, textRef, fontSize };
}
