"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { IconName } from "./icons";

export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "theme-preference";
const CHANGE_EVENT = "lernraum-theme-change";
const ORDER: readonly ThemePreference[] = ["system", "light", "dark"];

const LABELS: Record<ThemePreference, string> = {
  light: "Hell",
  dark: "Dunkel",
  system: "System",
};

const ICONS: Record<ThemePreference, IconName> = {
  light: "sun",
  dark: "moon",
  system: "beamer",
};

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

function resolveTheme(preference: ThemePreference): "light" | "dark" {
  if (preference !== "system") return preference;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(preference: ThemePreference) {
  const resolved = resolveTheme(preference);
  document.documentElement.dataset["theme"] = resolved;
  document.documentElement.style.colorScheme = resolved;
}

function getPreferenceSnapshot(): ThemePreference {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return isThemePreference(stored) ? stored : "system";
}

function subscribeToPreference(onChange: () => void) {
  const media = window.matchMedia?.("(prefers-color-scheme: dark)");
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  media?.addEventListener("change", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
    media?.removeEventListener("change", onChange);
  };
}

/** Gespeicherte Darstellung und Umschalter System → Hell → Dunkel. */
export function useThemePreference() {
  const preference = useSyncExternalStore<ThemePreference>(
    subscribeToPreference,
    getPreferenceSnapshot,
    (): ThemePreference => "system",
  );

  useEffect(() => {
    applyTheme(preference);
  }, [preference]);

  function cycleTheme() {
    const currentIndex = ORDER.indexOf(preference);
    const next = ORDER[(currentIndex + 1) % ORDER.length] ?? "system";
    window.localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  return {
    preference,
    label: LABELS[preference],
    icon: ICONS[preference],
    cycleTheme,
  };
}

/**
 * Umschalter aus dem Entwurf: zwei Zustände, ausgehend von der aktuell
 * sichtbaren Darstellung. Vor dem Laden gilt „hell“.
 */
export function useThemeToggle() {
  const { preference } = useThemePreference();
  const theme = useSyncExternalStore<"light" | "dark">(
    subscribeToPreference,
    () => resolveTheme(getPreferenceSnapshot()),
    () => "light",
  );

  function toggleTheme() {
    window.localStorage.setItem(
      STORAGE_KEY,
      theme === "dark" ? "light" : "dark",
    );
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  return { theme, preference, toggleTheme };
}
