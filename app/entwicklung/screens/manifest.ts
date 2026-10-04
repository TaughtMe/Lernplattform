import manifest from "../../../docs/design/screens.json";
import type { Theme } from "../../views/parts/parts";

export type DesignScreen = {
  id: string;
  screen: string;
  width: number;
  height: number;
  theme: Theme;
  /** Gibt es bereits eine Ansicht für diesen Zustand? */
  implemented: boolean;
};

/**
 * Zustände ohne Vorlage: bewusste Ergänzungen, die der Katalog zeigt, der
 * Designvergleich aber nicht prüft, weil es kein Referenzbild gibt.
 * Sie stehen bewusst nicht in screens.json (das nur Zustände der Vorlage kennt).
 */
const CATALOG_ONLY: readonly DesignScreen[] = [
  {
    id: "3c-start",
    screen: "3c",
    width: 390,
    height: 788,
    theme: "light",
    implemented: true,
  },
  {
    id: "3c-assign",
    screen: "3c",
    width: 390,
    height: 788,
    theme: "light",
    implemented: true,
  },
  {
    id: "3d-start",
    screen: "3d",
    width: 1180,
    height: 700,
    theme: "light",
    implemented: true,
  },
];

/** Referenzzustände aus docs/design/screens.json, danach die Ergänzungen. */
export const DESIGN_SCREENS: readonly DesignScreen[] = [
  ...manifest.screens.map((entry) => ({
    id: entry.id,
    screen: entry.screen,
    width: entry.width,
    height: entry.height,
    theme: ("theme" in entry && entry.theme === "dark"
      ? "dark"
      : "light") as Theme,
    implemented: entry.status === "umgesetzt",
  })),
  ...CATALOG_ONLY,
];
