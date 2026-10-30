import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { renderToString } from "react-dom/server";
import { onTestFinished } from "vitest";

/**
 * Legt das HTML aus dem Server-Render in die Seite, wie es der Browser vor dem
 * Laden des JavaScripts zeigt. `hydrate()` übernimmt es danach mit React.
 */
export function serverRender(ui: ReactElement) {
  const container = document.body.appendChild(document.createElement("div"));
  container.innerHTML = renderToString(ui);
  // Ohne `hydrate()` räumt Testing Library das HTML nicht selbst weg.
  onTestFinished(() => container.remove());
  return {
    container,
    hydrate: () => render(ui, { container, hydrate: true }),
  };
}
