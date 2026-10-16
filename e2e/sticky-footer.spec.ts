import { expect, test, type Page } from "@playwright/test";

/**
 * WCAG 2.4.11 (Fokus nicht verdeckt): Mobil klebt der Seitenfuß über der
 * Tab-Leiste. Wer per Tab zu einem Element knapp darüber springt, darf es nicht
 * unter dem Seitenfuß sehen. Das sichert `scroll-padding-bottom` am Dokument.
 * Die axe-Prüfungen laufen am Seitenende (`accessibility-helpers.ts`) und
 * decken diesen Fall nicht ab.
 */
test.beforeEach(async ({ context, baseURL }, testInfo) => {
  // Der Seitenfuß klebt nur unter 900 px; Tab auf Links ist in WebKit
  // einstellungsabhängig. Darum gilt der Test für die Chromium-Projekte mit
  // schmalem Viewport.
  test.skip(
    !["mobile-chrome", "minimum-width"].includes(testInfo.project.name),
    "Seitenfuß klebt nur mobil; Tab-Fokus wird in Chromium geprüft",
  );
  await context.addCookies([
    { name: "lernraum-vorschau", value: "1", url: baseURL! },
  ]);
});

async function expectStickyFooter(page: Page) {
  const footer = page.locator("main > footer");
  await expect(footer).toBeVisible();
  expect(await footer.evaluate((node) => getComputedStyle(node).position)).toBe(
    "sticky",
  );
  return footer;
}

/** Der Fokus liegt mit seiner Unterkante über der Oberkante des Seitenfußes. */
async function expectFocusAboveFooter(page: Page, description: string) {
  const [focus, footer] = await Promise.all([
    page.evaluate(() => {
      const node = document.activeElement;
      if (!node || node === document.body || node.closest("footer, nav")) {
        return null;
      }
      const { bottom } = node.getBoundingClientRect();
      return { bottom, label: node.textContent?.trim().slice(0, 40) ?? "" };
    }),
    page.locator("main > footer").boundingBox(),
  ]);
  if (!focus) return;
  // 1 px Toleranz: Der Browser rundet die Scrollposition auf ganze Pixel.
  expect(
    focus.bottom,
    `${description} „${focus.label}“: Unterkante über der Oberkante des Seitenfußes`,
  ).toBeLessThanOrEqual(footer!.y + 1);
}

test("Tab zu „Zum Wortspeicher“ landet über dem klebenden Seitenfuß", async ({
  page,
}) => {
  await page.goto("/lernen/fortschritt");
  const link = page.getByRole("link", { name: "Zum Wortspeicher" });
  await expect(link).toBeVisible();
  await expectStickyFooter(page);

  // Dem Link von oben per Tab folgen; der Browser scrollt ihn ins Bild.
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.locator("body").press("Tab");
  let reached = false;
  for (let i = 0; i < 60 && !reached; i += 1) {
    reached = await link.evaluate((node) => node === document.activeElement);
    if (!reached) await page.keyboard.press("Tab");
  }
  expect(reached, "Tab erreicht „Zum Wortspeicher“").toBe(true);
  await expectFocusAboveFooter(page, "Fokus");
});

test("Tab durch die Textbox-Liste lässt den Fokus nie unter dem Seitenfuß", async ({
  page,
}) => {
  await page.goto("/frei/german/textbox");
  await expect(page.getByText("50 Texte")).toBeVisible();
  await expectStickyFooter(page);

  // Die Liste reicht über den unteren Rand: Jeder neue Fokus scrollt nach.
  await page.locator("body").press("Tab");
  for (let i = 0; i < 30; i += 1) {
    await expectFocusAboveFooter(page, `Tab ${i + 1}`);
    await page.keyboard.press("Tab");
  }
});
