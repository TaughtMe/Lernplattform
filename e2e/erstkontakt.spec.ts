import { expect, test } from "@playwright/test";
import { analyzeAccessibility } from "./accessibility-helpers";

// Erstkontakt (Befund C-003, Plan D5-2): Ein frischer Browserkontext ohne
// Lernstand sieht eine kurze Begrüßung mit drei Karten. Die Hauptschaltfläche
// heißt „Loslegen“ und führt in Deutsch (Wortspeicher), nie in die Tastenwelt.

const HARDWARE_KEYBOARD_KEY = "lernraum.hardwaretastatur";

test("a fresh device greets the child and 'Loslegen' leads into the German offer", async ({
  page,
}) => {
  await page.goto("/lernen");

  await expect(
    page.getByText("Schön, dass du da bist! Womit möchtest du anfangen?"),
  ).toBeVisible();
  // Die Hauptschaltfläche (Tier und Knopf tragen denselben Namen).
  const start = page.getByRole("link", { name: "Loslegen" }).last();
  await expect(start).toBeVisible();
  await expect(page.getByRole("link", { name: "Weiterlernen" })).toHaveCount(0);
  await expect(page.getByText("Heute ist nichts dran")).toHaveCount(0);

  // Drei große Karten, keine Tastenwelt.
  const cards = page.getByRole("list", { name: "Das kannst du üben" });
  await expect(cards.getByRole("link")).toHaveCount(3);
  await expect(cards.getByRole("link", { name: /Wörter üben/ })).toBeVisible();
  await expect(cards.getByRole("link", { name: /Rechnen/ })).toBeVisible();
  await expect(cards.getByRole("link", { name: /Vokabeln/ })).toBeVisible();
  await expect(page.locator('a[href="/frei/typing"]')).toHaveCount(0);

  const results = await analyzeAccessibility(page);
  expect(results.violations).toEqual([]);

  await start.click();
  await expect(page).toHaveURL(/\/frei\/german\/lernwoerter$/);
  await expect(
    page.getByRole("heading", { name: "Wortspeicher" }),
  ).toBeVisible();
});

test("the cards lead into arithmetic and vocabulary", async ({ page }) => {
  await page.goto("/lernen");
  const cards = page.getByRole("list", { name: "Das kannst du üben" });
  await cards.getByRole("link", { name: /Rechnen/ }).click();
  await expect(page).toHaveURL(/\/frei\/mathematics$/);

  await page.goto("/lernen");
  await page
    .getByRole("list", { name: "Das kannst du üben" })
    .getByRole("link", { name: /Vokabeln/ })
    .click();
  await expect(page).toHaveURL(/\/lernbox$/);
});

test("the first key press with a code in a text field marks a hardware keyboard", async ({
  page,
}) => {
  await page.goto("/raum");
  // Auf /raum heißen die Felder „Ziffer 1“ bis „Ziffer 4“; „Raumcode Zeichen“
  // trägt nur die Eingabe der Startseite. Der Tastendruck wird erst nach der
  // Hydration beobachtet.
  const first = page.getByRole("textbox", { name: "Ziffer 1" });
  await expect(page.locator("[data-hydrated]")).toHaveAttribute(
    "data-hydrated",
    "true",
  );
  await expect(first).toBeVisible();
  expect(
    await page.evaluate(
      (key) => localStorage.getItem(key),
      HARDWARE_KEYBOARD_KEY,
    ),
  ).toBeNull();

  await first.click();
  await page.keyboard.press("4");
  await expect
    .poll(() =>
      page.evaluate((key) => localStorage.getItem(key), HARDWARE_KEYBOARD_KEY),
    )
    .toBe("1");
});
