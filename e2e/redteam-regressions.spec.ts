import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { analyzeAccessibility } from "./accessibility-helpers";
import { createBox } from "./wortspeicher-helpers";

async function startBlock(page: Page, title: string, words: string[]) {
  await createBox(page, title, words);
  await page.getByRole("button", { name: new RegExp(`^${title}`) }).click();
  const sheet = page.getByRole("dialog", { name: title });
  await sheet.getByRole("button", { name: /^Stufe 5:/ }).click();
  await sheet.getByLabel("Wörter in dieser Runde").selectOption("all");
  await sheet.getByLabel("Wörter pro Merkblock").selectOption("3");
  await sheet.getByRole("button", { name: "Starten" }).click();
  await page.getByRole("button", { name: "Wörter verdecken" }).click();
}

test("richtige Wortblöcke mit Leerzeichen bleiben fachlich richtig", async ({
  page,
}) => {
  await startBlock(page, "Leerraumprobe", ["Hund", "Katze", "Maus"]);
  await page.getByLabel("Deine Lösung").fill("Hund Katze Maus");
  await page.getByLabel("Deine Lösung").press("Enter");
  await expect(page.getByRole("heading", { name: "Geschafft!" })).toBeVisible();
  await expect(
    page.getByText("3 von 3 Wörtern dieser Runde auf Anhieb richtig"),
  ).toBeVisible();
  expect((await analyzeAccessibility(page)).violations).toEqual([]);
});

test("mehrdeutige Worttrennung verbraucht keinen ersten Versuch", async ({
  page,
}) => {
  await startBlock(page, "Begriffsprobe", ["Guten Morgen", "Haus", "Baum"]);
  await page.getByLabel("Deine Lösung").fill("Guten Morgen Haus Baum");
  await page.getByLabel("Deine Lösung").press("Enter");
  await expect(page.getByLabel("Deine Lösung")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Noch nicht sicher" }),
  ).toHaveCount(0);
  await page.getByLabel("Deine Lösung").fill("Guten Morgen\nHaus\nBaum");
  await page.getByLabel("Deine Lösung").press("Enter");
  await expect(page.getByRole("heading", { name: "Geschafft!" })).toBeVisible();
  await expect(
    page.getByText("3 von 3 Wörtern dieser Runde auf Anhieb richtig"),
  ).toBeVisible();
});

test("Sicherung rettet unlesbare Originale auch über ein leeres Profil", async ({
  page,
  browser,
}) => {
  await createBox(page, "Erhaltungsprobe", ["Haus"]);
  const raw = {
    id: "future-event",
    source: "future-module",
    futurePayload: { answer: "original" },
  };
  await page.evaluate(async (record) => {
    const request = indexedDB.open("lernraum:personal:v1");
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("learningEvents", "readwrite");
      transaction.objectStore("learningEvents").put(record);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  }, raw);
  await page.goto("/lernen/einstellungen");
  const downloadPending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Lernstand sichern" }).click();
  const download = await downloadPending;
  const path = await download.path();
  expect(path).not.toBeNull();
  const backup = JSON.parse(await readFile(path!, "utf8"));
  expect(backup.recovery).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ table: "learningEvents", raw }),
    ]),
  );
  expect(backup.data.learningEvents).toEqual([]);
  expect(backup.data.wordBoxes).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ title: "Erhaltungsprobe" }),
    ]),
  );
  expect((await analyzeAccessibility(page)).violations).toEqual([]);

  const fresh = await browser.newContext({
    baseURL: new URL(page.url()).origin,
    serviceWorkers: "block",
    locale: "de-DE",
  });
  try {
    const target = await fresh.newPage();
    await target.goto("/lernen/einstellungen");
    await expect(target.getByLabel("Sicherung laden")).toBeEnabled();
    await target.getByLabel("Sicherung laden").setInputFiles(path!);
    await expect(target.getByText(/Wiederhergestellt:/)).toBeVisible();
    const nextDownloadPending = target.waitForEvent("download");
    await target.getByRole("button", { name: "Lernstand sichern" }).click();
    const nextDownload = await nextDownloadPending;
    const nextBackup = JSON.parse(
      await readFile((await nextDownload.path())!, "utf8"),
    );
    expect(nextBackup.recovery).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ table: "learningEvents", raw }),
      ]),
    );
    expect(nextBackup.data.learningEvents).toEqual([]);
    expect(nextBackup.data.wordBoxes).toEqual(backup.data.wordBoxes);
  } finally {
    await fresh.close();
  }
});
