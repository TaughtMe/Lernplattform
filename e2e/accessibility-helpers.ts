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
 *
 * Außerdem warten wir, bis endliche Animationen und Übergänge zu Ende sind
 * (Einblenden einer Sprechblase). Mitten in einer Einblendung mischt der
 * Browser Vorder- und Hintergrund, axe misst dann einen zu geringen Kontrast
 * (in Firefox mit seinem langsameren Start regelmäßig). Endlose Animationen
 * wie das Wippen eines Tiers zählen nicht.
 */
export async function analyzeAccessibility(page: Page) {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter(
          (animation) =>
            animation.effect?.getComputedTiming().iterations !== Infinity,
        )
        .map((animation) => animation.finished.catch(() => undefined)),
    ),
  );
  await page.evaluate(() =>
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "instant",
    }),
  );
  return new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
}
