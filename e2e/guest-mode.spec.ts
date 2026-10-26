import { expect, test, type Page } from "@playwright/test";
import {
  createEnrollmentCode,
  createEnrollmentLink,
} from "../src/domain/class-enrollment";
import { createClassSealKeyPair } from "../src/domain/class-seal";
import { createGuestPass, createGuestPassLink } from "../src/domain/guest-pass";
import { analyzeAccessibility } from "./accessibility-helpers";

// Gastmodus für geteilte Geräte (Befunde B-009, B-010): Ein Gast-QR der
// Lehrkraft macht das Gerät für eine Unterrichtsnutzung zum Gastgerät, dessen
// Schülerdaten am Ende gelöscht werden. Der Bereich `gastmodus` steht auf
// `vorschau`; die Tests schalten die Vorschau über das Cookie ein.

const ORIGIN = "http://localhost:3000";
const GUEST_KEY = "lernraum.gastmodus";
const LAST_BACKUP_KEY = "lernraum:personal:v1:last-backup";
const MINUTE = 60_000;
const classId = "123e4567-e89b-42d3-a456-426614174001";

async function enablePreview(page: Page) {
  await page
    .context()
    .addCookies([{ name: "lernraum-vorschau", value: "1", url: ORIGIN }]);
}

/** Gültiger Gast-Link, mit den echten Domainfunktionen und einem frischen Klassenstempel. */
async function guestLink(issuedMinutesAgo = 0) {
  const seal = await createClassSealKeyPair();
  const pass = await createGuestPass(
    seal,
    classId,
    new Date(Date.now() - issuedMinutesAgo * MINUTE),
  );
  const url = new URL(createGuestPassLink(ORIGIN, pass));
  return `${url.pathname}${url.hash}`;
}

/** Schreibt das Kind per Einschreibelink in eine Klasse ein: Lernstand auf dem Gerät. */
async function enrollChild(page: Page) {
  const now = "2026-08-30T10:00:00.000Z";
  const code = createEnrollmentCode(
    {
      id: "123e4567-e89b-42d3-a456-426614174011",
      name: "Klasse 7b",
      teacherName: "Frau Beispiel",
      schoolYear: "2026/27",
      enabledModules: ["vocabulary"],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "123e4567-e89b-42d3-a456-426614174012",
      classId: "123e4567-e89b-42d3-a456-426614174011",
      displayName: "Léa",
      enrollmentToken: "0123456789abcdef0123456789abcdef",
      createdAt: now,
    },
  );
  await page.goto(createEnrollmentLink(ORIGIN, code));
  await page.getByRole("button", { name: "Ja, ich bin Léa" }).click();
  await expect(page.getByRole("link", { name: /Klasse 7b/ })).toBeVisible();
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

const band = (page: Page) => page.getByRole("region", { name: "Gastmodus" });

test.beforeEach(async ({ page }) => {
  await enablePreview(page);
});

test("gültiger Gast-Link startet auf einem leeren Gerät den Gastmodus ohne Weg in den Lehrerbereich", async ({
  page,
}) => {
  await page.goto(await guestLink());

  await expect(page).toHaveURL(/\/lernen$/);
  await expect(band(page)).toBeVisible();
  await expect(
    band(page).getByRole("button", { name: "Gastmodus beenden" }),
  ).toBeVisible();
  expect(
    await page.evaluate((key) => localStorage.getItem(key), GUEST_KEY),
  ).toContain('"v":1');

  // Startseite: kein Link „Lehrerbereich“.
  await page.goto("/");
  await expect(page.getByRole("link", { name: /^Weiter als / })).toBeVisible();
  await expect(band(page)).toBeVisible();
  await expect(page.getByRole("link", { name: "Lehrerbereich" })).toHaveCount(
    0,
  );

  // Direkter Aufruf: Hinweis statt Lehrerdaten.
  await page.goto("/lehrer/klassen");
  await expect(
    page.getByRole("heading", { name: "Im Gastmodus nicht verfügbar" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "+ Neue Klasse" })).toHaveCount(
    0,
  );
  await expect(page.getByRole("link", { name: "Lehrerbereich" })).toHaveCount(
    0,
  );
});

test("ein Gerät mit Lernstand fragt nach; Abbrechen lässt alle Daten unverändert", async ({
  page,
}) => {
  await enrollChild(page);
  await page.goto(await guestLink());

  await expect(
    page.getByText(
      "Auf diesem Gerät ist schon ein Lernstand gespeichert. Im Gastmodus wird er am Ende gelöscht.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Erst Sicherung erstellen" }),
  ).toHaveAttribute("href", "/lernen/einstellungen#backup-title");
  await expect(
    page.getByRole("button", { name: "Gastmodus starten" }),
  ).toBeVisible();
  expect((await analyzeAccessibility(page)).violations).toEqual([]);

  await page.getByRole("link", { name: "Abbrechen" }).click();
  await expect(page).toHaveURL(/\/$/);
  expect(
    await page.evaluate((key) => localStorage.getItem(key), GUEST_KEY),
  ).toBeNull();
  await expect(band(page)).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Lehrerbereich" })).toBeVisible();

  await page.goto("/lernen/klasse");
  await expect(page.getByRole("link", { name: /Klasse 7b/ })).toBeVisible();
});

test("Gastmodus beenden löscht die Schülerdaten und lässt die Lehrerdaten stehen", async ({
  page,
}) => {
  await createTeacherClass(page, "Klasse 9c");
  await enrollChild(page);

  await page.goto(await guestLink());
  await page.getByRole("button", { name: "Gastmodus starten" }).click();
  await expect(page).toHaveURL(/\/lernen$/);
  await expect(band(page)).toBeVisible();
  await page.goto("/lernen/klasse");
  await expect(page.getByRole("link", { name: /Klasse 7b/ })).toBeVisible();

  await band(page).getByRole("button", { name: "Gastmodus beenden" }).click();
  const dialog = page.getByRole("dialog", { name: "Gastmodus beenden?" });
  await expect(dialog).toBeVisible();
  expect((await analyzeAccessibility(page)).violations).toEqual([]);

  // Abbrechen lässt alles stehen.
  await dialog.getByRole("button", { name: "Abbrechen" }).click();
  await expect(dialog).toBeHidden();
  await expect(band(page)).toBeVisible();

  await band(page).getByRole("button", { name: "Gastmodus beenden" }).click();
  await dialog.getByRole("button", { name: "Ja, alles löschen" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(band(page)).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Lehrerbereich" })).toBeVisible();
  expect(
    await page.evaluate((key) => localStorage.getItem(key), GUEST_KEY),
  ).toBeNull();

  // Schülerdaten sind weg ...
  await page.goto("/lernen/klasse");
  await expect(page.getByRole("link", { name: /Klasse 7b/ })).toHaveCount(0);
  const databases = await page.evaluate(async () =>
    (await indexedDB.databases()).map((entry) => entry.name),
  );
  expect(databases).toContain("lernraum:teacher:v1");

  // ... die Lehrerdaten nicht.
  await page.goto("/lehrer/klassen", { waitUntil: "networkidle" });
  await expect(
    page.getByRole("button", { name: "Klasse 9c, 2026/27" }),
  ).toBeVisible();
});

test("ein abgelaufener oder ungültiger Code zeigt eine Meldung und startet nichts", async ({
  page,
}) => {
  await page.goto(await guestLink(120));

  await expect(page.getByRole("alert")).toContainText(
    "Der Gast-Code ist abgelaufen.",
  );
  await expect(
    page.getByRole("link", { name: "Zur Startseite" }),
  ).toBeVisible();
  expect((await analyzeAccessibility(page)).violations).toEqual([]);
  expect(
    await page.evaluate((key) => localStorage.getItem(key), GUEST_KEY),
  ).toBeNull();
  await expect(band(page)).toHaveCount(0);

  // Veränderte Nutzdaten: Die Signatur passt nicht mehr.
  const valid = await guestLink();
  // Nur das Fragment ändert sich nicht als neue Seite; darum erst weg von /gast.
  await page.goto("/");
  await page.goto(valid.replace(/\.[0-9a-z]{8}\./, ".zzzzzzzz."));
  await expect(page.getByRole("alert")).toContainText("nicht gültig");
  expect(
    await page.evaluate((key) => localStorage.getItem(key), GUEST_KEY),
  ).toBeNull();

  await page.goto("/gast");
  await expect(page.getByText(/Hier fehlt der Gast-Code/)).toBeVisible();
});

test("ein Gastmodus nach mehr als 12 Stunden wird beim nächsten Start beendet und gelöscht", async ({
  page,
}) => {
  await page.goto(await guestLink());
  await expect(page).toHaveURL(/\/lernen$/);
  await expect(band(page)).toBeVisible();
  await page.goto("/lernen/einstellungen");
  await expect(band(page)).toBeVisible();

  await page.evaluate(
    ({ key, backupKey }) => {
      const state = JSON.parse(localStorage.getItem(key) ?? "{}");
      state.startedAt = new Date(Date.now() - 13 * 3_600_000).toISOString();
      localStorage.setItem(key, JSON.stringify(state));
      // Schülereintrag, den die App nach dem Neuladen nicht von selbst anlegt
      // (anders als das zufällige Profil eines ersten Besuchs).
      localStorage.setItem(backupKey, new Date().toISOString());
    },
    { key: GUEST_KEY, backupKey: LAST_BACKUP_KEY },
  );
  await page.reload();

  // Nach dem Löschen lädt die App neu; ein Lesen mitten im Neuladen zählt als
  // „noch nicht“ und wird wiederholt.
  const stored = (key: string) =>
    page
      .evaluate((name) => localStorage.getItem(name), key)
      .catch(() => "neu laden");
  await expect.poll(() => stored(GUEST_KEY)).toBeNull();
  await expect.poll(() => stored(LAST_BACKUP_KEY)).toBeNull();
  await page.waitForLoadState();
  await expect(band(page)).toHaveCount(0);
});

test("die Lehrkraft zeigt in der Klassenansicht den Gast-QR für 90 Minuten", async ({
  page,
}) => {
  await createTeacherClass(page, "Klasse 5a");
  await page.getByRole("button", { name: "Gast-QR (90 Minuten)" }).click();

  const qr = page.getByRole("img", { name: "Gast-QR-Code für Klasse 5a" });
  await expect(qr).toBeVisible();
  await expect(
    page.getByText(/Gilt bis \d\d:\d\d Uhr \(90 Minuten\)/),
  ).toBeVisible();
  expect((await analyzeAccessibility(page)).violations).toEqual([]);

  await page.getByRole("button", { name: "Ausblenden" }).click();
  await expect(qr).toHaveCount(0);
});
