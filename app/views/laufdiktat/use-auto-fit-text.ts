"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * Passt die Schriftgröße des Texts an den Platz seines Containers an (wie
 * `useAutoFitFontSize` im Original-Laufdiktat). Das Gerät liegt beim Laufdiktat
 * oft auf einem entfernten Tisch, deshalb soll das Wort so groß wie möglich sein.
 * `watch` ändert sich, wenn sich der Inhalt ändert (auch bei Formeln).
 */
export function useAutoFitText<T extends HTMLElement>(
  watch: unknown,
  { min = 28, max = 88 }: { min?: number; max?: number } = {},
) {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const text = ref.current;
    const box = text?.parentElement;
    if (!text || !box) return;
    function fit() {
      if (!text || !box) return;
      let low = min;
      let high = max;
      while (low < high) {
        const size = Math.ceil((low + high) / 2);
        text.style.fontSize = `${size}px`;
        const fits =
          text.scrollHeight <= box.clientHeight &&
          text.scrollWidth <= box.clientWidth;
        if (fits) low = size;
        else high = size - 1;
      }
      text.style.fontSize = `${low}px`;
    }
    fit();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    return () => observer.disconnect();
  }, [watch, min, max]);
  return ref;
}
