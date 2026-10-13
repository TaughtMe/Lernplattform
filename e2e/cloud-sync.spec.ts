import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { createFakeWebDav } from "../src/integrations/cloud-sync/testing/fake-webdav";

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];
const PASSWORD = "pferd-batterie-klammer";
const DAV = "https://cloud.test/remote.php/dav/files/lea";

/** WebDAV-Nachbau für beide Browser-Kontexte, inklusive CORS-Vorabfrage. */
async function serveWebDav(
  contexts: readonly BrowserContext[],
  server = createFakeWebDav(),
) {
  const cors = (origin: string) => ({
    "access-control-allow-origin": origin,
    "access-control-allow-headers":
      "authorization, content-type, depth, if-match, if-none-match",
    "access-control-allow-methods":
      "GET, PUT, PROPFIND, MKCOL, DELETE, OPTIONS",
    "access-control-expose-headers": "etag",
  });
  for (const context of contexts) {
    await context.route("https://cloud.test/**", async (route) => {
      const request = route.request();
      const origin = request.headers()["origin"] ?? "*";
      if (request.method() === "OPTIONS") {
        await route.fulfill({ status: 204, headers: cors(origin) });
        return;
      }
      const response = await server.fetcher(request.url(), {
        method: request.method(),
        headers: request.headers(),
        ...(request.postData() ? { body: request.postData() as string } : {}),
      });
      await route.fulfill({
        status: response.status,
        headers: {
          ...cors(origin),
          ...Object.fromEntries(response.headers),
        },
        body: await response.text(),
      });
    });
  }
  return server;
}

async function device(browser: Browser, baseURL: string | undefined) {
  const context = await browser.newContext({
    locale: "de-DE",
    ...(baseURL ? { baseURL } : {}),
  });
  const page = await context.newPage();
  return { context, page };
}

const material = (title: string, updatedAt: string) => ({
  id: "m-diktat",
  revision: 1,
  title,
  source: "Der Hund läuft. Die Katze schläft.",
  promptLocale: "de",
  answerLocale: "de",
  kind: "text",
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt,
});

/** Schreibt Material direkt in die lokale Lehrerdatenbank dieses Geräts. */
async function putMaterial(page: Page, value: ReturnType<typeof material>) {
  await page.evaluate(async (entry) => {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("lernraum:teacher:v1");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      if (db.objectStoreNames.contains("contentPackages")) {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction("contentPackages", "readwrite");
          tx.objectStore("contentPackages").put(entry);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
        db.close();
        return;
      }
      db.close();
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error("Lehrerdatenbank nicht bereit");
  }, value);
}

async function openSettings(page: Page) {
  await page.goto("/lehrer/einstellungen?vorschau=an");
  await expect(
    page.getByRole("heading", { name: "Geräte abgleichen" }),
  ).toBeVisible();
}

async function setUp(
  page: Page,
  name: string,
  options: { createPassword?: string; enterPassword?: string },
) {
  await openSettings(page);
  const section = page.locator("#cloud-abgleich");
  await section.getByRole("button", { name: "Weiter" }).click();
  await section.getByLabel("Server-Adresse").fill(DAV);
  await section.getByLabel("Benutzername").fill("lea");
  await section.getByLabel("App-Passwort").fill("app-passwort");
  await section.getByRole("button", { name: "Verbindung testen" }).click();
  await expect(section.getByRole("heading", { name: "Umfang" })).toBeVisible();
  await section.getByRole("button", { name: "Weiter" }).click();
  if (options.createPassword) {
    await section.getByLabel("Neues Passwort").fill(options.createPassword);
    await section
      .getByLabel("Passwort wiederholen")
      .fill(options.createPassword);
    await section.getByRole("button", { name: "Passwort festlegen" }).click();
  } else if (options.enterPassword) {
    await section
      .getByLabel("Passwort", { exact: true })
      .fill(options.enterPassword);
    await section.getByRole("button", { name: "Passwort prüfen" }).click();
  }
  await section.getByLabel("Name dieses Geräts").fill(name);
  await section.getByRole("checkbox", { name: /Ich weiß/ }).check();
  await section.getByRole("button", { name: "Abgleich starten" }).click();
  await expect(
    page.getByRole("button", { name: /^Cloud-Abgleich: Abgeglichen/ }).first(),
  ).toBeVisible({ timeout: 20_000 });
}

async function syncNow(page: Page) {
  await page
    .getByRole("button", { name: /^Cloud-Abgleich/ })
    .first()
    .click();
  const dialog = page.getByRole("dialog", { name: "Cloud-Abgleich" });
  await dialog.getByRole("button", { name: "Jetzt abgleichen" }).click();
  await dialog.getByRole("button", { name: "Schließen" }).click();
}

test("zwei Geräte gleichen Material über WebDAV ab, verschlüsselt, mit Konflikt", async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(180_000);
  const laptop = await device(browser, baseURL);
  const tafel = await device(browser, baseURL);
  await serveWebDav([laptop.context, tafel.context]);

  // Laptop zu Hause: einrichten, Material anlegen, abgleichen.
  await setUp(laptop.page, "Laptop", { createPassword: PASSWORD });
  await putMaterial(
    laptop.page,
    material("Diktat vom Laptop", "2026-10-05T08:00:00.000Z"),
  );
  await laptop.page.goto("/lehrer?vorschau=an");
  await syncNow(laptop.page);

  // Tafel: findet die verschlüsselte Datei, fragt nach dem Passwort.
  await setUp(tafel.page, "Tafel 2b", { enterPassword: PASSWORD });
  await tafel.page.goto("/lehrer?vorschau=an");
  await expect(
    tafel.page
      .getByRole("button", { name: "Diktat vom Laptop bearbeiten" })
      .first(),
  ).toBeVisible({
    timeout: 20_000,
  });

  // Cloud-Datei liegt verschlüsselt im Speicher.
  const header = await laptop.page.evaluate(async (url) => {
    const response = await fetch(`${url}/Lernraum/lernraum-lehrkraft-v2.json`, {
      headers: { Authorization: "Basic bGVhOmFwcC1wYXNzd29ydA==" },
    });
    return response.text();
  }, DAV);
  expect(header).not.toContain("Diktat vom Laptop");
  expect(header).toContain('"encryption"');

  // Beide ändern dasselbe Material: Konflikt auf dem Gerät mit der älteren Fassung.
  // Die Tafel ist dabei offline. Sonst holt ihr automatischer Takt die
  // Laptop-Fassung manchmal vor ihrer eigenen Änderung, und es entsteht zu
  // Recht kein Konflikt.
  await tafel.context.setOffline(true);
  await putMaterial(
    laptop.page,
    material("Diktat Laptop 2", "2026-10-05T09:00:00.000Z"),
  );
  await putMaterial(
    tafel.page,
    material("Diktat Tafel 2", "2026-10-05T09:00:05.000Z"),
  );
  await syncNow(laptop.page);
  await tafel.context.setOffline(false);
  await syncNow(tafel.page);
  const badge = tafel.page.getByRole("button", {
    name: /Cloud-Abgleich: \d Konflikte? zu prüfen/,
  });
  await expect(badge).toBeVisible({ timeout: 20_000 });

  await badge.click();
  const menu = tafel.page.getByRole("dialog", { name: "Cloud-Abgleich" });
  await menu.getByRole("button", { name: /Konflikt/ }).click();
  const dialog = tafel.page.getByRole("dialog", {
    name: "Konflikte beim Abgleich",
  });
  await expect(
    dialog.getByRole("heading", { name: "Gilt vorläufig" }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("heading", { name: "Andere Fassung" }),
  ).toBeVisible();
  const axe = await new AxeBuilder({ page: tafel.page })
    .include("dialog[open]")
    .withTags(AXE_TAGS)
    .analyze();
  expect(axe.violations).toEqual([]);
  await dialog.getByRole("button", { name: "Andere behalten" }).click();
  await expect(dialog.getByText("Keine offenen Konflikte.")).toBeVisible();
  await dialog.getByRole("button", { name: "Schließen" }).click();

  // Die Entscheidung geht an den Laptop; dort bleibt es still.
  await syncNow(tafel.page);
  await syncNow(laptop.page);
  await laptop.page.goto("/lehrer?vorschau=an");
  await expect(
    laptop.page
      .getByRole("button", { name: "Diktat Laptop 2 bearbeiten" })
      .first(),
  ).toBeVisible();
  await expect(
    laptop.page.getByRole("button", { name: /Konflikt/ }),
  ).toHaveCount(0);

  await laptop.context.close();
  await tafel.context.close();
});

test("ein falsches Passwort lässt die Einrichtung stehen", async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(120_000);
  const home = await device(browser, baseURL);
  const guest = await device(browser, baseURL);
  await serveWebDav([home.context, guest.context]);
  await setUp(home.page, "Laptop", { createPassword: PASSWORD });

  await openSettings(guest.page);
  const section = guest.page.locator("#cloud-abgleich");
  await section.getByRole("button", { name: "Weiter" }).click();
  await section.getByLabel("Server-Adresse").fill(DAV);
  await section.getByLabel("Benutzername").fill("lea");
  await section.getByLabel("App-Passwort").fill("app-passwort");
  await section.getByRole("button", { name: "Verbindung testen" }).click();
  await section.getByRole("button", { name: "Weiter" }).click();
  await section
    .getByLabel("Passwort", { exact: true })
    .fill("falsches-passwort-1");
  await section.getByRole("button", { name: "Passwort prüfen" }).click();
  await expect(section.getByRole("alert")).toContainText("passt nicht");
  await expect(section.getByLabel("Passwort", { exact: true })).toBeVisible();
  const axe = await new AxeBuilder({ page: guest.page })
    .include("#cloud-abgleich")
    .withTags(AXE_TAGS)
    .analyze();
  expect(axe.violations).toEqual([]);
  await home.context.close();
  await guest.context.close();
});

test("das Cloud-Symbol und der Katalog sind barrierefrei", async ({ page }) => {
  await page.goto("/entwicklung/ui");
  const states = page.getByTestId("cloud-states");
  await expect(states).toBeVisible();
  await expect(states.getByRole("button")).toHaveCount(8);
  const axe = await new AxeBuilder({ page })
    .include('[data-testid="cloud-states"]')
    .withTags(AXE_TAGS)
    .analyze();
  expect(axe.violations).toEqual([]);
});
