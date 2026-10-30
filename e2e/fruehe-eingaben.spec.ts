import { expect, test, type Page } from "@playwright/test";

/**
 * Frühe Klicks und Eingaben gehen nicht verloren (HydrationGate): Bis React
 * die Seite übernommen hat, sind die Bedienelemente sichtbar gesperrt. Danach
 * kommt jede Eingabe an. Die Tests warten bewusst nicht auf die Hydration,
 * sondern klicken und tippen direkt; Playwright wartet wie ein Kind, bis der
 * Knopf nicht mehr grau ist.
 */

/**
 * Hält alle Skripte zurück, wie auf einem langsamen Gerät: Die Seite steht,
 * React fehlt noch. Gibt die Funktion zurück, die die Skripte freigibt.
 */
async function holdScripts(page: Page) {
  let release!: () => void;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/*", async (route) => {
    if (route.request().resourceType() === "script") await released;
    await route.fallback();
  });
  return release;
}

/** Öffnet die Seite ohne Skripte und gibt sie wieder frei. */
async function openSlowly(
  page: Page,
  path: string,
  locked: () => Promise<void>,
) {
  const release = await holdScripts(page);
  await page.goto(path, { waitUntil: "commit" });
  await locked();
  release();
}

test("Startpunkt: „Startpunkt suchen“ wirkt auch direkt nach dem Laden", async ({
  page,
}) => {
  const search = page.getByRole("button", { name: "Startpunkt suchen" }).nth(1);
  await openSlowly(page, "/lernen/startpunkt", async () => {
    await expect(search).toBeDisabled();
  });
  await search.click();
  await expect(page.getByText("Aufgabe 1")).toBeVisible();
});

test("Kopfrechnen: „Eigene Aufgaben“ öffnet sich auch direkt nach dem Laden", async ({
  page,
}) => {
  const own = page.getByRole("button", { name: "Eigene Aufgaben" });
  await openSlowly(page, "/frei/mathematics", async () => {
    await expect(own).toBeDisabled();
  });
  await own.click();
  const source = page.getByRole("textbox", { name: "Eine Aufgabe pro Zeile" });
  await source.fill("6 + 7");
  await expect(source).toHaveValue("6 + 7");
  await expect(page.getByText(/1 gültige Aufgabe/)).toBeVisible();
});

test("Laufdiktat allein: früh getippter Text bleibt und wird geübt", async ({
  page,
}) => {
  const source = page.getByRole("textbox", {
    name: /^Text – Sätze und Zeilen/,
  });
  await openSlowly(page, "/frei/german/laufdiktat", async () => {
    await expect(source).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Laufdiktat starten" }),
    ).toBeDisabled();
  });
  await source.fill("Mein eigener Satz.");
  // React setzt den Text nicht mehr auf den Beispieltext zurück.
  await expect(source).toHaveValue("Mein eigener Satz.");
  await page.getByRole("button", { name: "Laufdiktat starten" }).click();
  await expect(page.getByText("Mein eigener Satz.")).toBeVisible();
});

test("Tagestraining: die Dauer lässt sich direkt nach dem Laden wählen", async ({
  page,
}) => {
  const twenty = page.getByRole("button", { name: "20 Minuten" });
  await openSlowly(page, "/lernen/training", async () => {
    await expect(twenty).toBeDisabled();
  });
  await twenty.click();
  await expect(twenty).toHaveAttribute("aria-pressed", "true");
});
