import { expect, test, type Page } from "./fixtures";
import { analyzeAccessibility } from "./accessibility-helpers";

// Lehrerbereich auf geteilten Geräten (Befund B-009): Gerätetyp beim ersten
// Öffnen, Tafelmodus „nur Material“ und PIN-Sperre. Der Bereich `lehrer-geraet`
// steht auf `vorschau`; die Tests schalten die Vorschau über das Cookie ein.

const ORIGIN = "http://localhost:3000";
const DEVICE_KEY = "lernraum.lehrer-geraet";
const LOCK_KEY = "lernraum.lehrer-sperre";
const PIN = "482913";
const BOARD = "Tafel / geteiltes Gerät (nur Material)";

// Diese Datei prüft die Auswahl selbst und beginnt ohne Gerätetyp.
test.use({ storageState: { cookies: [], origins: [] } });

test.beforeEach(async ({ page }) => {
  await page
    .context()
    .addCookies([{ name: "lernraum-vorschau", value: "1", url: ORIGIN }]);
});

/** Navigationslinks nach Adresse: mobil liegt die Leiste in einer Schublade. */
const navLink = (page: Page, href: string) =>
  page.locator(`nav a[href^="${href}"]`);

/** Wählt beim ersten Öffnen den Gerätetyp. */
async function chooseDevice(page: Page, name: string | RegExp) {
  await page.goto("/lehrer", { waitUntil: "networkidle" });
  await expect(
    page.getByRole("heading", { name: "Welches Gerät ist das?" }),
  ).toBeVisible();
  await page.getByRole("button", { name }).click();
  await expect(
    page.getByRole("heading", { name: "Welches Gerät ist das?" }),
  ).toHaveCount(0);
}

/** Legt über die Oberfläche eine Klasse in der Lehrerdatenbank an. */
async function createTeacherClass(page: Page, name: string) {
  await page.goto("/lehrer/klassen", { waitUntil: "networkidle" });
  const form = page.getByRole("form", { name: "Neue Klasse anlegen" });
  await form.getByLabel("Lehrkraft").fill("Frau Beispiel");
  await form.getByLabel("Klassenname").fill(name);
  await form.getByRole("button", { name: "Anlegen" }).click();
  await expect(page.getByText("Klasse wurde lokal angelegt.")).toBeVisible();
}

/** Zahl der Klassen in der Lehrerdatenbank dieses Browsers. */
async function classCount(page: Page) {
  return page.evaluate(
    () =>
      new Promise<number>((resolve, reject) => {
        const open = indexedDB.open("lernraum:teacher:v1");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          if (!db.objectStoreNames.contains("classes")) {
            db.close();
            resolve(0);
            return;
          }
          const count = db
            .transaction("classes", "readonly")
            .objectStore("classes")
            .count();
          count.onsuccess = () => {
            db.close();
            resolve(count.result);
          };
          count.onerror = () => reject(count.error);
        };
      }),
  );
}

test("der erste Besuch fragt nach dem Gerätetyp, danach nicht mehr", async ({
  page,
}) => {
  await page.goto("/lehrer", { waitUntil: "networkidle" });
  await expect(
    page.getByRole("heading", { name: "Welches Gerät ist das?" }),
  ).toBeVisible();
  expect((await analyzeAccessibility(page)).violations).toEqual([]);
  expect(
    await page.evaluate((key) => localStorage.getItem(key), DEVICE_KEY),
  ).toBeNull();

  await page.getByRole("button", { name: "Mein Gerät" }).click();
  await expect(
    page.getByRole("heading", { name: "Welches Gerät ist das?" }),
  ).toHaveCount(0);
  expect(
    await page.evaluate((key) => localStorage.getItem(key), DEVICE_KEY),
  ).toContain('"type":"own"');

  await page.reload({ waitUntil: "networkidle" });
  await expect(
    page.getByRole("heading", { name: "Welches Gerät ist das?" }),
  ).toHaveCount(0);
});

test("auf der Tafel sind Personenbereiche gesperrt und ausgeblendet", async ({
  page,
}) => {
  await chooseDevice(page, BOARD);

  await page.goto("/lehrer/klassen", { waitUntil: "networkidle" });
  await expect(
    page.getByRole("heading", { name: "Im Tafelmodus nicht verfügbar" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "+ Neue Klasse" })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("form", { name: "Neue Klasse anlegen" }),
  ).toHaveCount(0);
  expect((await analyzeAccessibility(page)).violations).toEqual([]);

  // Navigation: keine Klassen, keine Aufgaben; Material bleibt.
  await page.goto("/lehrer/material", { waitUntil: "networkidle" });
  await expect(navLink(page, "/lehrer/klassen")).toHaveCount(0);
  await expect(navLink(page, "/lehrer/aufgaben")).toHaveCount(0);
  await expect(navLink(page, "/lehrer/material").first()).toBeAttached();
  await expect(
    page.getByRole("heading", { name: "Im Tafelmodus nicht verfügbar" }),
  ).toHaveCount(0);

  // Aufgaben und Datenexport.
  await page.goto("/lehrer/aufgaben", { waitUntil: "networkidle" });
  await expect(
    page.getByRole("heading", { name: "Im Tafelmodus nicht verfügbar" }),
  ).toBeVisible();
  await page.goto("/lehrer/einstellungen", { waitUntil: "networkidle" });
  await expect(
    page.getByRole("button", { name: /Sicherung exportieren/ }),
  ).toHaveCount(0);
  expect((await analyzeAccessibility(page)).violations).toEqual([]);
});

test("der Wechsel auf die Tafel bietet an, Personendaten zu löschen", async ({
  page,
}) => {
  await chooseDevice(page, "Mein Gerät");
  await createTeacherClass(page, "Klasse 6c");
  expect(await classCount(page)).toBe(1);

  await page.goto("/lehrer/einstellungen", { waitUntil: "networkidle" });
  await page.getByRole("radio", { name: /Tafel/ }).check();
  const offer = page.getByRole("group", {
    name: "Personendaten von diesem Gerät löschen?",
  });
  await expect(offer).toBeVisible();
  await expect(offer).toContainText("1 Klasse");
  expect((await analyzeAccessibility(page)).violations).toEqual([]);

  await offer.getByRole("button", { name: "Personendaten löschen" }).click();
  await expect(offer).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText(
    "Die Personendaten wurden von diesem Gerät gelöscht.",
  );
  expect(await classCount(page)).toBe(0);
});

test("die PIN-Sperre greift nach dem Start und weist eine falsche PIN ab", async ({
  page,
}) => {
  await chooseDevice(page, "Mein Gerät");
  await createTeacherClass(page, "Klasse 6c");

  await page.goto("/lehrer/einstellungen", { waitUntil: "networkidle" });
  await expect(
    page.getByText(/Sichtschutz, keine Verschlüsselung/),
  ).toBeVisible();
  await page.getByLabel(/Neue PIN/).fill(PIN);
  await page.getByLabel("PIN wiederholen").fill(PIN);
  await page.getByRole("button", { name: "PIN festlegen" }).click();
  await expect(
    page.getByRole("button", { name: "Sperre ausschalten" }),
  ).toBeVisible();
  const stored = await page.evaluate(
    (key) => localStorage.getItem(key),
    LOCK_KEY,
  );
  expect(stored).not.toBeNull();
  expect(stored).not.toContain(PIN);

  // Neustart: Klassen sind gesperrt, das Material nicht.
  await page.goto("/lehrer/klassen", { waitUntil: "networkidle" });
  await expect(
    page.getByRole("heading", { name: "Lehrerbereich gesperrt" }),
  ).toBeVisible();
  await expect(
    page.getByRole("form", { name: "Neue Klasse anlegen" }),
  ).toHaveCount(0);
  await expect(page.getByText("Klasse 6c")).toHaveCount(0);
  expect((await analyzeAccessibility(page)).violations).toEqual([]);

  await page.getByLabel("PIN (6 Ziffern)").fill("111111");
  await page.getByRole("button", { name: "Entsperren" }).click();
  await expect(page.getByRole("alert")).toContainText("Die PIN stimmt nicht.");

  await page.getByLabel("PIN (6 Ziffern)").fill(PIN);
  await page.getByRole("button", { name: "Entsperren" }).click();
  // Mit einer vorhandenen Klasse steht das Formular „Neue Klasse anlegen“
  // erst nach „+ Neue Klasse“ im Bild; entsperrt zeigen sich Seite und Klasse.
  await expect(
    page.getByRole("heading", { level: 2, name: "Klasse 6c" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "+ Neue Klasse" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Lehrerbereich gesperrt" }),
  ).toHaveCount(0);

  await page.goto("/lehrer/material", { waitUntil: "networkidle" });
  await expect(
    page.getByRole("heading", { name: "Lehrerbereich gesperrt" }),
  ).toHaveCount(0);
});

test("fünf falsche PINs sperren die Eingabe für eine Minute, auch nach dem Neuladen", async ({
  page,
}) => {
  await chooseDevice(page, "Mein Gerät");
  await page.goto("/lehrer/einstellungen", { waitUntil: "networkidle" });
  await page.getByLabel(/Neue PIN/).fill(PIN);
  await page.getByLabel("PIN wiederholen").fill(PIN);
  await page.getByRole("button", { name: "PIN festlegen" }).click();
  await expect(
    page.getByRole("button", { name: "Sperre ausschalten" }),
  ).toBeVisible();

  // Die Uhr gehört dem Test: Die Minute vergeht erst mit `fastForward`.
  await page.clock.install({ time: new Date("2026-10-30T09:00:00Z") });
  await page.goto("/lehrer/klassen", { waitUntil: "networkidle" });
  const field = page.getByLabel("PIN (6 Ziffern)");
  for (let i = 0; i < 5; i += 1) {
    await field.fill("111111");
    await page.getByRole("button", { name: "Entsperren" }).click();
    if (i < 4) {
      await expect(page.getByRole("alert")).toContainText(
        "Die PIN stimmt nicht.",
      );
    }
  }
  await expect(page.getByRole("alert")).toContainText("Zu viele falsche PINs");
  await expect(page.getByText(/Wieder möglich in/)).toBeVisible();
  await expect(field).toBeDisabled();
  await expect(page.getByRole("button", { name: "Entsperren" })).toBeDisabled();
  expect((await analyzeAccessibility(page)).violations).toEqual([]);

  // Neuladen hebt die Wartezeit nicht auf; selbst die richtige PIN geht nicht.
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByLabel("PIN (6 Ziffern)")).toBeDisabled();
  await expect(page.getByText(/Wieder möglich in/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "PIN vergessen" }),
  ).toBeEnabled();

  // Nach einer Minute ist die Eingabe wieder frei; die richtige PIN öffnet.
  await page.clock.fastForward(61_000);
  await expect(page.getByLabel("PIN (6 Ziffern)")).toBeEnabled();
  await expect(page.getByText(/Zu viele falsche PINs/)).toHaveCount(0);
  await page.getByLabel("PIN (6 Ziffern)").fill(PIN);
  await page.getByRole("button", { name: "Entsperren" }).click();
  await expect(
    page.getByRole("heading", { name: "Lehrerbereich gesperrt" }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      localStorage.getItem("lernraum.lehrer-sperre-versuche"),
    ),
  ).toBeNull();
});

test("„PIN vergessen“ hebt die Sperre nach Bestätigung auf und löscht die Personendaten", async ({
  page,
}) => {
  await chooseDevice(page, "Mein Gerät");
  await createTeacherClass(page, "Klasse 6c");
  await page.goto("/lehrer/einstellungen", { waitUntil: "networkidle" });
  await page.getByLabel(/Neue PIN/).fill(PIN);
  await page.getByLabel("PIN wiederholen").fill(PIN);
  await page.getByRole("button", { name: "PIN festlegen" }).click();
  await expect(
    page.getByRole("button", { name: "Sperre ausschalten" }),
  ).toBeVisible();

  await page.goto("/lehrer/klassen", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "PIN vergessen" }).click();
  await expect(page.getByText(/Dabei werden die Personendaten/)).toBeVisible();
  expect((await analyzeAccessibility(page)).violations).toEqual([]);
  // Ohne Bestätigung bleibt alles, wie es ist.
  expect(await classCount(page)).toBe(1);

  await page
    .getByRole("button", {
      name: "Sperre aufheben und Personendaten löschen",
    })
    .click();
  await expect(
    page.getByRole("form", { name: "Neue Klasse anlegen" }),
  ).toBeVisible();
  expect(await classCount(page)).toBe(0);
  expect(
    await page.evaluate((key) => localStorage.getItem(key), LOCK_KEY),
  ).toBeNull();
});
