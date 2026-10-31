import { test as base, type Page, type Response } from "@playwright/test";

export { expect } from "@playwright/test";
export type * from "@playwright/test";

/**
 * Browser-Tests importieren `test` und `expect` aus dieser Datei, nicht aus
 * `@playwright/test` (ESLint erzwingt das). Dann warten `page.goto`,
 * `page.reload`, `page.goBack` und `page.goForward` von selbst, bis
 * `<html data-app-hydrated>` gesetzt ist (HydrationMark im Root-Layout).
 *
 * Grund: Vor der Hydration tun Knöpfe nichts und ein gefülltes Feld wird beim
 * Hydrieren zurückgesetzt. Ohne dieses Warten wurde der Fehler bisher Test für
 * Test einzeln behoben. Klicks schützt zusätzlich die CSS-Sperre
 * (`pointer-events: none` in base.css), auf die Playwright ohnehin wartet;
 * `fill` dagegen nicht.
 *
 * Nicht abgedeckt: ein vollständiges Neuladen durch einen Klick auf einen
 * Link. Clientseitige Navigation braucht kein Warten, das Merkmal bleibt
 * gesetzt. Für Seiten aus `browser.newPage()` oder `browser.newContext()`
 * `hydrationAware(page)` aufrufen.
 *
 * Wer ausdrücklich die Seite vor der Hydration bedienen will
 * (`e2e/hydration.spec.ts`), übergibt `waitUntil: "commit"`; dann wartet
 * nichts.
 */

const HYDRATED = "html[data-app-hydrated]";
const prepared = new WeakSet<Page>();

async function waitForHydration(
  page: Page,
  response: Response | null,
  waitUntil: string | undefined,
) {
  if (waitUntil === "commit") return;
  // Nur App-Seiten tragen das Merkmal, keine PDF-, JSON- oder Bilddateien.
  const type = response?.headers()["content-type"] ?? "text/html";
  if (!type.includes("text/html")) return;
  await page.waitForSelector(HYDRATED, { state: "attached" });
}

/** Lässt die Navigationsmethoden einer Seite auf die Hydration warten. */
export function hydrationAware(page: Page): Page {
  if (prepared.has(page)) return page;
  prepared.add(page);
  for (const method of ["goto", "reload", "goBack", "goForward"] as const) {
    const original = page[method].bind(page) as (
      ...args: unknown[]
    ) => Promise<Response | null>;
    Object.assign(page, {
      [method]: async (...args: unknown[]) => {
        const options = args.find(
          (arg): arg is { waitUntil?: string } =>
            typeof arg === "object" && arg !== null,
        );
        const response = await original(...args);
        await waitForHydration(page, response, options?.waitUntil);
        return response;
      },
    });
  }
  return page;
}

export const test = base.extend({
  // `provide` statt des üblichen `use`: ESLint hielte `use` für einen React-Hook.
  context: async ({ context }, provide) => {
    context.on("page", hydrationAware);
    await provide(context);
  },
  page: async ({ page }, provide) => {
    await provide(hydrationAware(page));
  },
});
