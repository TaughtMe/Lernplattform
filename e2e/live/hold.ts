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

export async function revealAndRelease(page: Page) {
  await revealByHold(page);
  await release(page);
}
