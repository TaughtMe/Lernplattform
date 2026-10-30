import { expect, test, type Page } from "@playwright/test";
import { analyzeAccessibility } from "./accessibility-helpers";
import { hydrated } from "./hydration-helpers";
import { createBox, startRound } from "./wortspeicher-helpers";

/**
 * Übungsrunden gehen nicht mehr verloren (Befund C-001, D5-1): Neuladen und
 * Zurück-Geste bieten „Weitermachen“ an, Leiste, Logo und Zurück-Geste fragen
 * nach. Je Modul: Runde starten, drei Antworten, dann Neuladen bzw. Zurück.
 */

const WORDS = [
  "Hase",
  "Igel",
  "Fuchs",
  "Reh",
  "Dachs",
  "Maus",
  "Biene",
  "Katze",
  "Hund",
  "Pferd",
];
const PAIRS = [
  ["Haus", "house"],
  ["Hund", "dog"],
  ["Baum", "tree"],
  ["Katze", "cat"],
  ["Tisch", "table"],
  ["Stuhl", "chair"],
  ["Buch", "book"],
  ["Auto", "car"],
  ["Ball", "ball"],
  ["Fisch", "fish"],
] as const;
const SENTENCES = [
  "Eins.",
  "Zwei.",
  "Drei.",
  "Vier.",
  "Fünf.",
  "Sechs.",
  "Sieben.",
  "Acht.",
  "Neun.",
  "Zehn.",
];

type RoundModule = {
  name: string;
  path: string;
  /** Legt Inhalte an und startet eine Runde mit zehn Aufgaben. */
  start: (page: Page) => Promise<void>;
  /** Beantwortet die ersten drei Aufgaben. */
  answerThree: (page: Page) => Promise<void>;
  /** Zeigt die vierte Aufgabe von zehn. */
  expectFourth: (page: Page) => Promise<void>;
  /** Die Runde füllt das Handy und hat dort kein Logo (nur Leiste und „Runde beenden“). */
  noLogoOnPhone?: boolean;
};

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

const MODULES: RoundModule[] = [
  {
    name: "Wortspeicher",
    path: "/frei/german/lernwoerter",
    start: async (page) => {
      await createBox(page, "Zehn Tiere", WORDS);
      await startRound(page, "Zehn Tiere", 1);
      await expect(page.getByLabel("Deine Lösung")).toBeFocused();
    },
    answerThree: async (page) => {
      for (let step = 0; step < 3; step += 1) {
        const word = (await page.locator("article h2").innerText()).trim();
        const field = page.getByLabel("Deine Lösung");
        await field.fill(word);
        await field.press("Enter");
        // Nach „Richtig“ geht es von selbst zum nächsten Wort.
        await expect(page.locator("article h2")).not.toHaveText(word);
      }
    },
    expectFourth: async (page) => {
      await expect(page.getByText("4 / 10", { exact: true })).toBeVisible();
    },
  },
  {
    name: "LernBox",
    path: "/lernbox",
    noLogoOnPhone: true,
    start: async (page) => {
      await page.goto("/lernbox");
      await chooseFromPlusMenu(page, /Selbst eintragen/);
      await page
        .getByRole("textbox", { name: "Name des neuen Stapels" })
        .fill("Rundenprobe");
      await page.getByRole("button", { name: "Stapel anlegen" }).click();
      await page.getByRole("button", { name: "Schließen" }).click();
      await chooseFromPlusMenu(page, /Viele einfügen/);
      await page.getByRole("button", { name: "Einfügen oder Datei" }).click();
      await page
        .getByRole("textbox", { name: "Vokabeln zum Importieren" })
        .fill(PAIRS.map(([front, back]) => `${front};${back}`).join("\n"));
      await page.getByRole("button", { name: "Vorschau ansehen" }).click();
      await expect(page.getByText("10 Vokabeln erkannt")).toBeVisible();
      await page.getByRole("button", { name: "Übernehmen" }).click();
      await expect(page.getByRole("status")).toHaveText(
        "10 Vokabeln importiert.",
      );
      await page.getByRole("button", { name: "Schließen" }).click();
      await page.getByRole("button", { name: /Rundenprobe/ }).click();
      const sheet = page.getByRole("dialog", { name: "Rundenprobe" });
      await sheet.getByRole("button", { name: "Mündlich" }).click();
      await sheet.getByRole("button", { name: "Los geht's" }).click();
      await expect(page.getByText(/10 übrig/)).toBeVisible();
    },
    answerThree: async (page) => {
      for (let step = 0; step < 3; step += 1) {
        await page.getByRole("button", { name: "Antwort zeigen" }).click();
        await page
          .getByRole("button", { name: "Gewusst", exact: true })
          .click();
        await expect(
          page.getByText(new RegExp(`${9 - step} übrig`)),
        ).toBeVisible();
      }
    },
    expectFourth: async (page) => {
      await expect(page.getByText(/7 übrig/)).toBeVisible();
    },
  },
  {
    name: "Kopfrechnen",
    path: "/frei/mathematics",
    start: async (page) => {
      await page.goto("/frei/mathematics");
      // Ein Klick vor der Hydration verpufft; dann bliebe das Feld aus.
      await (
        await hydrated(page.getByRole("button", { name: "Eigene Aufgaben" }))
      ).click();
      await page
        .getByRole("textbox", { name: "Eine Aufgabe pro Zeile" })
        .fill(
          Array.from({ length: 10 }, (_, i) => `${i + 1} + ${i + 1}`).join(
            "\n",
          ),
        );
      await page.getByRole("button", { name: "Runde starten" }).click();
      await expect(page.getByText("Aufgabe 1 von 10")).toBeVisible();
    },
    answerThree: async (page) => {
      for (let n = 1; n <= 3; n += 1) {
        const field = page.getByRole("textbox", { name: "Dein Ergebnis" });
        await field.fill(String(n * 2));
        await field.press("Enter");
        await expect(page.getByText(`Aufgabe ${n + 1} von 10`)).toBeVisible();
      }
    },
    expectFourth: async (page) => {
      await expect(page.getByText("Aufgabe 4 von 10")).toBeVisible();
    },
  },
  {
    name: "Laufdiktat allein",
    path: "/frei/german/laufdiktat",
    start: async (page) => {
      await page.goto("/frei/german/laufdiktat");
      // Eingaben vor der Hydration werden zurückgesetzt (Beispieltext, 2 Sätze).
      await (
        await hydrated(
          page.getByRole("textbox", { name: /^Text – Sätze und Zeilen/ }),
        )
      ).fill(SENTENCES.join(" "));
      await page.getByRole("button", { name: "Laufdiktat starten" }).click();
      await expect(page.getByText("1 / 10", { exact: true })).toBeVisible();
    },
    answerThree: async (page) => {
      for (let step = 0; step < 3; step += 1) {
        const sentence = (
          await page.getByRole("heading", { level: 1 }).innerText()
        ).trim();
        await page
          .getByRole("button", { name: "Verstanden – jetzt schreiben" })
          .click();
        await page
          .getByRole("textbox", { name: "Deine Antwort" })
          .fill(sentence);
        await page.getByRole("button", { name: "Prüfen" }).click();
        await page.getByRole("button", { name: "Nächste Aufgabe" }).click();
      }
    },
    expectFourth: async (page) => {
      await expect(page.getByText("4 / 10", { exact: true })).toBeVisible();
    },
  },
];

const leaveDialog = (page: Page) =>
  page.getByRole("alertdialog", { name: "Runde wirklich beenden?" });

for (const unit of MODULES) {
  test.describe(unit.name, () => {
    test.setTimeout(90_000);

    test("Neuladen bietet „Weitermachen (3 von 10)“ an und setzt bei Aufgabe 4 fort", async ({
      page,
    }) => {
      await unit.start(page);
      await unit.answerThree(page);
      await unit.expectFourth(page);

      await page.reload();
      const resume = page.getByRole("button", {
        name: "Weitermachen (3 von 10)",
      });
      await expect(resume).toBeVisible();
      expect((await analyzeAccessibility(page)).violations).toEqual([]);
      await resume.click();
      await unit.expectFourth(page);
      // Das Angebot verschwindet, sobald die Runde läuft.
      await expect(
        page.getByRole("button", { name: /Weitermachen/ }),
      ).toHaveCount(0);
    });

    test("Zurück-Geste und Leiste fragen nach; „Beenden“ lässt Weitermachen übrig", async ({
      page,
    }) => {
      await unit.start(page);
      await unit.answerThree(page);

      // Zurück-Geste: zuerst die Rückfrage, dann bleibt die Runde stehen.
      await page.goBack();
      const dialog = leaveDialog(page);
      await expect(dialog).toBeVisible();
      await expect(
        dialog.getByRole("button", { name: "Weiterüben" }),
      ).toBeFocused();
      expect((await analyzeAccessibility(page)).violations).toEqual([]);
      await dialog.getByRole("button", { name: "Weiterüben" }).click();
      await expect(dialog).toHaveCount(0);
      await expect(page).toHaveURL(new RegExp(`${unit.path}$`));
      await unit.expectFourth(page);

      // Untere Leiste (oder Seitenleiste): erst fragen, dann bleiben.
      const nav = page.getByRole("navigation", { name: "Hauptnavigation" });
      const bar = nav.getByRole("link", { name: "Üben", exact: true });
      await bar.click();
      await expect(dialog).toBeVisible();
      await dialog.getByRole("button", { name: "Weiterüben" }).click();
      await expect(bar).toBeFocused();
      await expect(page).toHaveURL(new RegExp(`${unit.path}$`));

      // Logo: in der Leiste, auf kleinen Bildschirmen im Kopf der Seite. Die
      // LernBox-Runde zeigt am Handy keins; dort fragt „Runde beenden“ selbst.
      const logo = page
        .getByRole("link", { name: "Zur Startseite" })
        .filter({ visible: true });
      if (unit.noLogoOnPhone && (page.viewportSize()?.width ?? 0) < 900) {
        await expect(logo).toHaveCount(0);
      } else {
        await logo.first().click();
        await expect(dialog).toBeVisible();
        await dialog.getByRole("button", { name: "Weiterüben" }).click();
      }

      // Noch einmal zurück: „Beenden“ verlässt die Runde, der Stand bleibt.
      await page.goBack();
      await expect(dialog).toBeVisible();
      await dialog.getByRole("button", { name: "Beenden" }).click();
      await expect(dialog).toHaveCount(0);
      await expect(page).toHaveURL(new RegExp(`${unit.path}$`));
      await expect(
        page.getByRole("button", { name: "Weitermachen (3 von 10)" }),
      ).toBeVisible();

      // „Neu anfangen“ verwirft den Stand.
      await page.getByRole("button", { name: "Neu anfangen" }).click();
      await expect(
        page.getByRole("button", { name: /Weitermachen/ }),
      ).toHaveCount(0);
    });

    test("Ein Tipp auf die Leiste wechselt nach „Beenden“ die Seite", async ({
      page,
    }) => {
      await unit.start(page);
      await unit.answerThree(page);
      await page
        .getByRole("navigation", { name: "Hauptnavigation" })
        .getByRole("link", { name: "Üben", exact: true })
        .click();
      await leaveDialog(page).getByRole("button", { name: "Beenden" }).click();
      await expect(page).toHaveURL(/\/ueben$/);

      // Wieder im Modul: Der Stand wartet.
      await page.goto(unit.path);
      await expect(
        page.getByRole("button", { name: "Weitermachen (3 von 10)" }),
      ).toBeVisible();
    });
  });
}

test("Tastenwelt fragt erst nach dem ersten Anschlag und sagt, dass sie neu beginnt", async ({
  page,
}) => {
  await page.goto("/frei/typing");
  await expect(async () => {
    await page
      .getByRole("button", { name: /^Lektion 1: .*hier geht es weiter$/ })
      .click();
    await expect(
      page.getByRole("button", { name: "Zur Übersicht" }),
    ).toBeVisible({ timeout: 1_000 });
  }).toPass();

  // Ab dem ersten Anschlag geht etwas verloren: Die Leiste fragt nach.
  const nav = page.getByRole("navigation", { name: "Hauptnavigation" });
  await page.getByRole("textbox", { name: "Tippfeld" }).press("a");
  await nav.getByRole("link", { name: "Üben", exact: true }).click();
  const dialog = leaveDialog(page);
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("fängt dann wieder von vorn an");
  expect((await analyzeAccessibility(page)).violations).toEqual([]);
  await dialog.getByRole("button", { name: "Weiterüben" }).click();
  await expect(page).toHaveURL(/\/frei\/typing$/);
});
