export const THEME_STORAGE_KEY = "lernraum-theme";

export type Theme = "light" | "dark";

export function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark";
}

export function nextTheme(current: Theme): Theme {
  return current === "dark" ? "light" : "dark";
}

/**
 * Inlined into a blocking <script> in the root layout so the theme is set
 * before first paint (no light-then-dark flash) and before React hydrates
 * (so the client's first render already matches what's on screen).
 */
export const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem("${THEME_STORAGE_KEY}");var t=(s==="light"||s==="dark")?s:(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.dataset.theme=t;}catch(e){}})();`;
