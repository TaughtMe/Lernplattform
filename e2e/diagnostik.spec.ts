import { expect, test, type Page } from "@playwright/test";
import { analyzeAccessibility } from "./accessibility-helpers";

// D2 (Welle 3): Startpunkt, Tagestraining und Kompetenzprofil. Die Seiten
// liegen unter `/lernen` (Freigabebereich `lernen`).

async function expectNoHorizontalScroll(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
}

async function answerWrong(page: Page, text = "9999") {
  await page.getByRole("textbox").fill(text);
  await page.getByRole("button", { name: "Weiter" }).click();
}

test("Startpunkt Kopfrechnen: zwei Fehler auf einer Stufe beenden ihn mit einem Vorschlag", async ({
  page,
}) => {
  await page.goto("/lernen/startpunkt");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Wir suchen deinen Startpunkt",
    }),
  ).toBeVisible();
  await expect(page.getByText(/kein Test/)).toBeVisible();
  expect((await analyzeAccessibility(page)).violations).toEqual([]);

  await page.getByRole("button", { name: "Startpunkt suchen" }).nth(1).click();
  await expect(page.getByText("Aufgabe 1", { exact: true })).toBeVisible();
  expect((await analyzeAccessibility(page)).violations).toEqual([]);

  await answerWrong(page);
  await expect(page.getByText("Aufgabe 2", { exact: true })).toBeVisible();
  await answerWrong(page);

  // Erste Stufe (Zahlenraum bis 10) zweimal falsch: Der Vorschlag setzt dort an.
  await expect(
    page.getByRole("heading", { name: "Plus und Minus bis 10" }),
  ).toBeVisible();
  // Keine Prozentzahl, kein Etikett.
  await expect(page.locator("#inhalt")).not.toContainText("%");
  await expect(
    page.getByRole("link", { name: "Kopfrechnen öffnen" }),
  ).toHaveAttribute("href", "/frei/mathematics");
  expect((await analyzeAccessibility(page)).violations).toEqual([]);
  await expectNoHorizontalScroll(page);

  // Jederzeit wiederholbar.
  await page.getByRole("button", { name: "Noch einmal suchen" }).click();
  await expect(
    page.getByRole("button", { name: "Startpunkt suchen" }),
  ).toHaveCount(2);
});

test("Startpunkt Rechtschreibung: schlägt die Wortbox der Stufe mit den Fehlern vor", async ({
  page,
}) => {
  await page.goto("/lernen/startpunkt");
  await page.getByRole("button", { name: "Startpunkt suchen" }).first().click();
  await expect(page.getByText("Aufgabe 1", { exact: true })).toBeVisible();
  expect((await analyzeAccessibility(page)).violations).toEqual([]);

  await answerWrong(page, "xx");
  await expect(page.getByText("Aufgabe 2", { exact: true })).toBeVisible();
  await answerWrong(page, "yy");

  await expect(
    page.getByRole("heading", { name: "Wortbox „Langes i“" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Wortbox öffnen" }),
  ).toHaveAttribute("href", "/frei/german/lernwoerter?sammlung=long-i");
  expect((await analyzeAccessibility(page)).violations).toEqual([]);
});

test("Fehler aus dem Startpunkt erscheinen im Profil und im Tagestraining", async ({
  page,
}) => {
  await page.goto("/lernen/startpunkt");
  await page.getByRole("button", { name: "Startpunkt suchen" }).nth(1).click();
  await answerWrong(page);
  await answerWrong(page);
  await expect(
    page.getByRole("heading", { name: "Plus und Minus bis 10" }),
  ).toBeVisible();

  // Kompetenzprofil: Die feste Wortbox ist neu, das Kopfrechnen ist begonnen.
  await page.goto("/lernen/profil");
  await expect(
    page.getByRole("heading", { level: 1, name: "Mein Lernstand" }),
  ).toBeVisible();
  const math = page.getByRole("region", { name: "Kopfrechnen" });
  await expect(math).toBeVisible();
  await expect(math.getByText("im Aufbau").first()).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Rechtschreibung" })
      .getByRole("link", { name: "Üben Doppelkonsonanten" }),
  ).toBeVisible();
  await expect(page.locator("#inhalt")).not.toContainText("%");
  expect((await analyzeAccessibility(page)).violations).toEqual([]);
  await expectNoHorizontalScroll(page);

  // Tagestraining: Die Fehler kommen zuerst.
  await page.goto("/lernen/training");
  await expect(
    page.getByRole("heading", { level: 1, name: "Dein Training" }),
  ).toBeVisible();
  const list = page.getByRole("list", { name: "Deine Aufgaben" });
  await expect(list.getByRole("listitem").first()).toContainText("Kopfrechnen");
  await expect(list.getByRole("listitem").first()).toContainText(
    "Nochmal üben",
  );
  await expect(
    list.getByRole("link", { name: /^Los, 1\. Kopfrechnen/ }),
  ).toHaveAttribute("href", "/frei/mathematics?heute=1");
  expect((await analyzeAccessibility(page)).violations).toEqual([]);
});

test("Tagestraining: Dauer wählen, starten, aktive Zeit läuft", async ({
  page,
}) => {
  // Ohne Lernstand ist nichts dran; erst ein Fehler gibt dem Training Inhalt.
  await page.goto("/lernen/startpunkt");
  await page.getByRole("button", { name: "Startpunkt suchen" }).nth(1).click();
  await answerWrong(page);
  await answerWrong(page);
  await expect(
    page.getByRole("heading", { name: "Plus und Minus bis 10" }),
  ).toBeVisible();

  await page.goto("/lernen/training");
  const ten = page.getByRole("button", { name: "10 Minuten" });
  const twenty = page.getByRole("button", { name: "20 Minuten" });
  await expect(ten).toHaveAttribute("aria-pressed", "true");
  await twenty.click();
  await expect(twenty).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "Training starten" }).click();
  await expect(page.getByText("von 20:00")).toBeVisible();
  await expect(
    page.getByRole("progressbar", { name: "Zeit im Training" }),
  ).toBeVisible();
  expect((await analyzeAccessibility(page)).violations).toEqual([]);
  await expectNoHorizontalScroll(page);
});

test("Kompetenzprofil und Training sind ohne Lernstand leer und erreichbar", async ({
  page,
}) => {
  await page.goto("/lernen/training");
  await expect(page.getByText("Heute ist noch nichts dran")).toBeVisible();
  expect((await analyzeAccessibility(page)).violations).toEqual([]);

  await page.goto("/lernen/profil");
  await expect(
    page.getByRole("region", { name: "Rechtschreibung" }),
  ).toBeVisible();
  await expect(
    page.getByText("Hier hast du noch nichts geübt.").first(),
  ).toBeVisible();
  expect((await analyzeAccessibility(page)).violations).toEqual([]);
});
