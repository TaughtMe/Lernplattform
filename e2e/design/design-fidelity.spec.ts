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
 *
 * Optional `touch`: Der Test läuft in einem Kontext mit hasTouch/isMobile, damit
 * Medienabfragen wie `(hover: hover) and (pointer: fine)` den Touch-Zustand
 * wählen (z. B. 5a-hold/5b-hold: „Mit zwei Fingern halten“ statt „Halte A und
 * L“). Desktop Chrome hat sonst Maus und Tastatur, das Ergebnis wäre vom
 * Lauf abhängig.
 *
 * Optional `ready`: Selektor (innerhalb der Ansicht), auf den vor dem Vergleich
 * gewartet wird. Für Zustände, die erst nach dem Laden des Skripts entstehen,
 * z. B. ein modaler Dialog (`dialog[open]`): Die vorab gerenderte Seite ist
 * stabil und würde sonst zu früh aufgenommen.
 */
const MAX_DIFF_RATIO = Number(process.env["DESIGN_MAX_DIFF"] ?? 0.012);

/*
 * Die Referenzbilder sind mit Arial-Breiten (Liberation Sans) gerendert. Die
 * Systemschriften der Schaltflächen (--font-control) lösen sich je nach
 * fontconfig des Rechners unterschiedlich auf. Damit der Vergleich nicht von der
 * Maschine abhängt, werden diese Namen nur im Test auf Liberation Sans/Arial
 * gelegt. Das Produkt zeigt weiter die Systemschrift.
 */
const CONTROL_FONT_CSS = ["-apple-system", "BlinkMacSystemFont", "Segoe UI"]
  .map(
    (name) =>
      `@font-face { font-family: "${name}"; src: local("Liberation Sans"), local("Arial"); }`,
  )
  .join("\n");

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
    touch?: boolean;
    ready?: string;
  }>;
};

const touchTest = test.extend({ hasTouch: true, isMobile: true });

for (const screen of manifest.screens) {
  (screen.touch ? touchTest : test)(`Design ${screen.id}`, async ({ page }) => {
    test.skip(
      screen.status !== "umgesetzt",
      "Ansicht noch nicht umgesetzt (offen) oder nur Referenz",
    );
    await page.setViewportSize({ width: screen.width, height: screen.height });
    await page.goto(`/entwicklung/screens/${screen.id}`);
    // Zustände, die erst nach der Hydrierung entstehen (z. B. das zufällige Tier
    // in 9b/9c), sollen nicht je nach Lauf früher oder später erfasst werden.
    await page.waitForLoadState("networkidle");
    await page.waitForFunction((id) => {
      const node = document.querySelector(`[data-screen="${id}"]`);
      return (
        node !== null &&
        Object.keys(node).some((key) => key.startsWith("__reactFiber"))
      );
    }, screen.id);
    await page.addStyleTag({ content: CONTROL_FONT_CSS });
    const frame = page.locator(`[data-screen="${screen.id}"]`);
    await expect(frame).toBeVisible();
    if (screen.ready) await frame.locator(screen.ready).waitFor();
    // Per Stilregel statt per Inline-Stil auf den vorhandenen Knoten: Auch Knoten,
    // die React später neu anlegt, bleiben ausgeblendet.
    if (screen.hide?.length) {
      await page.addStyleTag({
        content: screen.hide
          .map(
            (selector) =>
              `[data-screen="${screen.id}"] ${selector} { display: none !important; }`,
          )
          .join("\n"),
      });
    }
    await page.evaluate(() => document.fonts.ready);
    // Zwei Frames abwarten, damit Effekte nach der Hydrierung gelaufen sind.
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    await expect(frame).toHaveScreenshot(`${screen.id}.png`, {
      maxDiffPixelRatio: MAX_DIFF_RATIO,
    });
  });
}
