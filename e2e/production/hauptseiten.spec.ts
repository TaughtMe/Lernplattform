import { expect, test, type Page } from "../fixtures";
import { analyzeAccessibility } from "../accessibility-helpers";

/**
 * Hauptseiten im Schulbetrieb gegen den Produktions-Build (Audit A-006),
 * Konfiguration: `playwright.production.config.ts`. Kein Vorschau-Cookie, kein
 * `LERNRAUM_VORSCHAU`, Service Worker erlaubt. Die Entwicklungs-Suite
 * (`platform-quality.spec.ts`) läuft dagegen immer mit eingeschalteter Vorschau
 * und blockiertem Service Worker und kann Fehler des Builds nicht sehen.
 */

function isKnownFrameworkDiagnostic(message: string) {
  // `app/layout.tsx` setzt `interactive-widget` bewusst für Chrome auf
  // Android. WebKit kennt den Schlüssel nicht und meldet das als Fehler,
  // ignoriert ihn aber folgenlos.
  return (
    message ===
    'Viewport argument key "interactive-widget" not recognized and ignored.'
  );
}

/** Sammelt Laufzeit- und Konsolenfehler, bis der Test sie auswertet. */
function collectRuntimeErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      !isKnownFrameworkDiagnostic(message.text())
    ) {
      errors.push(message.text());
    }
  });
  return errors;
}

/**
 * Wartet, bis React ein Element hydriert hat. Klicks davor gehen verloren;
 * dann bliebe ein Test grün, der nur das serverseitig gerenderte HTML sieht.
 */
async function waitForHydration(page: Page, name: string | RegExp) {
  const element = page.getByRole("button", { name }).first();
  await expect(element).toBeVisible();
  await expect
    .poll(() =>
      element.evaluate((node) =>
        Object.keys(node).some((key) => key.startsWith("__reactProps$")),
      ),
    )
    .toBe(true);
  return element;
}

/** Hell/Dunkel-Umschalter: reagiert nur, wenn die Seite hydriert ist. */
async function toggleTheme(page: Page) {
  const read = () =>
    page.evaluate(() => document.documentElement.dataset["theme"]);
  const before = await read();
  await (await waitForHydration(page, "Hell oder dunkel")).click();
  await expect.poll(read).not.toBe(before);
}

/**
 * Clientseitige Navigation: Ein Marker im Fenster überlebt den Linkklick nur,
 * wenn der Router die Seite ohne Neuladen wechselt.
 */
function navigateClientSide(link: string, target: string) {
  return async (page: Page) => {
    await page.evaluate(() => {
      (window as unknown as Record<string, boolean>)["__ohneNeuladen"] = true;
    });
    const anchor = page.getByRole("link", { name: link, exact: true }).first();
    await expect(anchor).toBeVisible();
    // Ein Klick vor der Hydration löst ein normales Neuladen aus, das den
    // Marker löscht; deshalb erst die Hydration abwarten.
    await expect
      .poll(() =>
        anchor.evaluate((node) =>
          Object.keys(node).some((key) => key.startsWith("__reactProps$")),
        ),
      )
      .toBe(true);
    await anchor.click();
    await expect(page).toHaveURL(new RegExp(`${target}$`));
    expect(
      await page.evaluate(
        () => (window as unknown as Record<string, boolean>)["__ohneNeuladen"],
      ),
    ).toBe(true);
  };
}

type Hauptseite = {
  path: string;
  heading: string | RegExp;
  /** Eine Interaktion, die nur eine hydrierte Seite beantwortet. */
  interact: (page: Page) => Promise<void>;
};

const HAUPTSEITEN: Hauptseite[] = [
  {
    path: "/",
    heading: /^Weiter als /,
    interact: navigateClientSide("Datenschutz", "/datenschutz"),
  },
  { path: "/lernen", heading: "Lernraum", interact: toggleTheme },
  { path: "/lernen/material", heading: "Lernwerkstatt", interact: toggleTheme },
  {
    path: "/lernen/fortschritt",
    heading: "Mein Fortschritt",
    interact: toggleTheme,
  },
  {
    path: "/lernen/aufgaben",
    heading: "Meine Aufgaben",
    interact: toggleTheme,
  },
  { path: "/lernen/klasse", heading: "Meine Klasse", interact: toggleTheme },
  { path: "/frei/german", heading: "Wortspeicher", interact: toggleTheme },
  {
    path: "/frei/german/laufdiktat",
    heading: "Laufdiktat",
    interact: toggleTheme,
  },
  {
    path: "/frei/german/lernwoerter",
    heading: "Wortspeicher",
    interact: toggleTheme,
  },
  { path: "/frei/mathematics", heading: "Kopfrechnen", interact: toggleTheme },
  {
    path: "/lernbox",
    heading: "LernBox",
    // Das Plus-Menü öffnet nur nach der Hydration.
    interact: async (page) => {
      await (await waitForHydration(page, "Vokabeln hinzufügen")).click();
      await expect(
        page.getByRole("menuitem", { name: /Selbst eintragen/ }),
      ).toBeVisible();
    },
  },
  {
    path: "/raum",
    heading: "Bereit für dein Laufdiktat?",
    interact: toggleTheme,
  },
  { path: "/lehrer", heading: "Neues Laufdiktat", interact: toggleTheme },
  { path: "/lehrer/live", heading: "Inhalt eingeben", interact: toggleTheme },
  {
    path: "/lehrer/klassen",
    heading: "Klassen und Schüler",
    interact: toggleTheme,
  },
  {
    path: "/lehrer/material",
    heading: "Freigabe an Schüler",
    interact: toggleTheme,
  },
  {
    path: "/lehrer/einstellungen",
    heading: "Einstellungen",
    interact: toggleTheme,
  },
  {
    path: "/impressum",
    heading: "Impressum",
    interact: navigateClientSide("Datenschutz", "/datenschutz"),
  },
  {
    path: "/datenschutz",
    heading: "Datenschutzerklärung",
    interact: navigateClientSide("Impressum", "/impressum"),
  },
];

test.describe("Hauptseiten im Produktions-Build", () => {
  for (const { path, heading, interact } of HAUPTSEITEN) {
    test(`${path} lädt, hydriert und ist barrierefrei`, async ({ page }) => {
      const runtimeErrors = collectRuntimeErrors(page);

      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      expect(new URL(page.url()).pathname).toBe(path);
      await expect(
        page.getByRole("heading", { level: 1, name: heading }),
      ).toBeVisible();

      // Barrierefreiheit vor der Interaktion: Sie prüft den Zustand, den
      // Schüler beim Laden sehen.
      const results = await analyzeAccessibility(page);
      expect(results.violations, `Accessibility violations on ${path}`).toEqual(
        [],
      );

      await interact(page);

      expect(runtimeErrors).toEqual([]);
    });
  }
});

test.describe("Vorschau-Bereiche im Schulbetrieb", () => {
  // Bereiche mit Stufe `vorschau` oder `aus` (src/domain/release.ts) leiten
  // ohne Vorschau-Cookie auf eine freie Seite um. Im Entwicklungsserver ist
  // die Vorschau immer an, deshalb sieht nur dieser Lauf, ob die Sperre im
  // Build greift.
  for (const path of [
    "/klasse/7b",
    "/gast",
    "/lehrer/aufgaben",
    "/haus",
    "/duell",
    "/demo",
  ]) {
    test(`${path} leitet ohne Vorschau um`, async ({ page, context }) => {
      expect(
        (await context.cookies()).filter((c) => c.name === "lernraum-vorschau"),
      ).toEqual([]);

      await page.goto(path);

      expect(new URL(page.url()).pathname).not.toBe(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(
        page.getByRole("heading", { name: /Demo-Klasse|Duell|Haus/ }),
      ).toHaveCount(0);
    });
  }
});

test.describe("Service Worker im Produktions-Build", () => {
  test("/sw.js wird ausgeliefert und registriert sich", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);

    await page.goto("/");
    await expect
      .poll(() =>
        page.evaluate(
          async () => (await navigator.serviceWorker.getRegistrations()).length,
        ),
      )
      .toBeGreaterThan(0);

    const registration = await page.evaluate(async () => {
      const ready = await navigator.serviceWorker.ready;
      return {
        scope: ready.scope,
        script: (ready.active ?? ready.waiting ?? ready.installing)?.scriptURL,
      };
    });
    const origin = new URL(page.url()).origin;
    expect(registration.scope).toBe(`${origin}/`);
    expect(registration.script).toBe(`${origin}/sw.js`);

    const sw = await page.request.get("/sw.js");
    expect(sw.status()).toBe(200);
    expect(sw.headers()["content-type"] ?? "").toMatch(/javascript/);

    expect(runtimeErrors).toEqual([]);
  });
});
