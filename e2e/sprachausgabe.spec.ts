import { expect, test, type Page } from "./fixtures";
import { analyzeAccessibility } from "./accessibility-helpers";
import { hydrated } from "./hydration-helpers";
import { fakeSpeech, spokenUtterances } from "./speech-helpers";
import { createBox, startRound } from "./wortspeicher-helpers";

// Entscheidung 58, Befund B-012: Lernraum spricht nur mit Stimmen, die auf dem
// Gerät laufen. Fehlt eine, gibt es einen Hinweis statt einer stummen Taste.

async function chooseFromPlusMenu(page: Page, item: RegExp) {
  const entry = page.getByRole("menuitem", { name: item });
  await expect(async () => {
    if (!(await entry.isVisible())) {
      await page.getByRole("button", { name: "Vokabeln hinzufügen" }).click();
    }
    await expect(entry).toBeVisible({ timeout: 1_000 });
  }).toPass();
  await entry.click();
}

const NO_GERMAN = "Auf diesem Gerät ist keine deutsche Stimme installiert.";

async function startSpelling(page: Page) {
  await page.goto("/lernen/startpunkt");
  await (
    await hydrated(
      page.getByRole("button", { name: "Startpunkt suchen" }).first(),
    )
  ).click();
  await expect(page.getByText("Aufgabe 1", { exact: true })).toBeVisible({
    timeout: 6_000,
  });
}

test("Startpunkt: mit lokaler Stimme wird das Wort mit ihr gesprochen", async ({
  page,
}) => {
  await fakeSpeech(page, "local");
  await startSpelling(page);
  await page.getByRole("button", { name: "Anhören" }).click();
  await expect
    .poll(async () => (await spokenUtterances(page)).length)
    .toBeGreaterThan(0);
  const [first] = await spokenUtterances(page);
  expect(first?.voice).toBe("local");
  await expect(page.getByText(NO_GERMAN)).toHaveCount(0);
  expect((await analyzeAccessibility(page)).violations).toEqual([]);
});

test("Startpunkt: mit nur einer Netzstimme kein Anhören, aber ein Hinweis", async ({
  page,
}) => {
  await fakeSpeech(page, "network");
  await startSpelling(page);
  await expect(
    page.getByText(`${NO_GERMAN} Darum fehlen Buchstaben.`),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Anhören" })).toHaveCount(0);
  expect(await spokenUtterances(page)).toEqual([]);
  expect((await analyzeAccessibility(page)).violations).toEqual([]);
});

test("LernBox: Vorlesen ohne lokale Stimme zeigt einen Hinweis und nutzt keine Netzstimme", async ({
  page,
}) => {
  await fakeSpeech(page, "network");
  await page.goto("/lernbox");
  await chooseFromPlusMenu(page, /Selbst eintragen/);
  await page
    .getByRole("textbox", { name: "Name des neuen Stapels" })
    .fill("Hörprobe");
  await page.getByRole("button", { name: "Stapel anlegen" }).click();
  await page.getByRole("button", { name: "Schließen" }).click();
  await chooseFromPlusMenu(page, /Viele einfügen/);
  await page.getByRole("button", { name: "Einfügen oder Datei" }).click();
  await page
    .getByRole("textbox", { name: "Vokabeln zum Importieren" })
    .fill("Haus;house\nBaum;tree");
  await page.getByRole("button", { name: "Vorschau ansehen" }).click();
  await page.getByRole("button", { name: "Übernehmen" }).click();
  await page.getByRole("button", { name: "Schließen" }).click();
  await page.getByRole("button", { name: /Hörprobe/ }).click();
  const sheet = page.getByRole("dialog", { name: "Hörprobe" });
  await sheet.getByRole("button", { name: "Mündlich" }).click();
  await sheet.getByRole("button", { name: "Los geht's" }).click();

  await page.getByRole("button", { name: "Vorlesen", exact: true }).click();
  const notice = page.getByRole("status").filter({ hasText: /Stimme/ });
  await expect(notice).toHaveText(/keine (deutsche|englische) Stimme/);
  expect(await spokenUtterances(page)).toEqual([]);
  expect((await analyzeAccessibility(page)).violations).toEqual([]);
  await notice.getByRole("button", { name: "OK" }).click();
  await expect(notice).toHaveCount(0);
});

test("Wortspeicher: „Aufgabe vorlesen“ liest nur die Anleitung, nie das Wort", async ({
  page,
}) => {
  await fakeSpeech(page, "local");
  await createBox(page, "Lesebox", ["Fahrrad"]);
  await startRound(page, "Lesebox", 3);
  const button = page.getByRole("button", { name: "Aufgabe vorlesen" });
  await (await hydrated(button)).click();
  await expect
    .poll(async () => (await spokenUtterances(page)).length)
    .toBeGreaterThan(0);
  const spoken = (await spokenUtterances(page)).map((entry) => entry.text);
  expect(spoken).toEqual(["Fülle die Lücken und schreibe das ganze Wort."]);
  expect(spoken.join(" ")).not.toMatch(/fahrrad/i);
  expect((await analyzeAccessibility(page)).violations).toEqual([]);
});

test("Kopfrechnen: „Aufgabe vorlesen“ liest die Aufgabe ohne Ergebnis", async ({
  page,
}) => {
  await fakeSpeech(page, "local");
  await page.goto("/frei/mathematics");
  await (
    await hydrated(page.getByRole("button", { name: "Eigene Aufgaben" }))
  ).click();
  await page
    .getByRole("textbox", { name: "Eine Aufgabe pro Zeile" })
    .fill("7 * 8");
  await page.getByRole("button", { name: "Runde starten" }).click();
  await page.getByRole("button", { name: "Aufgabe vorlesen" }).click();
  await expect
    .poll(async () => (await spokenUtterances(page)).map((e) => e.text))
    .toEqual(["7 mal 8"]);
  expect((await analyzeAccessibility(page)).violations).toEqual([]);
});
