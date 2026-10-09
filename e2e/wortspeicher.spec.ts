import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { createBox } from "./wortspeicher-helpers";

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];

/** Axe ohne Verstöße und kein waagrechtes Scrollen (auch bei 320 px). */
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

async function answer(page: Page, text: string) {
  const field = page.getByLabel("Deine Lösung");
  await field.fill(text);
  await field.press("Enter");
}

test("Wortbox anlegen, mit Fehler üben, wiederholen und den Bestwert sehen", async ({
  page,
}) => {
  await page.goto("/frei/german/lernwoerter");
  await expect(
    page.getByRole("button", { name: "Neue Wortbox" }),
  ).toBeVisible();
  await expectAccessible(page);

  await createBox(page, "Meine Wörter", ["Schulweg", "Sonne", "Mutter"]);
  await expect(
    page.getByRole("button", { name: /^Meine Wörter/ }),
  ).toContainText("Noch nicht geübt");

  // Startblatt: sechs Stufen sind noch ohne Bestwert, hier fünf (Stufe 6 folgt mit Paket C).
  await page.getByRole("button", { name: /^Meine Wörter/ }).click();
  const sheet = page.getByRole("dialog", { name: "Meine Wörter" });
  await expect(
    sheet.getByRole("button", { name: /Bestwert –/ }).first(),
  ).toBeVisible();
  await expectAccessible(page);
  await sheet.getByRole("button", { name: /^Stufe 1:/ }).click();
  await sheet.getByLabel("Wörter in dieser Runde").selectOption("all");
  await sheet.getByRole("button", { name: "Starten" }).click();

  // Wort 1 mit absichtlichem Fehler.
  await expect(page.getByLabel("Deine Lösung")).toBeFocused();
  await expectAccessible(page);
  await answer(page, "Schulwek");
  await expect(
    page.getByRole("heading", { name: "Noch nicht sicher" }),
  ).toBeVisible();
  await expect(
    page.getByRole("list", { name: "Das ist anders" }),
  ).toContainText("8. Buchstabe: k statt g");
  await expectAccessible(page);
  await page.getByRole("button", { name: "Noch einmal versuchen" }).click();
  await answer(page, "Schulweg");
  await expect(page.getByRole("status")).toContainText("Richtig");
  await expect(page.getByLabel("Deine Lösung")).toBeVisible({ timeout: 3_000 });
  await answer(page, "Sonne");
  await expect(page.getByLabel("Deine Lösung")).toBeVisible({ timeout: 3_000 });
  await answer(page, "Mutter");

  await expect(page.getByRole("heading", { name: "Geschafft!" })).toBeVisible({
    timeout: 3_000,
  });
  await expect(page.getByText("67 %")).toBeVisible();
  await expect(
    page.getByText("2 von 3 Wörtern auf Anhieb richtig"),
  ).toBeVisible();
  await expect(page.getByText("Das ist dein erster Bestwert")).toBeVisible();
  await expectAccessible(page);

  // Zweite Runde ohne Fehler: 100 % und neuer Bestwert.
  await page.getByRole("button", { name: "Nochmal üben" }).click();
  for (const word of ["Schulweg", "Sonne", "Mutter"]) {
    await expect(page.getByLabel("Deine Lösung")).toBeVisible({
      timeout: 3_000,
    });
    await answer(page, word);
  }
  await expect(page.getByText("Neuer Bestwert!")).toBeVisible({
    timeout: 3_000,
  });
  await expect(page.getByText("100 %")).toBeVisible();

  // Bestwert im Startblatt und auf der Kachel, auch nach dem Neuladen.
  await page.getByRole("button", { name: "Andere Stufe wählen" }).click();
  await expect(
    page
      .getByRole("dialog", { name: "Meine Wörter" })
      .getByRole("button", { name: /^Stufe 1:.*Bestwert 100 %/ }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: /^Meine Wörter/ }),
  ).toContainText("Stufe 1 · Bestwert 100 %");
});

test("Wortliste: feste Wortbox kopieren, Wörter ändern und löschen", async ({
  page,
}) => {
  await page.goto("/frei/german/lernwoerter");
  await page
    .getByRole("button", { name: "Wortliste von Doppelkonsonanten" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Doppelkonsonanten" }),
  ).toBeVisible();
  await expectAccessible(page);
  await page
    .getByRole("button", { name: "Als eigene Wortbox kopieren" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Doppelkonsonanten (Kopie)" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "‚Affe‘ ändern" }).click();
  const edit = page.getByRole("textbox", { name: "‚Affe‘ ändern zu" });
  await edit.fill("Affen");
  await edit.press("Enter");
  await expect(page.getByText("Affen", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "‚Affen‘ löschen" }).click();
  await expect(page.getByText("Affen", { exact: true })).toHaveCount(0);
  await expectAccessible(page);

  await page.getByRole("button", { name: "Wortbox löschen" }).click();
  await page.getByRole("button", { name: "Ja, Wortbox löschen" }).click();
  await expect(
    page.getByRole("button", { name: /^Doppelkonsonanten \(Kopie\)/ }),
  ).toHaveCount(0);
});

test("Stufe 5 wertet je Wort und zeigt den Merkblock", async ({ page }) => {
  await createBox(page, "Blockbox", ["Ball", "Haus", "Baum"]);
  await page.getByRole("button", { name: /^Blockbox/ }).click();
  const sheet = page.getByRole("dialog", { name: "Blockbox" });
  await sheet.getByRole("button", { name: /^Stufe 5:/ }).click();
  await sheet.getByLabel("Wörter in dieser Runde").selectOption("all");
  await sheet.getByLabel("Wörter pro Merkblock").selectOption("3");
  await sheet.getByRole("button", { name: "Starten" }).click();
  await expect(page.getByText("Ball", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Wörter verdecken" }).click();
  const field = page.getByLabel("Deine Lösung");
  await field.fill("Ball\nHaus\nBaun");
  await field.press("Enter");
  await expect(page.getByText("Noch nicht: Baum")).toBeVisible();
  await expectAccessible(page);
});
