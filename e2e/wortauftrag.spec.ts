import { expect, test, type Page } from "@playwright/test";
import { analyzeAccessibility } from "./accessibility-helpers";
import { extractPdfTextRuns } from "./pdf-text";

// D4 (Audit E-002): Die Lehrkraft erzeugt einen Wortauftrag, das Kind öffnet
// den Link und übernimmt die Wörter erst nach Bestätigung.

const scan = async (page: Page) =>
  (await analyzeAccessibility(page)).violations.map(({ id, nodes }) => [
    id,
    nodes.length,
  ]);

/** Füllt den n-ten Auftrag (ab 1) aus. */
async function fillOrder(page: Page, n: number, title: string, words: string) {
  const card = page.getByRole("region", { name: `Auftrag ${n}` });
  await card.getByLabel(/^Titel/).fill(title);
  await card.getByLabel("Wörter").fill(words);
  return card;
}

test("Auftrag erzeugen, Link öffnen und Wörter übernehmen", async ({
  page,
}) => {
  await page.goto("/lehrer/material/wortauftrag");
  await expect(
    page.getByRole("heading", { name: "Wortauftrag" }),
  ).toBeVisible();
  const card = await fillOrder(
    page,
    1,
    "Gruppe A",
    "Quarz, Straße\nBall; ball",
  );

  await expect(
    card.getByRole("list", { name: /^Erkannte Wörter/ }),
  ).toContainText("QuarzStraßeBall");
  await expect(card.getByText(/1 Eintrag wurde ausgelassen/)).toBeVisible();
  await expect(
    card.getByRole("img", { name: "QR-Code für Gruppe A" }),
  ).toBeVisible();
  expect(await scan(page)).toEqual([]);

  // Der Link trägt nur Wörter und Titel.
  const link = await card.getByLabel("Link").inputValue();
  const url = new URL(link);
  expect(url.pathname).toBe("/frei/german");
  expect([...url.searchParams.keys()]).toEqual(["woerter", "auftrag"]);

  // Auf dem Schülergerät: Blatt mit den Wörtern, nichts ist gespeichert.
  await page.goto(`${url.pathname}${url.search}`);
  const sheet = page.getByRole("dialog", { name: "Wörter aus dem Auftrag" });
  await expect(sheet).toBeVisible();
  await expect(
    sheet.getByRole("list", { name: "Wörter aus dem Auftrag" }),
  ).toContainText("QuarzStraßeBall");
  expect(await scan(page)).toEqual([]);

  await sheet
    .getByRole("button", { name: "In eine Wortbox speichern" })
    .click();
  await expect(sheet.getByLabel("Name der neuen Wortbox")).toHaveValue(
    "Gruppe A",
  );
  await sheet.getByRole("button", { name: "Speichern" }).click();
  await expect(
    sheet.getByText("Die Wörter liegen jetzt in der Wortbox ‚Gruppe A‘."),
  ).toBeVisible();

  // Die Wortbox steht jetzt in der Übersicht.
  await page.goto("/frei/german/lernwoerter");
  await expect(page.getByRole("button", { name: /^Gruppe A/ })).toBeVisible();
});

test("zu lange Listen werden vor dem Erzeugen gemeldet", async ({ page }) => {
  await page.goto("/lehrer/material/wortauftrag");
  const long = Array.from(
    { length: 50 },
    (_, i) => `${"w".repeat(28)}${String(i).padStart(2, "0")}`,
  ).join(", ");
  const card = await fillOrder(page, 1, "Gruppe A", long);
  await expect(card.getByRole("status")).toContainText("zwei Aufträge");
  await expect(card.getByRole("img")).toHaveCount(0);
});

test("der Kärtchen-Druck zeigt alle Aufträge über mehrere Seiten ohne Bedienelemente", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "page.pdf() gibt es nur in Chromium");
  await page.goto("/lehrer/material/wortauftrag");
  const titles = ["Gruppe A", "Gruppe B", "Gruppe C"];
  await fillOrder(page, 1, titles[0] ?? "", "Quarz, Ball");
  for (const [index, title] of titles.slice(1).entries()) {
    await page
      .getByRole("button", { name: "Weiteren Auftrag hinzufügen" })
      .click();
    await fillOrder(page, index + 2, title, "Haus, Maus, Laus");
  }

  await page.getByRole("button", { name: "Kärtchen drucken" }).click();
  await expect(
    page.getByRole("heading", { name: "Kärtchen drucken" }),
  ).toBeVisible();
  await page.getByLabel("Kärtchen je Auftrag").selectOption("6");
  await expect(page.getByRole("img", { name: /^QR-Code für/ })).toHaveCount(18);
  expect(await scan(page)).toEqual([]);

  const pdf = await page.pdf({ format: "A4" });
  const pages = extractPdfTextRuns(pdf);
  const printed = pages.flat();

  // Jede Karte kommt auf Papier, nicht nur die der ersten Seite.
  for (const title of titles) {
    expect(
      printed.filter((run) => run === title),
      `„${title}“ im PDF`,
    ).toHaveLength(6);
  }
  // Keine Schaltfläche, Kopfzeile oder Leiste im Ausdruck.
  expect(printed.join(" ")).not.toMatch(/Drucken oder als PDF|Zurück zu den/);
  for (const [index, runs] of pages.entries()) {
    expect(runs.length, `Seite ${index + 1}`).toBeGreaterThan(0);
  }
});
