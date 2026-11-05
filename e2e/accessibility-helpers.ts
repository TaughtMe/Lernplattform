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
 *
 * Manche Elemente erscheinen erst nach einer asynchronen Prüfung, etwa die
 * Sprechblase der Sicherungs-Wolke auf `/lernen`, sobald feststeht, dass es
 * keinen Lernstand gibt. Deshalb gilt die Seite erst als ruhig, wenn nach dem
 * Ende aller Animationen eine kurze Weile keine neue endliche Animation startet.
 */
export async function analyzeAccessibility(page: Page) {
  await waitForSettledAnimations(page);
  await page.evaluate(() =>
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "instant",
    }),
  );
  return new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
}

/** Ruhezeit ohne neue endliche Animation, bevor axe misst. */
const QUIET_MS = 300;

async function waitForSettledAnimations(page: Page) {
  // Die Ruhezeit läuft im Testprozess, nicht in der Seite: Tests mit
  // `page.clock` steuern die Timer der Seite selbst.
  // Höchstens 20 Runden, damit eine Seite mit ständig neuen Übergängen nicht
  // hängt; axe meldet dann, was es sieht.
  for (let round = 0; round < 20; round += 1) {
    const waited = await page.evaluate(async () => {
      const running = document
        .getAnimations()
        .filter(
          (animation) =>
            animation.playState === "running" &&
            animation.effect?.getComputedTiming().iterations !== Infinity,
        );
      await Promise.all(
        running.map((animation) => animation.finished.catch(() => undefined)),
      );
      return running.length;
    });
    if (waited === 0 && round > 0) return;
    await page.waitForTimeout(QUIET_MS);
  }
}
