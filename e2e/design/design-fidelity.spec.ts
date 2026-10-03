import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

/**
 * Jede umgesetzte Ansicht muss ihrem Referenzbild aus der Vorlage
 * entsprechen (docs/design/screens.json, docs/design/referenz). Die
 * Toleranz deckt Kantenglättung und die dokumentierten bewussten
 * Abweichungen ab, keine Unterschiede in Layout, Abständen oder
 * Schriftgrößen. Screens mit Status „offen“ erscheinen als übersprungen.
 *
 * Optionale Liste `hide` je Eintrag: Selektoren (innerhalb der Ansicht), die
 * vor dem Vergleich per `display: none` entfernt werden. Nur für bewusste
 * Abweichungen von der Vorlage, z. B. die mobile CSV-Schaltfläche in 5c-live.
 * Eine Playwright-`mask` genügt dort nicht: Die Schaltfläche verschiebt die
 * Fehlerliste darunter. Referenzbilder und Toleranz bleiben unverändert.
 */
const MAX_DIFF_RATIO = Number(process.env["DESIGN_MAX_DIFF"] ?? 0.012);

const manifest = JSON.parse(
  readFileSync(
    new URL("../../docs/design/screens.json", import.meta.url),
    "utf8",
  ),
) as {
  screens: Array<{
    id: string;
    width: number;
    height: number;
    status: string;
    hide?: string[];
  }>;
};

for (const screen of manifest.screens) {
  test(`Design ${screen.id}`, async ({ page }) => {
    test.skip(screen.status !== "umgesetzt", "Ansicht noch nicht umgesetzt");
    await page.setViewportSize({ width: screen.width, height: screen.height });
    await page.goto(`/entwicklung/screens/${screen.id}`);
    const frame = page.locator(`[data-screen="${screen.id}"]`);
    await expect(frame).toBeVisible();
    for (const selector of screen.hide ?? []) {
      await frame
        .locator(selector)
        .evaluateAll((nodes) =>
          nodes.forEach(
            (node) => ((node as HTMLElement).style.display = "none"),
          ),
        );
    }
    await page.evaluate(() => document.fonts.ready);
    await expect(frame).toHaveScreenshot(`${screen.id}.png`, {
      maxDiffPixelRatio: MAX_DIFF_RATIO,
    });
  });
}
