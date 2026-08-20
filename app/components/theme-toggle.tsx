"use client";

import { useState } from "react";
import { THEME_STORAGE_KEY, isTheme, nextTheme, type Theme } from "../../src/ui/theme.ts";
import { useIsClient } from "./use-is-client.ts";

export function ThemeToggle() {
  const isClient = useIsClient();
  const [, forceRender] = useState(0);

  if (!isClient) {
    return <span className="theme-toggle" aria-hidden="true" />;
  }

  const attr = document.documentElement.dataset.theme ?? null;
  const theme: Theme = isTheme(attr) ? attr : "light";

  function toggle() {
    const next = nextTheme(theme);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // localStorage may be unavailable (private mode); the toggle still works for this page view.
    }
    forceRender((n) => n + 1);
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={theme === "dark" ? "Helles Design verwenden" : "Dunkles Design verwenden"}
      onClick={toggle}
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
