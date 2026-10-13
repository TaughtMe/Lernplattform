import { expect, type Page } from "@playwright/test";

/** Legt über die Oberfläche eine eigene Wortbox mit Wörtern an. */
export async function createBox(page: Page, title: string, words: string[]) {
  await page.goto("/frei/german/lernwoerter");
  await page.getByRole("button", { name: "Neue Wortbox" }).click();
  const dialog = page.getByRole("dialog", { name: "Neue Wortbox" });
  await dialog.getByLabel("Name der Wortbox").fill(title);
  await dialog.getByRole("button", { name: "Wortbox anlegen" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  const field = page.getByLabel(/Wort hinzufügen/);
  await field.fill(words.join(", "));
  await field.press("Enter");
  await expect(
    page
      .getByRole("list", { name: `Wörter in ${title}` })
      .getByRole("listitem"),
  ).toHaveCount(words.length);
  await page.getByRole("button", { name: "Zurück zur Übersicht" }).click();
  await expect(
    page.getByRole("heading", { name: "Wortspeicher" }),
  ).toBeVisible();
}

/** Öffnet das Startblatt einer Wortbox und startet die Runde mit allen Wörtern. */
export async function startRound(page: Page, title: string, stage: number) {
  await page.getByRole("button", { name: new RegExp(`^${title}`) }).click();
  const sheet = page.getByRole("dialog", { name: title });
  await sheet
    .getByRole("button", { name: new RegExp(`^Stufe ${stage}:`) })
    .click();
  await sheet.getByLabel("Wörter in dieser Runde").selectOption("all");
  await sheet.getByRole("button", { name: "Starten" }).click();
}
