import { expect, test } from "@playwright/test";
import { analyzeAccessibility } from "./accessibility-helpers";

// Schutz vor Speicherverlust (Audit B-002, Regeln S-4 und S-5): Auf einem
// Gerät ohne Lernstand bietet die Lernen-Startseite das Einspielen einer
// Sicherung an; iPad und iPhone im Browser bekommen zusätzlich die Empfehlung,
// Lernraum zuerst zum Home-Bildschirm hinzuzufügen.

const RESTORE = "Ich habe schon gelernt – Sicherung einspielen";

test("leeres Gerät bietet das Einspielen einer Sicherung an", async ({
  page,
}) => {
  await page.goto("/lernen");
  const link = page.getByRole("link", { name: RESTORE });
  await expect(link).toBeVisible();
  const box = await link.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  // Auf einem normalen Browser gibt es keine Installationsempfehlung.
  await expect(page.getByText("Zuerst zum Home-Bildschirm")).toHaveCount(0);
  expect((await analyzeAccessibility(page)).violations).toEqual([]);

  // Der Knopf führt in den vorhandenen Einspielweg der Einstellungen.
  await link.click();
  await expect(page).toHaveURL(/\/lernen\/einstellungen#backup-title$/);
  await expect(
    page.getByRole("heading", { name: "Datensicherung" }),
  ).toBeVisible();
  await expect(page.getByText("Sicherung laden")).toBeVisible();
});

test("iPad im Browser empfiehlt vor dem ersten Lernen den Home-Bildschirm", async ({
  page,
}) => {
  // Erkennung einspeisen: iPadOS gibt sich als Mac mit Touch aus.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "platform", { get: () => "MacIntel" });
    Object.defineProperty(navigator, "maxTouchPoints", { get: () => 5 });
  });
  await page.goto("/lernen");

  await expect(page.getByText("Zuerst zum Home-Bildschirm")).toBeVisible();
  await expect(
    page.getByText("Was du hier im Browser lernst, ist in der App nicht"),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: RESTORE })).toBeVisible();
  expect((await analyzeAccessibility(page)).violations).toEqual([]);

  // Die Entscheidung bleibt über ein Neuladen erhalten.
  await page
    .getByRole("button", { name: "Trotzdem im Browser lernen" })
    .click();
  await expect(page.getByText("Zuerst zum Home-Bildschirm")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("link", { name: RESTORE })).toBeVisible();
  await expect(page.getByText("Zuerst zum Home-Bildschirm")).toHaveCount(0);
});
