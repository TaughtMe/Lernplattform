"use client";

import { ThemeSwitch } from "../views/parts/parts";
import { useThemeToggle } from "./theme";

/** Hell/Dunkel-Umschalter aus dem Entwurf, verbunden mit der Einstellung. */
export function ThemeToggle() {
  const { theme, toggleTheme } = useThemeToggle();
  return <ThemeSwitch theme={theme} onToggle={toggleTheme} />;
}
