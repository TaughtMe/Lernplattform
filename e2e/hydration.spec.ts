import { expect, test, type Page } from "@playwright/test";

// Eingaben vor der Hydration (Welle 3): Auf einem langsamen Schul-iPad kommt
// das HTML lange vor dem JavaScript an. Dieser Test verzichtet bewusst auf
// `hydrated()` aus hydration-helpers.ts und bedient die Seite, solange die
// Skripte noch unterwegs sind. Erwartet wird: Bedienelemente sind erkennbar
// inaktiv, ein früher Tipp bewirkt nichts Halbes und getippter Text geht nicht
// verloren, weil das Feld ihn gar nicht erst annimmt.

const SCRIPT_DELAY_MS = 2500;

/**
 * Hält alle Skripte (Module, Chunks, dynamische Importe) zurück, bis `release`
 * aufgerufen wird. Das HTML kommt sofort. So bleibt die Seite beliebig lange
 * im Zustand „serverseitig gerendert, noch nicht hydriert“.
 */
async function holdScripts(page: Page) {
  let release!: () => void;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  // Notbremse, falls ein Test vergisst freizugeben.
  const timer = setTimeout(release, SCRIPT_DELAY_MS * 8);
  await page.route("**/*", async (route) => {
    if (route.request().resourceType() !== "script") {
      await route.continue();
      return;
    }
    await released;
    await route.continue().catch(() => {});
  });
  return () => {
    clearTimeout(timer);
    release();
  };
}

/** Öffnet die Seite, sobald das HTML da ist (nicht erst nach den Skripten). */
async function openUnhydrated(page: Page, path: string) {
  const release = await holdScripts(page);
  await page.goto(path, { waitUntil: "commit" });
  return release;
}

async function expectUnhydrated(page: Page) {
  await expect(page.locator("html")).not.toHaveAttribute("data-hydrated");
  await expect(page.locator("body")).toHaveAttribute("aria-busy", "true");
}

async function expectHydrated(page: Page) {
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "");
  await expect(page.locator("body")).not.toHaveAttribute("aria-busy");
}

/** Tippt mit der Maus auf die Mitte des Elements, ohne Playwrights Prüfungen. */
async function tapAt(page: Page, selector: ReturnType<Page["locator"]>) {
  const box = await selector.boundingBox();
  if (!box) throw new Error("Element ohne Fläche");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

test("Startpunkt: ein früher Tipp auf „Startpunkt suchen“ verpufft erkennbar und danach klappt es", async ({
  page,
}) => {
  const release = await openUnhydrated(page, "/lernen/startpunkt");
  const search = page
    .getByRole("button", { name: "Startpunkt suchen" })
    .first();
  await expect(search).toBeVisible();
  await expectUnhydrated(page);
  await expect(search).toHaveCSS("pointer-events", "none");

  await tapAt(page, search);
  // Nichts Halbes: Die Auswahl steht unverändert da.
  await expect(search).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveCount(0);

  release();
  await expectHydrated(page);
  await expect(search).toHaveCSS("pointer-events", "auto");
  await search.click();
  await expect(page.getByRole("textbox")).toBeVisible();
});

test("Kopfrechnen: „Eigene Aufgaben“ reagiert vor der Hydration nicht, danach schon", async ({
  page,
}) => {
  const release = await openUnhydrated(page, "/frei/mathematics");
  const own = page.getByRole("button", { name: "Eigene Aufgaben" });
  await expect(own).toBeVisible();
  await expectUnhydrated(page);
  await expect(own).toHaveCSS("pointer-events", "none");

  await tapAt(page, own);
  await expect(
    page.getByRole("textbox", { name: "Eine Aufgabe pro Zeile" }),
  ).toHaveCount(0);

  release();
  await expectHydrated(page);
  await own.click();
  const tasks = page.getByRole("textbox", { name: "Eine Aufgabe pro Zeile" });
  await tasks.fill("7 * 8");
  await expect(tasks).toHaveValue("7 * 8");
});

test("Laufdiktat allein: Text im Textfeld wird vor der Hydration nicht angenommen und nicht zurückgesetzt", async ({
  page,
}) => {
  const release = await openUnhydrated(page, "/frei/german/laufdiktat");
  const source = page.getByRole("textbox", {
    name: /Text – Sätze und Zeilen/,
  });
  await expect(source).toBeVisible();
  await expectUnhydrated(page);
  await expect(source).toHaveCSS("pointer-events", "none");
  const start = await source.inputValue();
  expect(start).not.toBe("");

  // Per Tastatur erreichbar, aber gesperrt: Tippen und Einfügen ändern nichts.
  await source.focus();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type("Haus.");
  await expect(source).toHaveValue(start);

  release();
  await expectHydrated(page);
  // Der Startwert bleibt; es ist nichts „verschwunden“, das ein Kind getippt hat.
  await expect(source).toHaveValue(start);
  await source.fill("Haus.");
  await expect(source).toHaveValue("Haus.");
});

test("Links bleiben vor der Hydration bedienbar", async ({ page }) => {
  const release = await openUnhydrated(page, "/lernen/startpunkt");
  await expect(
    page.getByRole("button", { name: "Startpunkt suchen" }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Profileinstellungen" }),
  ).toHaveCSS("pointer-events", "auto");
  release();
});
