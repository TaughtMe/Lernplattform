import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { TEXTBOX_TEXTS } from "../src/domain/textbox-library";

const text = TEXTBOX_TEXTS[0]!;
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];

test.beforeEach(async ({ context, baseURL }) => {
  // Die Textbox ist zunächst eine Vorschau und erscheint nur mit diesem Cookie.
  await context.addCookies([
    { name: "lernraum-vorschau", value: "1", url: baseURL! },
  ]);
});

async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  expect(results.violations).toEqual([]);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth + 1,
    ),
  ).toBe(true);
}

async function playGapRound(page: Page, round: number) {
  await expect(
    page.getByRole("heading", { name: `Durchgang ${round} von 4: Merken` }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ich bin bereit" }).click();
  const first = page.getByRole("textbox", { name: /^Lücke 1 von/ });
  await expect(first).toBeFocused();
  await page.getByRole("button", { name: "Prüfen" }).click();
  await expect(
    page.getByRole("heading", { name: `Durchgang ${round} von 4: Kontrolle` }),
  ).toBeVisible();
}

test("Kachel „Textbox“ erscheint unter Üben", async ({ page }) => {
  await page.goto("/ueben");
  const tile = page.getByRole("link", { name: /^Textbox/ });
  await expect(tile).toHaveAttribute("href", "/frei/german/textbox");
  await expect(tile.locator("img")).toHaveAttribute("alt", "");
  await expect
    .poll(() =>
      tile
        .locator("img")
        .evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0),
    )
    .toBe(true);
});

test("ein Text läuft durch alle vier Durchgänge und der Bestwert bleibt", async ({
  page,
}) => {
  await page.goto("/frei/german/textbox");
  await expect(page.getByRole("heading", { name: "Textbox" })).toBeVisible();
  await expectAccessible(page);

  await page.getByRole("button", { name: `${text.title} üben` }).click();
  // Durchgang 1: Zielwörter sind farbig und zusätzlich unterstrichen markiert.
  await expect(page.locator("mark").first()).toBeVisible();
  await expect(page.getByRole("timer")).toBeVisible();
  await expectAccessible(page);
  await page.getByRole("button", { name: "Ich bin bereit" }).click();

  // Lücken: mit der Leertaste weiterspringen, Einfügen ist gesperrt.
  const first = page.getByRole("textbox", { name: /^Lücke 1 von/ });
  await expect(first).toBeFocused();
  await page.keyboard.type("Hund ");
  await expect(
    page.getByRole("textbox", { name: /^Lücke 2 von/ }),
  ).toBeFocused();
  await expectAccessible(page);
  await page.getByRole("button", { name: "Prüfen" }).click();
  await expect(
    page.getByRole("heading", { name: "Durchgang 1 von 4: Kontrolle" }),
  ).toBeVisible();
  await expectAccessible(page);
  await page.getByRole("button", { name: "Weiter zu Durchgang 2" }).click();

  await playGapRound(page, 2);
  await page.getByRole("button", { name: "Weiter zu Durchgang 3" }).click();
  await playGapRound(page, 3);
  await page.getByRole("button", { name: "Weiter zu Durchgang 4" }).click();

  // Durchgang 4: freies Schreiben des ganzen Textes.
  await expect(
    page.getByRole("heading", { name: "Durchgang 4 von 4: Merken" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ich bin bereit" }).click();
  const field = page.getByRole("textbox", {
    name: "Dein Text aus dem Gedächtnis",
  });
  await expect(field).toBeFocused();
  await expectAccessible(page);
  await field.fill(text.text);
  await page.getByRole("button", { name: "Prüfen" }).click();
  await expect(page.getByText("100 %").first()).toBeVisible();
  await page.getByRole("button", { name: "Ergebnis ansehen" }).click();
  await expect(page.getByRole("heading", { name: "Geschafft!" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Bestwert");
  await expectAccessible(page);

  // Zweiter Versuch mit schlechterem Ergebnis: der Bestwert bleibt.
  await page.getByRole("button", { name: "Nochmal üben" }).click();
  for (const round of [1, 2, 3] as const) {
    await playGapRound(page, round);
    await page
      .getByRole("button", { name: `Weiter zu Durchgang ${round + 1}` })
      .click();
  }
  await page.getByRole("button", { name: "Ich bin bereit" }).click();
  await page
    .getByRole("textbox", { name: "Dein Text aus dem Gedächtnis" })
    .fill("Im Garten");
  await page.getByRole("button", { name: "Prüfen" }).click();
  await page.getByRole("button", { name: "Ergebnis ansehen" }).click();
  await expect(page.getByRole("heading", { name: "Geschafft!" })).toBeVisible();
  await expect(page.getByRole("status")).toHaveCount(0);
  await page.getByRole("button", { name: "Anderen Text wählen" }).click();
  const row = page
    .getByRole("heading", { name: text.title })
    .locator("xpath=ancestor::li");
  await expect(row).toContainText("2 Übungen");
  await expect(row).toContainText("100 %");

  // Auch nach dem Neuladen steht der Bestwert da (lokal gespeichert).
  await page.reload();
  await expect(
    page
      .getByRole("heading", { name: text.title })
      .locator("xpath=ancestor::li"),
  ).toContainText("100 %");
});

test("eine unterbrochene Übung lässt sich nach dem Neuladen fortsetzen", async ({
  page,
}) => {
  await page.goto("/frei/german/textbox");
  await page.getByRole("button", { name: `${text.title} üben` }).click();
  await playGapRound(page, 1);
  await page.getByRole("button", { name: "Weiter zu Durchgang 2" }).click();
  await playGapRound(page, 2);

  await page.reload();
  await page.getByRole("button", { name: `${text.title} weiterüben` }).click();
  await expect(page.getByText(/Durchgang 3 von 4/).first()).toBeVisible();
  await page.getByRole("button", { name: "Fortsetzen" }).click();
  await expect(
    page.getByRole("heading", { name: "Durchgang 3 von 4: Merken" }),
  ).toBeVisible();
  await expect(page.locator("mark")).toHaveCount(0);
});

test("dunkles Farbschema bleibt barrierefrei", async ({ page }) => {
  await page.goto("/frei/german/textbox");
  // Der Umschalter reagiert erst nach dem Laden der Seite.
  await expect(async () => {
    await page.getByRole("button", { name: "Hell oder dunkel" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark", {
      timeout: 1000,
    });
  }).toPass();
  await expectAccessible(page);
  await page.getByRole("button", { name: `${text.title} üben` }).click();
  await expectAccessible(page);
  await page.getByRole("button", { name: "Ich bin bereit" }).click();
  await expectAccessible(page);
  await page.getByRole("button", { name: "Prüfen" }).click();
  await expectAccessible(page);
});
