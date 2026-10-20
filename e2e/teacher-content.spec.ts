import { expect, test, type Page } from "@playwright/test";
import { analyzeAccessibility } from "./accessibility-helpers";

const CLASS_A = "123e4567-e89b-42d3-a456-426614174001";
const CLASS_B = "123e4567-e89b-42d3-a456-426614174002";

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
async function seed(
  page: Page,
  extraPackages: ReadonlyArray<Record<string, unknown>> = [],
) {
  // Die App legt die Datenbank beim ersten Öffnen an.
  await page.goto("/lehrer");
  await expect(
    page.getByRole("heading", { name: "Neues Laufdiktat" }),
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
        ...extraPackages,
      ],
    },
  );
  await page.reload();
}

test("die Startseite zeigt nur die Laufdiktate der gewählten Klasse", async ({
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
    page.getByRole("button", { name: "Mathe für 9a bearbeiten" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Text für 7b bearbeiten" }),
  ).toHaveCount(0);
  await expect(page.getByRole("tab", { name: /Vorbereitet/ })).toContainText(
    "1",
  );
});

test("ein nicht zugeordnetes Laufdiktat kommt mit „+ Auch für 7b“ in die Klasse", async ({
  page,
}) => {
  await seed(page);
  await page.goto(`/lehrer?klasse=${CLASS_A}`);

  const add = page.getByRole("button", {
    name: "Altes Vokabelpaket auch für 7b",
  });
  await expect(async () => {
    await add.click({ timeout: 1500 });
    await expect(
      page.getByRole("button", { name: "Altes Vokabelpaket starten" }),
    ).toBeVisible({ timeout: 1500 });
  }).toPass();
  await expect(
    page.getByRole("button", {
      name: "Altes Vokabelpaket bei 7b, wieder abnehmen",
    }),
  ).toBeVisible();

  // Ein Eintrag, keine Kopie: In 9a geholt, gehört er beiden Klassen.
  await page.goto(`/lehrer?klasse=${CLASS_B}`);
  await page
    .getByRole("group", { name: "Quelle" })
    .getByRole("button", { name: /Klasse 7b/ })
    .click();
  await page
    .getByRole("button", { name: "Altes Vokabelpaket auch für 9a" })
    .click();
  await expect(
    page.getByRole("button", { name: "Altes Vokabelpaket starten" }),
  ).toBeVisible();
  await expect(
    page.getByRole("tabpanel").getByText("7b", { exact: true }).first(),
  ).toBeAttached();
});

test("Text anlegen, speichern, wiederfinden und per Bearbeiten umbenennen", async ({
  page,
}) => {
  await seed(page);
  await page.goto(`/lehrer?klasse=${CLASS_A}`);

  await expect(async () => {
    await page.getByRole("link", { name: /^Text/ }).click();
    await expect(page).toHaveURL(/\/lehrer\/live/, { timeout: 1500 });
  }).toPass();
  await expect(
    page.getByRole("heading", { name: "Inhalt eingeben" }),
  ).toBeVisible();
  // Die Adresse ist nach dem Lesen aufgeräumt.
  await expect(page).toHaveURL(/\/lehrer\/live$/);

  await page
    .getByRole("textbox", { name: "Text" })
    .fill("Am Morgen scheint die Sonne.");
  await page.getByRole("textbox", { name: "Titel" }).fill("Sonne am Morgen");
  // „Speichern“ steht am Ende von Schritt 2 (Design 15b).
  await page.getByRole("button", { name: "Weiter zu Modus" }).click();
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(
    page.getByText("„Sonne am Morgen“ ist vorbereitet."),
  ).toBeVisible();

  await page.getByRole("button", { name: "Zurück", exact: true }).click();
  await page.getByRole("button", { name: "Zurück zu Start" }).click();
  await expect(page).toHaveURL(/\/lehrer$/);
  // Ein goto mitten in laufende Ladevorgänge bricht WebKit sporadisch mit
  // „internal error“ ab: erst die Seite zur Ruhe kommen lassen.
  await page.waitForLoadState("networkidle");
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
  await page.getByRole("button", { name: "Weiter zu Modus" }).click();
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText("„Morgensonne“ ist vorbereitet.")).toBeVisible();
  await page.getByRole("button", { name: "Zurück", exact: true }).click();
  await page.getByRole("button", { name: "Zurück zu Start" }).click();
  await expect(page).toHaveURL(/\/lehrer$/);
  await page.waitForLoadState("networkidle");
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

for (const theme of ["light", "dark"] as const) {
  test.describe(`Barrierefreiheit der Startseite (${theme})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(
        (value) => localStorage.setItem("theme-preference", value),
        theme,
      );
      await seed(page, [
        content("p-alt-7b", "Schon durchgeführt", {
          kind: "text",
          classIds: [CLASS_A, CLASS_B],
          source: "Der Hund läuft.",
          lastUsedAt: "2026-09-10T10:00:00.000Z",
          prepared: { gameMode: "BATTLE" },
        }),
      ]);
      await page.goto(`/lehrer?klasse=${CLASS_A}`);
      await expect(
        page.getByRole("button", { name: "Text für 7b starten" }),
      ).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    });

    const scan = async (page: Page) =>
      (await analyzeAccessibility(page)).violations.map(({ id, nodes }) => [
        id,
        nodes.length,
      ]);

    test("Vorbereitet und Holen", async ({ page }) => {
      expect(await scan(page)).toEqual([]);
      if (isMobile(page)) expect(await smallTargets(page)).toEqual([]);
    });

    test("Archiv", async ({ page }) => {
      await page.getByRole("tab", { name: /Archiv/ }).click();
      await expect(
        page.getByRole("button", {
          name: "Schon durchgeführt wieder vorbereiten",
        }),
      ).toBeVisible();
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

    test("Rückfrage beim Löschen", async ({ page }) => {
      const remove = page.getByRole("button", { name: "Text für 7b löschen" });
      test.skip(!(await remove.isVisible()), "Handy löscht im Editor");
      await remove.click();
      await expect(
        page.getByRole("group", { name: "Text für 7b löschen bestätigen" }),
      ).toBeVisible();
      expect(await scan(page)).toEqual([]);
    });
  });
}

test("Startseite: bei 320 px läuft nichts horizontal über", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await seed(page);
  await page.goto(`/lehrer?klasse=${CLASS_A}`);
  await expect(
    page.getByRole("button", { name: "Text für 7b starten" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    ),
  ).toBe(false);
});

/** Zwei Englisch-Pakete mit Tags und ein Französisch-Paket in Klasse 7b. */
const PICKER_PACKAGES = [
  content("u3", "Unit 3 · Food", {
    classIds: [CLASS_A],
    updatedAt: "2026-10-01T10:00:00.000Z",
    source: "apple;Apfel;Food\nbread;Brot;Food\nhouse;Haus|Heim",
    promptLocale: "en-GB",
    answerLocale: "de-DE",
  }),
  content("u2", "Unit 2", {
    classIds: [CLASS_A],
    source: "dog;Hund\ncat;Katze\nfish;Fisch",
    promptLocale: "en-GB",
    answerLocale: "de-DE",
  }),
  content("fr", "Français", {
    classIds: [CLASS_A],
    source: "maison;Haus",
    promptLocale: "fr-FR",
    answerLocale: "de-DE",
  }),
];

async function openPicker(page: Page) {
  await seed(page, PICKER_PACKAGES);
  await page.goto(`/lehrer/live?neu=vocabulary&klasse=${CLASS_A}`);
  const open = page.getByRole("button", { name: "Aus meinen Vokabeln wählen" });
  await expect(open).toBeEnabled({ timeout: 15_000 });
  const dialog = page.getByRole("dialog", {
    name: "Aus meinen Vokabeln wählen",
  });
  // Klicks vor dem Laden der Seite gehen verloren; bis zum Dialog wiederholen.
  await expect(async () => {
    await open.click();
    await expect(dialog).toBeVisible({ timeout: 1000 });
  }).toPass();
  return dialog;
}

/** Nichts darf horizontal überlaufen (Dialog, Liste, Seite). */
async function overflowing(page: Page) {
  return page.evaluate(() => {
    const dialog = document.querySelector("dialog[open]");
    const nodes = [
      document.documentElement,
      ...(dialog ? [dialog, ...dialog.querySelectorAll("*")] : []),
    ];
    return nodes
      .filter((node) => node.scrollWidth > node.clientWidth + 1)
      .map((node) => `${node.tagName}.${node.className}`);
  });
}

for (const theme of ["light", "dark"] as const) {
  test.describe(`Vokabelauswahl im Laufdiktat (${theme})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(
        (value) => localStorage.setItem("theme-preference", value),
        theme,
      );
    });

    test("wählen, übernehmen und Barrierefreiheit mit offenem Dialog", async ({
      page,
    }) => {
      const dialog = await openPicker(page);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await expect(
        dialog.getByRole("heading", { level: 3, name: /Unit 3 · Food/ }),
      ).toContainText("3 Vokabeln · Englisch");

      // Zugeklappt, dann aufgeklappt: Axe prüft beide Zustände.
      const scan = async () =>
        (await analyzeAccessibility(page)).violations.map(({ id, nodes }) => [
          id,
          nodes.length,
        ]);
      expect(await scan()).toEqual([]);

      await dialog.getByRole("button", { name: /Unit 3 · Food/ }).click();
      await dialog.getByRole("checkbox", { name: "apple → Apfel" }).check();
      await dialog.getByRole("button", { name: /Unit 2/ }).click();
      await expect(
        dialog.getByRole("checkbox", {
          name: "Alle Vokabeln mit Tag Food aus Unit 3 · Food auswählen",
        }),
      ).toHaveJSProperty("indeterminate", true);
      await dialog.getByRole("checkbox", { name: "dog → Hund" }).check();
      await expect(dialog.getByRole("status")).toHaveText("2 ausgewählt");
      // Das französische Paket ist nach der ersten Wahl ausgeblendet.
      await expect(
        dialog.getByText("1 Paket in anderen Sprachen ausgeblendet"),
      ).toBeVisible();

      expect(await scan()).toEqual([]);
      expect(await smallTargets(page)).toEqual([]);
      expect(await overflowing(page)).toEqual([]);

      await dialog.getByRole("button", { name: "Übernehmen" }).click();
      await expect(dialog).toHaveCount(0);
      await expect(page.getByText("2 Vokabeln übernommen.")).toBeVisible();
      await expect(
        page.getByRole("textbox", { name: "Vokabel 1", exact: true }),
      ).toHaveValue("apple");
      await expect(
        page.getByRole("textbox", { name: "Tag Vokabel 1", exact: true }),
      ).toHaveValue("Food");
      await expect(
        page.getByRole("textbox", { name: "Vokabel 2", exact: true }),
      ).toHaveValue("dog");
      await expect(
        page.getByText(/Wird beim Start als neue Abfrage abgelegt/),
      ).toBeVisible();
      await expect(page.getByRole("textbox", { name: "Titel" })).toHaveValue(
        /^Abfrage \d\d\.\d\d\. · Unit 3 · Food \+ 1 weitere$/,
      );
    });

    test("Tastatur: Suche, Kästchen, Übernehmen; Escape schließt ohne Übernahme", async ({
      page,
    }) => {
      const dialog = await openPicker(page);
      const search = dialog.getByRole("searchbox", {
        name: "Vokabeln durchsuchen",
      });
      await search.focus();
      await page.keyboard.type("food");
      // Treffer klappen ihr Paket auf; Unit 2 passt nicht zur Suche.
      await expect(
        dialog.getByRole("checkbox", { name: "bread → Brot" }),
      ).toBeVisible();
      await expect(dialog.getByText("Unit 2")).toHaveCount(0);

      await page.keyboard.press("Tab");
      await expect(
        dialog.getByRole("checkbox", { name: "Alle Klassen" }),
      ).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(
        dialog.getByRole("checkbox", {
          name: "Alle Vokabeln aus Unit 3 · Food auswählen",
        }),
      ).toBeFocused();
      await page.keyboard.press("Space");
      // Bei aktiver Suche zählen nur die sichtbaren Treffer.
      await expect(dialog.getByRole("status")).toHaveText("2 ausgewählt");

      await page.keyboard.press("Escape");
      await expect(dialog).not.toBeVisible();
      await expect(
        page.getByRole("textbox", { name: "Vokabel 1", exact: true }),
      ).toHaveValue("");

      // Neu geöffnet beginnt die Auswahl leer; „Übernehmen“ per Tastatur.
      await page
        .getByRole("button", { name: "Aus meinen Vokabeln wählen" })
        .click();
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole("status")).toHaveText("0 ausgewählt");
      await dialog
        .getByRole("checkbox", {
          name: "Alle Vokabeln aus Unit 3 · Food auswählen",
        })
        .check();
      await dialog.getByRole("button", { name: "Übernehmen" }).focus();
      await page.keyboard.press("Enter");
      await expect(dialog).not.toBeVisible();
      await expect(
        page.getByRole("textbox", { name: "Vokabel 3", exact: true }),
      ).toHaveValue("house");
    });
  });
}

test("Vokabelauswahl: bei 320 px läuft nichts horizontal über", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  const dialog = await openPicker(page);
  await dialog.getByRole("button", { name: /Unit 3 · Food/ }).click();
  await dialog.getByRole("checkbox", { name: "house → Haus | Heim" }).check();
  expect(await overflowing(page)).toEqual([]);
  expect(await smallTargets(page)).toEqual([]);
  // Der Fuß bleibt sichtbar, auch wenn die Liste lang ist.
  await expect(
    dialog.getByRole("button", { name: "Übernehmen" }),
  ).toBeInViewport();
});
