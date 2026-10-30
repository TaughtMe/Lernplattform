import { expect, test, type Page } from "@playwright/test";

/** Spielt im Laufdiktat allein einen Satz bis zum Rundenende. */
async function playOneSentence(page: Page) {
  await page
    .getByRole("textbox", { name: /Text – Sätze und Zeilen/ })
    .fill("Haus.");
  await page.getByRole("button", { name: "Laufdiktat starten" }).click();
  await page
    .getByRole("button", { name: "Verstanden – jetzt schreiben" })
    .click();
  await page.getByRole("textbox", { name: "Deine Antwort" }).fill("Haus.");
  await page.getByRole("button", { name: "Prüfen" }).click();
  await page.getByRole("button", { name: "Runde abschließen" }).click();
  await expect(page.getByRole("heading", { name: "Geschafft!" })).toBeVisible();
}

test("Laufdiktat allein: Sterne sind Standard und lassen sich abschalten", async ({
  page,
}) => {
  await page.goto("/frei/german/laufdiktat");
  const toggle = page.getByRole("checkbox", { name: "Sterne am Ende zeigen" });
  await expect(toggle).toBeChecked();
  await playOneSentence(page);
  await expect(page.getByRole("img", { name: /von 5 Sternen/ })).toBeVisible();

  // Abschalten, neu öffnen: Die Wahl bleibt auf diesem Gerät erhalten.
  await page.goto("/frei/german/laufdiktat");
  await page
    .getByRole("checkbox", { name: "Sterne am Ende zeigen" })
    .setChecked(false);
  await page.reload();
  await expect(
    page.getByRole("checkbox", { name: "Sterne am Ende zeigen" }),
  ).not.toBeChecked();
  await playOneSentence(page);
  await expect(page.getByRole("img", { name: /von 5 Sternen/ })).toHaveCount(0);
  await expect(page.getByText("Fehlversuche")).toBeVisible();
});
