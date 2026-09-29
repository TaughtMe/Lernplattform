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

/** Referenzzustände aus docs/design/screens.json. */
export const DESIGN_SCREENS: readonly DesignScreen[] = manifest.screens.map(
  (entry) => ({
    id: entry.id,
    screen: entry.screen,
    width: entry.width,
    height: entry.height,
    theme: "theme" in entry && entry.theme === "dark" ? "dark" : "light",
    implemented: entry.status === "umgesetzt",
  }),
);
