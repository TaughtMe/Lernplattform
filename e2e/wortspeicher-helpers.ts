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

/**
 * Legt fällige Lernstände direkt im lokalen Speicher an („Trainingswörter heute“
 * hat dann Wörter). Die Seite muss einmal geladen sein, damit die Datenbank
 * existiert; danach neu laden.
 */
export async function seedDueWords(page: Page, words: string[]) {
  await page.evaluate(async (list) => {
    const request = indexedDB.open("lernraum:personal:v1");
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(
        "learningWordProgress",
        "readwrite",
      );
      for (const word of list) {
        transaction.objectStore("learningWordProgress").put({
          id: `learning-word:${word.toLowerCase()}`,
          word,
          stage: 1,
          box: 1,
          dueAt: "2026-01-01T00:00:00.000Z",
          attempts: 1,
          incorrectAttempts: 1,
          helpUses: 0,
          lastPracticedAt: "2026-01-01T00:00:00.000Z",
        });
      }
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  }, words);
}
