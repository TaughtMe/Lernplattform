import { expect, test } from "./fixtures";
import { analyzeAccessibility } from "./accessibility-helpers";
import { hydrated } from "./hydration-helpers";

// Übungskarten (L25-4, Entscheidung 63): Der Bogen trägt nur Kennungen
// mitgelieferter Übungen; die Adresse öffnet die Übung eingestellt, das Kind
// startet selbst (Entscheidung 86).

test("Lehrkraft stellt einen Bogen zusammen, ohne Vorauswahl und ohne Barrierefehler", async ({
  page,
}) => {
  await page.goto("/lehrer/material");
  await (
    await hydrated(page.getByRole("button", { name: "Übungskarten" }))
  ).click();
  const addWordBox = page.getByRole("button", {
    name: "Wortbox-Karte hinzufügen",
  });
  // Nichts ist vorgewählt.
  await expect(addWordBox).toBeDisabled();
  await page.getByRole("combobox", { name: "Wortbox" }).selectOption("ck-tz");
  await page.getByRole("combobox", { name: "Stufe" }).selectOption("3");
  await addWordBox.click();
  await page.getByRole("checkbox", { name: "Plus" }).check();
  await page.getByRole("checkbox", { name: "Minus" }).check();
  await page.getByRole("combobox", { name: "Zahlenraum" }).selectOption("100");
  await page.getByRole("button", { name: "Rechenkarte hinzufügen" }).click();

  const sheet = page.getByRole("list", { name: "Bogen mit Übungskarten" });
  await expect(sheet.getByRole("listitem")).toHaveCount(2);
  await expect(sheet.getByText("ck und tz · Stufe 3")).toBeVisible();
  await expect(sheet.getByText("Plus und Minus bis 100")).toBeVisible();
  await expect(
    sheet.getByRole("img", { name: "QR-Code: Plus und Minus bis 100" }),
  ).toBeVisible();
  expect((await analyzeAccessibility(page)).violations).toEqual([]);

  // Im Druck stehen nur die Karten auf der Seite, oben und sichtbar.
  await page.emulateMedia({ media: "print" });
  await expect(
    page.getByRole("heading", { name: "Freigabe an Schüler" }),
  ).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Bogen drucken" }),
  ).toBeHidden();
  await expect(sheet.getByText("ck und tz · Stufe 3")).toBeInViewport();
  await page.emulateMedia({ media: "screen" });
});

test("Eine Rechenkarte belegt Kopfrechnen vor und startet nicht von selbst", async ({
  page,
}) => {
  await page.goto("/frei/mathematics?rechnen=plus,minus&bis=100");
  await expect(
    page.getByText(/Von deiner Übungskarte: Plus und Minus bis 100/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Runde starten/ }),
  ).toBeVisible();
  expect((await analyzeAccessibility(page)).violations).toEqual([]);
});

test("Eine Wortbox-Karte öffnet das Startblatt mit der Stufe der Karte", async ({
  page,
}) => {
  await page.goto("/frei/german/lernwoerter?sammlung=ck-tz&stufe=3");
  const sheet = page.getByRole("dialog");
  await expect(
    sheet.getByRole("button", { name: /^Stufe 3:/ }),
  ).toHaveAttribute("aria-pressed", "true");
});
