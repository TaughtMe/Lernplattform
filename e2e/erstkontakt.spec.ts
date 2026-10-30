import { expect, test } from "@playwright/test";
import { analyzeAccessibility } from "./accessibility-helpers";
import { seedDueWords } from "./wortspeicher-helpers";

// Erstkontakt (Befund C-003, Plan D5-2): Ein frischer Browserkontext ohne
// Lernstand sieht eine kurze Begrüßung ohne Bereichskarten. Die Hauptschaltfläche
// heißt „Loslegen“ und führt nach „Üben“. Bereichskarten erscheinen erst, wenn
// heute Aufgaben in der Tagesportion stehen (Vokabeln, Wörter, Unterricht).

const HARDWARE_KEYBOARD_KEY = "lernraum.hardwaretastatur";

test("a fresh device greets the child without area cards and 'Loslegen' leads to 'Üben'", async ({
  page,
}) => {
  await page.goto("/lernen");

  await expect(
    page.getByText(
      "Schön, dass du da bist! Tippe auf Loslegen und such dir etwas aus.",
    ),
  ).toBeVisible();
  // Die Hauptschaltfläche (Tier und Knopf tragen denselben Namen).
  const start = page.getByRole("link", { name: "Loslegen" }).last();
  await expect(start).toBeVisible();
  await expect(page.getByRole("link", { name: "Weiterlernen" })).toHaveCount(0);
  await expect(page.getByText("Heute ist nichts dran")).toHaveCount(0);

  // Alles ist über „Üben“ erreichbar: keine festen Bereichskarten, keine Tastenwelt.
  await expect(
    page.getByRole("list", { name: "Aufgaben für heute" }),
  ).toHaveCount(0);
  await expect(page.locator('a[href="/frei/typing"]')).toHaveCount(0);

  const results = await analyzeAccessibility(page);
  expect(results.violations).toEqual([]);

  await start.click();
  await expect(page).toHaveURL(/\/ueben$/);
});

test("due words show a task card that leads into today's words", async ({
  page,
}) => {
  await page.goto("/frei/german/lernwoerter");
  await seedDueWords(page, ["Hund", "Katze"]);

  await page.goto("/lernen");
  const cards = page.getByRole("list", { name: "Aufgaben für heute" });
  // Nur der Bereich mit Aufgaben hat eine Karte.
  await expect(cards.getByRole("link")).toHaveCount(1);
  const card = cards.getByRole("link", { name: /Wörter üben/ });
  await expect(card).toContainText("0 von 2 geschafft");
  await expect(cards.getByText(/Rechnen|Vokabeln/)).toHaveCount(0);

  const results = await analyzeAccessibility(page);
  expect(results.violations).toEqual([]);

  await card.click();
  await expect(page).toHaveURL(/\/frei\/german\/lernwoerter\?heute=1$/);
});

test("a new LernBox word shows a vocabulary card", async ({ page }) => {
  await page.goto("/lernbox");
  const entry = page.getByRole("menuitem", { name: /Selbst eintragen/ });
  await expect(async () => {
    if (!(await entry.isVisible())) {
      await page.getByRole("button", { name: "Vokabeln hinzufügen" }).click();
    }
    await expect(entry).toBeVisible({ timeout: 1_000 });
  }).toPass();
  await entry.click();
  await page
    .getByRole("textbox", { name: "Name des neuen Stapels" })
    .fill("Englisch 7b");
  await page.getByRole("button", { name: "Stapel anlegen" }).click();
  await page.getByRole("textbox", { name: "Deutsch" }).fill("Haus");
  await page.getByRole("textbox", { name: "Englisch" }).fill("house");
  await page.getByRole("button", { name: "Speichern und nächste" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "„Haus“ gespeichert · Box 1",
  );
  await page.getByRole("button", { name: "Fertig" }).click();

  await page.goto("/lernen");
  const cards = page.getByRole("list", { name: "Aufgaben für heute" });
  await expect(cards.getByRole("link")).toHaveCount(1);
  const card = cards.getByRole("link", { name: /Vokabeln/ });
  await expect(card).toContainText("0 von 1 geschafft");
  await card.click();
  await expect(page).toHaveURL(/\/lernbox\?heute=1$/);
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
