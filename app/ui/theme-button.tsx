"use client";

import { useHydrated } from "../components/use-hydrated";
import { Icon } from "./icons";
import { useThemePreference } from "./theme";

/** Runder Darstellungs-Knopf: System → Hell → Dunkel. */
export function ThemeButton({ className = "" }: { className?: string }) {
  const hydrated = useHydrated();
  const { label, icon, cycleTheme } = useThemePreference();
  return (
    <button
      type="button"
      className={`ui-icon-btn ${className}`}
      onClick={cycleTheme}
      aria-label={`Darstellung wechseln, aktuell ${hydrated ? label : "System"}`}
      title={`Darstellung: ${hydrated ? label : "System"}`}
    >
      <Icon name={hydrated ? icon : "beamer"} size={18} />
    </button>
  );
}
