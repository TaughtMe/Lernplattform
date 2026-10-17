import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

export const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];

/**
 * Axe-Prüfung nach WCAG A/AA (2.2). Vorher geht es ans Seitenende: Mobil klebt
 * der Seitenfuß; erst am Seitenende steht er an seinem Platz. Sonst misst axe
 * Elemente, die zufällig an seiner Kante liegen, als teilverdeckt
 * (`target-size`), obwohl sie nur angeschnitten sind. Dass fokussierte Elemente
 * nicht unter dem klebenden Seitenfuß landen (WCAG 2.4.11), prüft
 * `sticky-footer.spec.ts`.
 */
export async function analyzeAccessibility(page: Page) {
  await page.evaluate(() =>
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "instant",
    }),
  );
  return new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
}
