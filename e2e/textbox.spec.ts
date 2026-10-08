import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { TEXTBOX_TEXTS } from "../src/domain/textbox-library";

const text = TEXTBOX_TEXTS[0]!;
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];

test.beforeEach(async ({ context, baseURL }) => {
  // Die Textbox ist zunächst eine Vorschau und erscheint nur mit diesem Cookie.
  await context.addCookies([
    { name: "lernraum-vorschau", value: "1", url: baseURL! },
  ]);
});

async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  expect(results.violations).toEqual([]);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth + 1,
    ),
  ).toBe(true);
}

async function playGapRound(page: Page, round: number) {
  await expect(
    page.getByRole("heading", { name: `Durchgang ${round} von 4: Merken` }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ich bin bereit" }).click();
  const first = page.getByRole("textbox", { name: /^Lücke 1 von/ });
  await expect(first).toBeFocused();
  await page.getByRole("button", { name: "Prüfen" }).click();
  await expect(
    page.getByRole("heading", { name: `Durchgang ${round} von 4: Kontrolle` }),
  ).toBeVisible();
}

test("Kachel „Textbox“ erscheint unter Üben", async ({ page }) => {
  await page.goto("/ueben");
  const tile = page.getByRole("link", { name: /^Textbox/ });
  await expect(tile).toHaveAttribute("href", "/frei/german/textbox");
  await expect(tile.locator("img")).toHaveAttribute("alt", "");
  await expect
    .poll(() =>
      tile
        .locator("img")
        .evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0),
    )
    .toBe(true);
});

test("ein Text läuft durch alle vier Durchgänge und der Bestwert bleibt", async ({
  page,
}) => {
  await page.goto("/frei/german/textbox");
  await expect(page.getByRole("heading", { name: "Textbox" })).toBeVisible();
  await expectAccessible(page);

  await page.getByRole("button", { name: `${text.title} üben` }).click();
  // Durchgang 1: Zielwörter sind farbig und zusätzlich unterstrichen markiert.
  await expect(page.locator("mark").first()).toBeVisible();
  await expect(page.getByRole("timer")).toBeVisible();
  await expectAccessible(page);
  await page.getByRole("button", { name: "Ich bin bereit" }).click();

  // Lücken: mit der Leertaste weiterspringen, Einfügen ist gesperrt.
  const first = page.getByRole("textbox", { name: /^Lücke 1 von/ });
  await expect(first).toBeFocused();
  await page.keyboard.type("Hund ");
  await expect(
    page.getByRole("textbox", { name: /^Lücke 2 von/ }),
  ).toBeFocused();
  await expectAccessible(page);
  await page.getByRole("button", { name: "Prüfen" }).click();
  await expect(
    page.getByRole("heading", { name: "Durchgang 1 von 4: Kontrolle" }),
  ).toBeVisible();
  await expectAccessible(page);
  await page.getByRole("button", { name: "Weiter zu Durchgang 2" }).click();

  await playGapRound(page, 2);
  await page.getByRole("button", { name: "Weiter zu Durchgang 3" }).click();
  await playGapRound(page, 3);
  await page.getByRole("button", { name: "Weiter zu Durchgang 4" }).click();

  // Durchgang 4: freies Schreiben des ganzen Textes.
  await expect(
    page.getByRole("heading", { name: "Durchgang 4 von 4: Merken" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ich bin bereit" }).click();
  const field = page.getByRole("textbox", {
    name: "Dein Text aus dem Gedächtnis",
  });
  await expect(field).toBeFocused();
  await expectAccessible(page);
  await field.fill(text.text);
  await page.getByRole("button", { name: "Prüfen" }).click();
  await expect(page.getByText("100 %").first()).toBeVisible();
  await page.getByRole("button", { name: "Ergebnis ansehen" }).click();
  await expect(page.getByRole("heading", { name: "Geschafft!" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Bestwert");
  await expectAccessible(page);

  // Zweiter Versuch mit schlechterem Ergebnis: der Bestwert bleibt.
  await page.getByRole("button", { name: "Nochmal üben" }).click();
  for (const round of [1, 2, 3] as const) {
    await playGapRound(page, round);
    await page
      .getByRole("button", { name: `Weiter zu Durchgang ${round + 1}` })
      .click();
  }
  await page.getByRole("button", { name: "Ich bin bereit" }).click();
  await page
    .getByRole("textbox", { name: "Dein Text aus dem Gedächtnis" })
    .fill("Im Garten");
  await page.getByRole("button", { name: "Prüfen" }).click();
  await page.getByRole("button", { name: "Ergebnis ansehen" }).click();
  await expect(page.getByRole("heading", { name: "Geschafft!" })).toBeVisible();
  await expect(page.getByRole("status")).toHaveCount(0);
  await page.getByRole("button", { name: "Anderen Text wählen" }).click();
  const row = page
    .getByRole("heading", { name: text.title })
    .locator("xpath=ancestor::li");
  await expect(row).toContainText("2 Übungen");
  await expect(row).toContainText("100 %");

  // Auch nach dem Neuladen steht der Bestwert da (lokal gespeichert).
  await page.reload();
  await expect(
    page
      .getByRole("heading", { name: text.title })
      .locator("xpath=ancestor::li"),
  ).toContainText("100 %");
});

test("eine unterbrochene Übung lässt sich nach dem Neuladen fortsetzen", async ({
  page,
}) => {
  await page.goto("/frei/german/textbox");
  await page.getByRole("button", { name: `${text.title} üben` }).click();
  await playGapRound(page, 1);
  await page.getByRole("button", { name: "Weiter zu Durchgang 2" }).click();
  await playGapRound(page, 2);

  await page.reload();
  await page.getByRole("button", { name: `${text.title} weiterüben` }).click();
  await expect(page.getByText(/Durchgang 3 von 4/).first()).toBeVisible();
  await page.getByRole("button", { name: "Fortsetzen" }).click();
  await expect(
    page.getByRole("heading", { name: "Durchgang 3 von 4: Merken" }),
  ).toBeVisible();
  await expect(page.locator("mark")).toHaveCount(0);
});

test("dunkles Farbschema bleibt barrierefrei", async ({ page }) => {
  await page.goto("/frei/german/textbox");
  // Der Umschalter reagiert erst nach dem Laden der Seite.
  await expect(async () => {
    await page.getByRole("button", { name: "Hell oder dunkel" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark", {
      timeout: 1000,
    });
  }).toPass();
  await expectAccessible(page);
  await page.getByRole("button", { name: `${text.title} üben` }).click();
  await expectAccessible(page);
  await page.getByRole("button", { name: "Ich bin bereit" }).click();
  await expectAccessible(page);
  await page.getByRole("button", { name: "Prüfen" }).click();
  await expectAccessible(page);
});

async function completeRun(page: Page, typed: string) {
  for (const round of [1, 2, 3] as const) {
    await playGapRound(page, round);
    await page
      .getByRole("button", { name: `Weiter zu Durchgang ${round + 1}` })
      .click();
  }
  await page.getByRole("button", { name: "Ich bin bereit" }).click();
  await page
    .getByRole("textbox", { name: "Dein Text aus dem Gedächtnis" })
    .fill(typed);
  await page.getByRole("button", { name: "Prüfen" }).click();
  await page.getByRole("button", { name: "Ergebnis ansehen" }).click();
  await expect(page.getByRole("heading", { name: "Geschafft!" })).toBeVisible();
}

test("Verlauf zeigt Werte und Diagramme, barrierefrei in beiden Farbschemata", async ({
  page,
}) => {
  await page.goto("/frei/german/textbox");
  await page.getByRole("button", { name: `${text.title} üben` }).click();
  await completeRun(page, text.text);
  // „Nochmal üben“ startet sofort den zweiten Versuch (schlechteres Ergebnis).
  await page.getByRole("button", { name: "Nochmal üben" }).click();
  await completeRun(page, "Im Garten");
  await page.getByRole("button", { name: "Verlauf ansehen" }).click();
  await expect(page.getByRole("heading", { name: text.title })).toBeVisible();
  const stats = page.locator("dl");
  await expect(stats).toContainText("100 %");
  await expect(stats).toContainText("Übungsversuche2");

  const chart = page.getByRole("img", {
    name: /^Dein Ergebnis in Durchgang 4/,
  });
  await expect(chart).toBeVisible();
  await expectAccessible(page);

  await page.getByRole("button", { name: "Säulen" }).click();
  await expect(chart).toBeVisible();
  await page.getByText("Wertetabelle anzeigen").click();
  await expect(page.getByRole("table")).toContainText("100 %");
  await expectAccessible(page);

  await page.getByText("Schau dir dein Diagramm an").click();
  await expect(
    page.getByText("Wie stark hast du dich verbessert?"),
  ).toBeVisible();
  await expect(async () => {
    await page.getByRole("button", { name: "Hell oder dunkel" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark", {
      timeout: 1000,
    });
  }).toPass();
  await expectAccessible(page);
  await page.getByRole("button", { name: "Linie" }).click();
  await expectAccessible(page);
});

test("Wortspeicher führt zu passenden Texten und die Wörter werden ausgeblendet", async ({
  page,
}) => {
  await page.goto("/frei/german/lernwoerter?woerter=Ball,Wiese");
  await page.getByRole("button", { name: "Stufe ausprobieren" }).click();
  for (const word of ["Ball", "Wiese"]) {
    await page.getByLabel("Deine Lösung").fill(word);
    await page.getByLabel("Deine Lösung").press("Enter");
    await expect(page.getByText("Richtig")).toBeVisible();
  }
  await expect(page.getByText("Merkstrecke abgeschlossen")).toBeVisible();
  await page.getByRole("link", { name: "Mit einem Text weiterüben" }).click();

  const panel = page.getByRole("region", {
    name: "Passende Texte zu deinen Wörtern",
  });
  await expect(panel).toContainText(text.title);
  await expect(panel).toContainText("Enthält 2 deiner 2 Wörter.");
  await expectAccessible(page);
  await panel
    .getByRole("button", { name: /mit deinen Wörtern üben/ })
    .first()
    .click();
  await expect(page.locator("mark").filter({ hasText: "Wiese" })).toBeVisible();
});

test("Fehlerwörter aus der Textbox füllen die eigene Liste im Wortspeicher", async ({
  page,
}) => {
  await page.goto("/frei/german/textbox");
  await page.getByRole("button", { name: `${text.title} üben` }).click();
  await completeRun(page, "Im Garten");
  await page
    .getByRole("link", { name: "Fehlerwörter im Wortspeicher üben" })
    .click();
  const list = page.getByRole("textbox", { name: /Deine Lernwörter/ });
  await expect(list).toHaveValue(/wohnt/);
  await expect(list).toHaveValue(/Hund/);
});

test("Fortschrittsseite: leerer Zustand, dann Werte, barrierefrei", async ({
  page,
}) => {
  await page.goto("/lernen/fortschritt");
  await expect(
    page.getByText("Noch keine Textbox-Übung abgeschlossen"),
  ).toBeVisible();
  await expectAccessible(page);

  await page.goto("/frei/german/textbox");
  await page.getByRole("button", { name: `${text.title} üben` }).click();
  await completeRun(page, text.text);

  await page.goto("/lernen/fortschritt");
  const section = page.getByRole("region", { name: "Textbox" });
  await expect(section).toContainText("Abgeschlossene Übungen");
  await expect(
    section.getByRole("img", { name: /alle Übungen: ein Wert, 100 Prozent/ }),
  ).toBeVisible();
  await expectAccessible(page);
});

test("Laufzettel: Tabelle, Namensfeld ohne Speicherung und Druckansicht", async ({
  page,
}) => {
  await page.goto("/frei/german/textbox");
  await page.getByRole("button", { name: `${text.title} üben` }).click();
  await completeRun(page, text.text);

  await page.goto("/frei/german/textbox/laufzettel");
  await expect(
    page.getByRole("heading", { name: "Laufzettel Textbox" }),
  ).toBeVisible();
  const table = page.getByRole("table");
  await expect(table).toContainText(text.title);
  await expect(table).toContainText("100 %");
  await expectAccessible(page);

  await page.getByRole("textbox", { name: /Name oder Kennung/ }).fill("Mia M.");
  await expect(page.getByTestId("worksheet-name")).toHaveText("Mia M.");
  // Der Name taucht in keinem Browser-Speicher auf (andere Einträge der App sind erlaubt).
  const stored = await page.evaluate(async () => {
    const dump = [document.cookie];
    for (const store of [localStorage, sessionStorage]) {
      for (let i = 0; i < store.length; i += 1) {
        const key = store.key(i)!;
        dump.push(key, store.getItem(key) ?? "");
      }
    }
    for (const info of await indexedDB.databases()) {
      if (!info.name) continue;
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(info.name!);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      for (const name of Array.from(db.objectStoreNames)) {
        const rows = await new Promise<unknown[]>((resolve, reject) => {
          const request = db.transaction(name).objectStore(name).getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        dump.push(JSON.stringify(rows));
      }
      db.close();
    }
    return dump.join("\n");
  });
  expect(stored).not.toContain("Mia");
  await page.reload();
  await expect(page.getByTestId("worksheet-name")).toHaveText("–");

  // Im Ausdruck: Hinweis sichtbar, Bedienelemente und Navigation weg.
  const notice =
    "Dieser Laufzettel wurde auf deinem Gerät erstellt. Er ist eine Übersicht und kein Prüfungsnachweis.";
  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("note")).toContainText(notice);
  await expect(page.getByRole("note")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Drucken oder als PDF sichern" }),
  ).toBeHidden();
  await expect(
    page.getByRole("navigation", { name: "Hauptnavigation" }),
  ).toBeHidden();
  await expect(table).toBeVisible();
  await page.emulateMedia({ media: "screen" });
});
