import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const CLASS_A = "123e4567-e89b-42d3-a456-426614174001";
const CLASS_B = "123e4567-e89b-42d3-a456-426614174002";
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];

const isMobile = (page: Page) => (page.viewportSize()?.width ?? 0) < 900;

const course = (id: string, name: string, n: number) => ({
  id,
  name,
  teacherName: "Frau Test",
  schoolYear: "2026/27",
  enabledModules: ["vocabulary"],
  createdAt: `2026-08-25T10:0${n}:00.000Z`,
  updatedAt: "2026-08-25T10:00:00.000Z",
});
const content = (
  id: string,
  title: string,
  extra: Record<string, unknown> = {},
) => ({
  id,
  revision: 1,
  title,
  source: "go;gehen",
  promptLocale: "en",
  answerLocale: "de",
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-02T10:00:00.000Z",
  ...extra,
});

/** Legt Klassen und Inhalte direkt in der lokalen Lehrerdatenbank an. */
async function seed(page: Page) {
  // Die App legt die Datenbank beim ersten Öffnen an.
  await page.goto("/lehrer");
  await expect(
    page.getByRole("heading", { name: "Inhalte" }).first(),
  ).toBeVisible();
  await page.waitForFunction(async () =>
    (await indexedDB.databases()).some(
      (entry) => entry.name === "lernraum:teacher:v1",
    ),
  );
  await page.evaluate(
    async ({ classes, packages }) => {
      // Warten, bis die App ihre Tabellen angelegt hat.
      for (let attempt = 0; attempt < 50; attempt += 1) {
        const probe = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open("lernraum:teacher:v1");
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        const ready = probe.objectStoreNames.contains("contentPackages");
        probe.close();
        if (ready) break;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("lernraum:teacher:v1");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(["classes", "contentPackages"], "readwrite");
        for (const entry of classes) tx.objectStore("classes").put(entry);
        for (const entry of packages)
          tx.objectStore("contentPackages").put(entry);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    },
    {
      classes: [
        course(CLASS_A, "Klasse 7b", 1),
        course(CLASS_B, "Klasse 9a", 2),
      ],
      packages: [
        content("p-alt", "Altes Vokabelpaket"),
        content("p-7b", "Text für 7b", {
          kind: "text",
          classIds: [CLASS_A],
          source: "Der Hund läuft. Die Katze schläft.",
        }),
        content("p-9a", "Mathe für 9a", {
          kind: "math",
          classIds: [CLASS_B],
          source: "1+1\n2+2",
        }),
      ],
    },
  );
  await page.reload();
}

test("die Ablage zeigt nur die Inhalte der gewählten Klasse", async ({
  page,
}) => {
  test.skip(!isMobile(page), "mobiler Ablauf");
  await seed(page);

  const drawer = page.getByRole("dialog", { name: "Klassen und Bereiche" });
  // Klicks vor dem Laden der Seite gehen verloren; bis zur Schublade wiederholen.
  await expect(async () => {
    await page.getByRole("button", { name: "Klassen und Bereiche" }).click();
    await expect(drawer).toBeVisible({ timeout: 1000 });
  }).toPass();
  await drawer.getByRole("link", { name: /Klasse 9a/ }).click();

  await expect(page).toHaveURL(new RegExp(`klasse=${CLASS_B}`));
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("header").getByText("Klasse 9a")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Mathe für 9a bearbeiten" }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Text für 7b bearbeiten" }),
  ).toHaveCount(0);
  await expect(page.getByText("1 Inhalt").first()).toBeVisible();
});

test("ein nicht zugeordneter Inhalt wandert in die gewählte Klasse", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/lehrer?klasse=ohne");

  const assign = page.getByRole("button", {
    name: "Altes Vokabelpaket zuordnen",
  });
  await expect(assign)
    .toBeVisible({ timeout: 15_000 })
    .catch(() => undefined);
  if (isMobile(page)) {
    // Mobil gibt es „Zuordnen“ nur im Start-Overlay (Scheibe 8.5).
    test.skip(true, "Zuordnen am Handy folgt mit dem Start-Overlay");
  }
  await assign.click();
  const dialog = page.getByRole("dialog", { name: "Klassen zuordnen" });
  await dialog.getByRole("checkbox", { name: /Klasse 7b/ }).check();
  await dialog.getByRole("button", { name: "Speichern" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Altes Vokabelpaket zuordnen" }),
  ).toHaveCount(0);

  await page.goto(`/lehrer?klasse=${CLASS_A}`);
  await expect(
    page.getByRole("button", { name: "Altes Vokabelpaket bearbeiten" }).first(),
  ).toBeVisible();
});

test("Text anlegen, speichern, wiederfinden und per Bearbeiten umbenennen", async ({
  page,
}) => {
  await seed(page);
  await page.goto(`/lehrer?klasse=${CLASS_A}`);

  await expect(async () => {
    await page.getByRole("button", { name: /^Text/ }).first().click();
    if (isMobile(page))
      await page.getByRole("button", { name: "Weiter" }).click();
    await expect(page).toHaveURL(/\/lehrer\/live/, { timeout: 1500 });
  }).toPass();
  await expect(
    page.getByRole("heading", { name: "Wortliste vorbereiten" }),
  ).toBeVisible();
  // Die Adresse ist nach dem Lesen aufgeräumt.
  await expect(page).toHaveURL(/\/lehrer\/live$/);

  await page
    .getByRole("textbox", { name: "Text" })
    .fill("Am Morgen scheint die Sonne.");
  await page.getByRole("textbox", { name: "Titel" }).fill("Sonne am Morgen");
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(
    page.getByText("„Sonne am Morgen“ ist gespeichert."),
  ).toBeVisible();

  await page.getByRole("button", { name: "Zurück zu Inhalte" }).click();
  await expect(page).toHaveURL(/\/lehrer$/);
  await page.goto(`/lehrer?klasse=${CLASS_A}`);
  await expect(
    page.getByRole("button", { name: "Sonne am Morgen bearbeiten" }).first(),
  ).toBeVisible();

  // Ein Klick auf die Zeile öffnet die Bearbeitungsansicht.
  await page
    .getByRole("button", { name: "Sonne am Morgen bearbeiten" })
    .first()
    .click();
  await expect(page).toHaveURL(/\/lehrer\/live$/);
  await expect(page.getByRole("textbox", { name: "Titel" })).toHaveValue(
    "Sonne am Morgen",
  );
  await expect(page.getByRole("textbox", { name: "Text" })).toHaveValue(
    "Am Morgen scheint die Sonne.",
  );
  await page.getByRole("textbox", { name: "Titel" }).fill("Morgensonne");
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText("„Morgensonne“ ist gespeichert.")).toBeVisible();
  await page.getByRole("button", { name: "Zurück zu Inhalte" }).click();
  await page.goto(`/lehrer?klasse=${CLASS_A}`);
  await expect(
    page.getByRole("button", { name: "Morgensonne bearbeiten" }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sonne am Morgen bearbeiten" }),
  ).toHaveCount(0);
});

/**
 * Bedienelemente unter 44 × 44 px. Der Seitenfuß (Impressum, Datenschutz,
 * Version) gehört zur gemeinsamen Hülle und ist hier ausgenommen; Häkchen
 * zählen über ihre Zeile (Beschriftung).
 */
async function smallTargets(page: Page) {
  return page.evaluate(() => {
    const seen: string[] = [];
    const candidates = document.querySelectorAll<HTMLElement>(
      "button, a[href], select, input:not([type=checkbox]), label",
    );
    for (const element of candidates) {
      if (element.closest("footer")) continue;
      if (
        element.tagName === "LABEL" &&
        !element.querySelector("input[type=checkbox]")
      )
        continue;
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      if (style.visibility === "hidden" || box.width === 0 || box.height === 0)
        continue;
      // Verdeckt durch ein modales Fenster darunter? Dann zählt nur das Fenster.
      const modal = document.querySelector("dialog[open]");
      if (modal && !modal.contains(element)) continue;
      if (box.width < 44 || box.height < 44) {
        const name =
          element.getAttribute("aria-label") ??
          element.textContent?.trim().slice(0, 30) ??
          element.tagName;
        seen.push(
          `${name} (${Math.round(box.width)}×${Math.round(box.height)})`,
        );
      }
    }
    return seen;
  });
}

async function openSheet(page: Page) {
  const sheet = page.getByRole("dialog", { name: "Raum öffnen" });
  await expect(async () => {
    await page
      .getByRole("button", { name: "Text für 7b starten" })
      .last()
      .click();
    await expect(sheet).toBeVisible({ timeout: 1500 });
  }).toPass();
  return sheet;
}

for (const theme of ["light", "dark"] as const) {
  test.describe(`Barrierefreiheit der Seite Inhalte (${theme})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(
        (value) => localStorage.setItem("theme-preference", value),
        theme,
      );
      await seed(page);
      await page.goto(`/lehrer?klasse=${CLASS_A}`);
      await expect(
        page.getByRole("button", { name: "Text für 7b starten" }).first(),
      ).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    });

    const scan = async (page: Page) =>
      (
        await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()
      ).violations.map(({ id, nodes }) => [id, nodes.length]);

    test("Ablage", async ({ page }) => {
      expect(await scan(page)).toEqual([]);
      if (isMobile(page)) expect(await smallTargets(page)).toEqual([]);
    });

    test("offene Schublade", async ({ page }) => {
      test.skip(!isMobile(page), "Schublade nur mobil");
      const drawer = page.getByRole("dialog", { name: "Klassen und Bereiche" });
      await expect(async () => {
        await page
          .getByRole("button", { name: "Klassen und Bereiche" })
          .click();
        await expect(drawer).toBeVisible({ timeout: 1000 });
      }).toPass();
      expect(await scan(page)).toEqual([]);
      expect(await smallTargets(page)).toEqual([]);
      await page.keyboard.press("Escape");
      await expect(drawer).toHaveCount(0);
    });

    test("offenes Startfenster", async ({ page }) => {
      const sheet = await openSheet(page);
      await expect(sheet.getByText("Raum für Klasse 7b")).toBeVisible();
      expect(await scan(page)).toEqual([]);
      if (isMobile(page)) expect(await smallTargets(page)).toEqual([]);
      await page.keyboard.press("Escape");
      await expect(sheet).toHaveCount(0);
    });

    test("offener Zuordnen-Dialog", async ({ page }) => {
      const sheet = await openSheet(page);
      await sheet.getByRole("button", { name: /ändern/ }).click();
      const dialog = page.getByRole("dialog", { name: "Klassen zuordnen" });
      await expect(dialog).toBeVisible();
      expect(await scan(page)).toEqual([]);
      if (isMobile(page)) expect(await smallTargets(page)).toEqual([]);
    });
  });
}
