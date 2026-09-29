"use client";

import { useThemePreference } from "../components/theme-toggle";
import { useHydrated } from "../components/use-hydrated";

/** Runder Darstellungs-Knopf (Design: Mond/Sonne oben rechts bzw. in der Leiste). */
export function ThemeButton({ className = "" }: { className?: string }) {
  const hydrated = useHydrated();
  const { label, Icon, cycleTheme } = useThemePreference();
  return (
    <button
      type="button"
      className={`ui-icon-btn ${className}`}
      onClick={cycleTheme}
      aria-label={`Darstellung wechseln, aktuell ${hydrated ? label : "System"}`}
      title={`Darstellung: ${hydrated ? label : "System"}`}
    >
      <Icon aria-hidden="true" width={18} height={18} />
    </button>
  );
}
