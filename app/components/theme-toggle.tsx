"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useHydrated, useStored } from "../hooks/use-stored";
import { Icon } from "./icons";

export type Theme = "light" | "dark";

function currentTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

/** Hell/Dunkel-Schalter. Die Wahl bleibt als Geräteeinstellung lokal gespeichert. */
export function ThemeToggle({ className = "icon-btn" }: { className?: string }) {
  const [stored, setStored] = useStored<Theme | null>("personal", "theme", null);
  const hydrated = useHydrated();
  // Vor der Hydration immer das Server-Markup rendern (sonst Hydration-Fehler im dunklen Design).
  const theme: Theme = hydrated ? stored ?? currentTheme() : "light";
  useEffect(() => {
    if (stored) document.documentElement.dataset.theme = stored;
  }, [stored]);
  return (
    <button type="button" className={className} onClick={() => setStored(theme === "dark" ? "light" : "dark")} aria-label={theme === "dark" ? "Helles Design" : "Dunkles Design"}>
      <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
    </button>
  );
}

/** true, wenn gerade das dunkle Design aktiv ist (für berechnete Farben). */
export function useIsDark(): boolean {
  return useSyncExternalStore(
    (listener) => {
      const observer = new MutationObserver(listener);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
      return () => observer.disconnect();
    },
    () => currentTheme() === "dark",
    () => false,
  );
}
