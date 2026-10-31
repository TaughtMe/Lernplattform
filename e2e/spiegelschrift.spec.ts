import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "./fixtures";
import { TEXTBOX_TEXTS } from "../src/domain/textbox-library";

const text = TEXTBOX_TEXTS[0]!;
const switchName = "Spiegelschrift im Lesetext";

async function expectNoViolations(page: Page) {
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
}

const transformOf = (page: Page, selector: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((el) => getComputedStyle(el).transform);

test("ohne Vorschau gibt es keinen Schalter", async ({ page }) => {
  await page.goto("/lernen/einstellungen");
  await expect(
    page.getByRole("heading", { name: "Darstellung" }),
  ).toBeVisible();
  await expect(page.getByRole("checkbox", { name: switchName })).toHaveCount(0);
});

test("Schalter spiegelt nur den Lesetext und schaltet sich nach 7 Tagen von selbst aus", async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([
    { name: "lernraum-vorschau", value: "1", url: baseURL! },
  ]);
  await page.clock.install({ time: new Date("2026-10-18T10:00:00Z") });
  await page.goto("/lernen/einstellungen");
  const toggle = page.getByRole("checkbox", { name: switchName });
  await expect(toggle).not.toBeChecked();
  await expectNoViolations(page);

  await toggle.focus();
  await toggle.press("Space");
  await expect(toggle).toBeChecked();
  await expect(page.getByText(/Aktiv bis 25\.10\./)).toBeVisible();
  await expectNoViolations(page);

  await page.goto("/frei/german/textbox");
  await page.getByRole("button", { name: `${text.title} üben` }).click();
  const paragraph = "p:has(mark)";
  await expect(page.locator(paragraph).first()).toBeVisible();
  expect(await transformOf(page, paragraph)).toBe("matrix(-1, 0, 0, 1, 0, 0)");
  const ready = page.getByRole("button", { name: "Ich bin bereit" });
  expect(await ready.evaluate((el) => getComputedStyle(el).transform)).toBe(
    "none",
  );

  // Auf der offenen Einstellungsseite: nach 7 Tagen plus 1 Minute ohne
  // Neuladen aus (die Merkzeit der Textbox würde die Ansicht sonst wechseln).
  await page.goto("/lernen/einstellungen");
  await expect(page.getByRole("checkbox", { name: switchName })).toBeChecked();
  await page.clock.fastForward(7 * 24 * 3600 * 1000 + 60_000);
  await expect(
    page.getByRole("checkbox", { name: switchName }),
  ).not.toBeChecked();
  await expectNoViolations(page);

  await page.goto("/frei/german/textbox");
  await page.getByRole("button", { name: `${text.title} üben` }).click();
  await expect(page.locator(paragraph).first()).toBeVisible();
  expect(await transformOf(page, paragraph)).toBe("none");
});

test("Ausschalten geht jederzeit", async ({ page, context, baseURL }) => {
  await context.addCookies([
    { name: "lernraum-vorschau", value: "1", url: baseURL! },
  ]);
  await page.goto("/lernen/einstellungen");
  const toggle = page.getByRole("checkbox", { name: switchName });
  await toggle.check();
  await page.getByRole("button", { name: "Ausschalten" }).click();
  await expect(toggle).not.toBeChecked();
});
