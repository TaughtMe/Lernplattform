import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

/**
 * Jede umgesetzte Ansicht muss ihrem Referenzbild aus der Vorlage
 * entsprechen (docs/design/screens.json, docs/design/referenz). Die
 * Toleranz deckt Kantenglättung und die dokumentierten bewussten
 * Abweichungen ab, keine Unterschiede in Layout, Abständen oder
 * Schriftgrößen. Screens mit Status „offen“ erscheinen als übersprungen.
 */
const MAX_DIFF_RATIO = Number(process.env["DESIGN_MAX_DIFF"] ?? 0.012);

const manifest = JSON.parse(
  readFileSync(
    new URL("../../docs/design/screens.json", import.meta.url),
    "utf8",
  ),
) as {
  screens: Array<{ id: string; width: number; height: number; status: string }>;
};

for (const screen of manifest.screens) {
  test(`Design ${screen.id}`, async ({ page }) => {
    test.skip(screen.status !== "umgesetzt", "Ansicht noch nicht umgesetzt");
    await page.setViewportSize({ width: screen.width, height: screen.height });
    await page.goto(`/entwicklung/screens/${screen.id}`);
    const frame = page.locator(`[data-screen="${screen.id}"]`);
    await expect(frame).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await expect(frame).toHaveScreenshot(`${screen.id}.png`, {
      maxDiffPixelRatio: MAX_DIFF_RATIO,
    });
  });
}
