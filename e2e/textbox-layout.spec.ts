import { expect, test, type Page } from "@playwright/test";
import { analyzeAccessibility } from "./accessibility-helpers";
import { TEXTBOX_TEXTS } from "../src/domain/textbox-library";

/**
 * Neues Layout der Textbox (Design 9b–9f): Auswahl mit Filtern, Eingabe im Heft,
 * Vollbild und Durchgang wiederholen. Der Durchlauf über alle Durchgänge und die
 * Fachlogik prüft textbox.spec.ts.
 */
const text = TEXTBOX_TEXTS[0]!;
test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([
    { name: "lernraum-vorschau", value: "1", url: baseURL! },
  ]);
});

const isDesktop = (page: Page) => (page.viewportSize()?.width ?? 0) >= 1100;

async function expectAccessible(page: Page) {
  const results = await analyzeAccessibility(page);
  expect(results.violations).toEqual([]);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth + 1,
    ),
  ).toBe(true);
}

async function openLibrary(page: Page) {
  await page.goto("/frei/german/textbox");
  await expect(page.getByRole("heading", { name: "Textbox" })).toBeVisible();
}

async function useDark(page: Page) {
  await expect(async () => {
    await page.getByRole("button", { name: "Hell oder dunkel" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark", {
      timeout: 1000,
    });
  }).toPass();
}

async function playGapRound(page: Page, round: number) {
  await expect(
    page.getByRole("heading", { name: `Durchgang ${round} von 4: Merken` }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ich bin bereit" }).click();
  await expect(
    page.getByRole("textbox", { name: /^Lücke 1 von/ }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Prüfen" }).click();
  await expect(
    page.getByRole("heading", { name: `Durchgang ${round} von 4: Kontrolle` }),
  ).toBeVisible();
}

const nav = (page: Page) =>
  page.getByRole("navigation", { name: "Hauptnavigation" });

test("Filter: Stufe, Schwerpunkt, Chips und Suche", async ({ page }) => {
  await openLibrary(page);
  const cards = page.getByRole("list", { name: "Texte" }).locator("> li");
  const total = await cards.count();
  expect(total).toBe(TEXTBOX_TEXTS.length);

  const level = page.getByRole("button", { name: "Schwer", exact: true });
  await level.click();
  await expect(level).toHaveAttribute("aria-pressed", "true");
  const hard = TEXTBOX_TEXTS.filter((t) => t.difficulty === "schwer").length;
  await expect(cards).toHaveCount(hard);
  await expect(page.getByText(`${hard} von ${total} Texten`)).toBeVisible();

  await page.getByRole("button", { name: /^Thema/ }).click();
  await page.getByRole("checkbox", { name: /Wörter mit ie/ }).check();
  const both = TEXTBOX_TEXTS.filter(
    (t) => t.difficulty === "schwer" && t.phenomena.includes("ie"),
  ).length;
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Thema · 1" })).toBeFocused();
  await expect(cards).toHaveCount(both);

  await page.getByRole("button", { name: "Filter „Schwer“ entfernen" }).click();
  await expect(cards).toHaveCount(
    TEXTBOX_TEXTS.filter((t) => t.phenomena.includes("ie")).length,
  );
  await page
    .getByRole("button", { name: "Filter „Wörter mit ie“ entfernen" })
    .click();
  await expect(cards).toHaveCount(total);

  await page.getByRole("searchbox", { name: "Text suchen" }).fill(text.title);
  await expect(
    page.getByRole("button", { name: `${text.title} üben` }),
  ).toBeVisible();
  expect(await cards.count()).toBeLessThan(total);
});

test("Weitermachen setzt eine angefangene Übung am Desktop fort", async ({
  page,
}) => {
  test.skip(!isDesktop(page), "Weitermachen gibt es nur am Desktop");
  await openLibrary(page);
  await page.getByRole("button", { name: `${text.title} üben` }).click();
  await playGapRound(page, 1);
  await page.reload();
  const section = page.getByRole("region", { name: "Weitermachen" });
  await expect(section).toContainText("Durchgang 2 von 4");
  await section
    .getByRole("button", { name: `${text.title} fortsetzen` })
    .click();
  await expect(
    page.getByRole("heading", { name: "Durchgang 2 von 4: Merken" }),
  ).toBeVisible();
});

test("Durchgang wiederholen führt zurück zum Merken, das Ergebnis bleibt gespeichert", async ({
  page,
}) => {
  await openLibrary(page);
  await page.getByRole("button", { name: `${text.title} üben` }).click();
  await playGapRound(page, 1);
  await page.getByRole("button", { name: "Weiter zu Durchgang 2" }).click();
  await playGapRound(page, 2);
  await page.getByRole("button", { name: "Durchgang wiederholen" }).click();
  await expect(
    page.getByRole("heading", { name: "Durchgang 2 von 4: Merken" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: `${text.title} weiterüben` }),
  ).toBeVisible();
  await expect(page.getByText("Durchgang 3 offen").first()).toBeVisible();
});

test("mobil: Tab-Leiste weg, Aktionsleiste sichtbar, Lücke nicht verdeckt", async ({
  page,
}) => {
  test.skip(isDesktop(page), "nur für schmale Bildschirme");
  await openLibrary(page);
  await expect(nav(page)).toBeVisible();
  await page.getByRole("button", { name: `${text.title} üben` }).click();
  await expect(nav(page)).toBeHidden();
  await page.getByRole("button", { name: "Ich bin bereit" }).click();
  const gaps = page.getByRole("textbox", { name: /^Lücke \d+ von/ });
  const count = await gaps.count();
  const bar = page.getByRole("button", { name: "Prüfen" });
  await expect(bar).toBeInViewport();
  for (let index = 0; index < count; index += 1) {
    await gaps.nth(index).focus();
    const gap = await gaps.nth(index).boundingBox();
    const action = await bar.boundingBox();
    expect(gap).not.toBeNull();
    expect(action).not.toBeNull();
    expect(gap!.y + gap!.height).toBeLessThanOrEqual(action!.y + 1);
  }
  await page.getByRole("button", { name: "Zurück zur Auswahl" }).click();
  await expect(page.getByRole("heading", { name: "Textbox" })).toBeVisible();
  await expect(nav(page)).toBeVisible();
});

test("Desktop: Vollbild blendet die Seitenleiste aus und bleibt nach dem Neuladen", async ({
  page,
}) => {
  test.skip(!isDesktop(page), "Vollbild gibt es nur am Desktop");
  await openLibrary(page);
  await page.getByRole("button", { name: `${text.title} üben` }).click();
  await expect(nav(page)).toBeVisible();
  await page.getByRole("button", { name: "Vollbild", exact: true }).click();
  await expect(nav(page)).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Vollbild beenden" }),
  ).toBeFocused();
  await expectAccessible(page);
  await page.reload();
  await openLibrary(page);
  await page
    .getByRole("button", { name: /^Der kleine Hund (üben|weiterüben)$/ })
    .click();
  await expect(nav(page)).toBeHidden();
  await page.getByRole("button", { name: "Vollbild beenden" }).click();
  await expect(nav(page)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Vollbild", exact: true }),
  ).toBeFocused();
});

for (const theme of ["hell", "dunkel"] as const) {
  test(`Barrierefreiheit (${theme}): Auswahl, Schwerpunkt-Feld und alle Schritte`, async ({
    page,
  }) => {
    await openLibrary(page);
    if (theme === "dunkel") await useDark(page);
    await expectAccessible(page);
    await page.getByRole("button", { name: /^Thema/ }).click();
    await expectAccessible(page);
    await page
      .getByRole("button", { name: /^Fertig$|Texte anzeigen|Text anzeigen/ })
      .click();

    await page.getByRole("button", { name: `${text.title} üben` }).click();
    await expectAccessible(page); // Merken
    await page.getByRole("button", { name: "Ich bin bereit" }).click();
    await expectAccessible(page); // Lücken
    await page.getByRole("button", { name: "Prüfen" }).click();
    await expectAccessible(page); // Kontrolle
    for (const round of [2, 3] as const) {
      await page
        .getByRole("button", { name: `Weiter zu Durchgang ${round}` })
        .click();
      await playGapRound(page, round);
    }
    await page.getByRole("button", { name: "Weiter zu Durchgang 4" }).click();
    await page.getByRole("button", { name: "Ich bin bereit" }).click();
    const field = page.getByRole("textbox", {
      name: "Dein Text aus dem Gedächtnis",
    });
    await expectAccessible(page); // Durchgang 4
    await field.fill("Im Garten");
    await page.getByRole("button", { name: "Prüfen" }).click();
    await expectAccessible(page); // Kontrolle Durchgang 4
  });
}

test("Barrierefreiheit: Vollbild (Lücken und freies Schreiben)", async ({
  page,
}) => {
  test.skip(!isDesktop(page), "Vollbild gibt es nur am Desktop");
  await openLibrary(page);
  await page.getByRole("button", { name: `${text.title} üben` }).click();
  await page.getByRole("button", { name: "Vollbild", exact: true }).click();
  await page.getByRole("button", { name: "Ich bin bereit" }).click();
  await expectAccessible(page);
  await page.getByRole("button", { name: "Prüfen" }).click();
  await expectAccessible(page);
});

test("Tippflächen sind mindestens 44 × 44 px", async ({ page }) => {
  await openLibrary(page);
  const sizes = async (
    locators: ReturnType<Page["getByRole"]>[],
    minWidth = 43.5,
  ) => {
    for (const locator of locators) {
      const box = await locator.first().boundingBox();
      expect(box, String(locator)).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(minWidth);
      expect(box!.height).toBeGreaterThanOrEqual(43.5);
    }
  };
  await page.getByRole("button", { name: "Leicht", exact: true }).click();
  // Mobil belegen die Stufenpunkte nur das linke Viertel: mindestens 28 px breit, 44 px hoch.
  await sizes(
    [
      page.getByRole("button", { name: "Leicht", exact: true }),
      page.getByRole("button", { name: "Mittel", exact: true }),
    ],
    isDesktop(page) ? 43.5 : 27.5,
  );
  await sizes([
    page.getByRole("button", { name: /^Filter .* entfernen$/ }),
    page
      .getByRole("button", { name: /: Verlauf ansehen$/ })
      .or(page.getByRole("button", { name: "Thema" })),
  ]);
  await page
    .getByRole("button", { name: `${text.title} üben` })
    .first()
    .click();
  await sizes([page.getByRole("button", { name: "Zurück zur Auswahl" })]);
});
