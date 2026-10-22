import { expect, type Page } from "@playwright/test";

/** Wartezustand: Hinweis zum Halten ist da, die Spielfläche bereit. */
async function waiting(page: Page) {
  await expect(page.getByRole("heading", { name: /zu sehen\./ })).toBeVisible();
}

/** Wort aufdecken wie am Computer: A und L gleichzeitig gedrückt halten. */
export async function revealByHold(page: Page) {
  await waiting(page);
  await page.keyboard.down("a");
  await page.keyboard.down("l");
}

/** Loslassen: Das Schreibfeld öffnet sich. */
export async function release(page: Page) {
  await page.keyboard.up("l");
  await page.keyboard.up("a");
}

/**
 * Aufdecken und loslassen, bis das Schreibfeld offen ist. Kommt der
 * Tastendruck, bevor die Seite auf Tasten hört, passiert sonst nichts.
 */
export async function revealAndRelease(page: Page) {
  await expect(async () => {
    await revealByHold(page);
    await release(page);
    await expect(
      page.getByRole("textbox", { name: "Deine Antwort" }),
    ).toBeVisible({ timeout: 1500 });
  }).toPass();
}
