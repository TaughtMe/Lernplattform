import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { createBox } from "./wortspeicher-helpers";

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];

/** Axe ohne Verstöße und kein waagrechtes Scrollen (auch bei 320 px). */
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

async function answer(page: Page, text: string) {
  const field = page.getByLabel("Deine Lösung");
  await field.fill(text);
  await field.press("Enter");
}

test("Wortbox anlegen, mit Fehler üben, wiederholen und den Bestwert sehen", async ({
  page,
}) => {
  await page.goto("/frei/german/lernwoerter");
  await expect(
    page.getByRole("button", { name: "Neue Wortbox" }),
  ).toBeVisible();
  await expectAccessible(page);

  await createBox(page, "Meine Wörter", ["Schulweg", "Sonne", "Mutter"]);
  await expect(
    page.getByRole("button", { name: /^Meine Wörter/ }),
  ).toContainText("Noch nicht geübt");

  // Startblatt: sechs Stufen sind noch ohne Bestwert, hier fünf (Stufe 6 folgt mit Paket C).
  await page.getByRole("button", { name: /^Meine Wörter/ }).click();
  const sheet = page.getByRole("dialog", { name: "Meine Wörter" });
  await expect(
    sheet.getByRole("button", { name: /Bestwert –/ }).first(),
  ).toBeVisible();
  await expectAccessible(page);
  await sheet.getByRole("button", { name: /^Stufe 1:/ }).click();
  await sheet.getByLabel("Wörter in dieser Runde").selectOption("all");
  await sheet.getByRole("button", { name: "Starten" }).click();

  // Wort 1 mit absichtlichem Fehler.
  await expect(page.getByLabel("Deine Lösung")).toBeFocused();
  await expectAccessible(page);
  await answer(page, "Schulwek");
  await expect(
    page.getByRole("heading", { name: "Noch nicht sicher" }),
  ).toBeVisible();
  await expect(
    page.getByRole("list", { name: "Das ist anders" }),
  ).toContainText("8. Buchstabe: k statt g");
  await expectAccessible(page);
  await page.getByRole("button", { name: "Noch einmal versuchen" }).click();
  await answer(page, "Schulweg");
  await expect(page.getByRole("status")).toContainText("Richtig");
  await expect(page.getByLabel("Deine Lösung")).toBeVisible({ timeout: 3_000 });
  await answer(page, "Sonne");
  await expect(page.getByLabel("Deine Lösung")).toBeVisible({ timeout: 3_000 });
  await answer(page, "Mutter");

  await expect(page.getByRole("heading", { name: "Geschafft!" })).toBeVisible({
    timeout: 3_000,
  });
  await expect(page.getByText("67 %")).toBeVisible();
  await expect(
    page.getByText("2 von 3 Wörtern auf Anhieb richtig"),
  ).toBeVisible();
  await expect(page.getByText("Das ist dein erster Bestwert")).toBeVisible();
  await expectAccessible(page);

  // Zweite Runde ohne Fehler: 100 % und neuer Bestwert.
  await page.getByRole("button", { name: "Nochmal üben" }).click();
  for (const word of ["Schulweg", "Sonne", "Mutter"]) {
    await expect(page.getByLabel("Deine Lösung")).toBeVisible({
      timeout: 3_000,
    });
    await answer(page, word);
  }
  await expect(page.getByText("Neuer Bestwert!")).toBeVisible({
    timeout: 3_000,
  });
  await expect(page.getByText("100 %")).toBeVisible();

  // Bestwert im Startblatt und auf der Kachel, auch nach dem Neuladen.
  await page.getByRole("button", { name: "Andere Stufe wählen" }).click();
  await expect(
    page
      .getByRole("dialog", { name: "Meine Wörter" })
      .getByRole("button", { name: /^Stufe 1:.*Bestwert 100 %/ }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: /^Meine Wörter/ }),
  ).toContainText("Stufe 1 · Bestwert 100 %");
});

test("Wortliste: feste Wortbox kopieren, Wörter ändern und löschen", async ({
  page,
}) => {
  await page.goto("/frei/german/lernwoerter");
  await page
    .getByRole("button", { name: "Wortliste von Doppelkonsonanten" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Doppelkonsonanten" }),
  ).toBeVisible();
  await expectAccessible(page);
  await page
    .getByRole("button", { name: "Als eigene Wortbox kopieren" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Doppelkonsonanten (Kopie)" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "‚Affe‘ ändern" }).click();
  const edit = page.getByRole("textbox", { name: "‚Affe‘ ändern zu" });
  await edit.fill("Affen");
  await edit.press("Enter");
  await expect(page.getByText("Affen", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "‚Affen‘ löschen" }).click();
  await expect(page.getByText("Affen", { exact: true })).toHaveCount(0);
  await expectAccessible(page);

  await page.getByRole("button", { name: "Wortbox löschen" }).click();
  await page.getByRole("button", { name: "Ja, Wortbox löschen" }).click();
  await expect(
    page.getByRole("button", { name: /^Doppelkonsonanten \(Kopie\)/ }),
  ).toHaveCount(0);
});

test("Stufe 5 wertet je Wort und zeigt den Merkblock", async ({ page }) => {
  await createBox(page, "Blockbox", ["Ball", "Haus", "Baum"]);
  await page.getByRole("button", { name: /^Blockbox/ }).click();
  const sheet = page.getByRole("dialog", { name: "Blockbox" });
  await sheet.getByRole("button", { name: /^Stufe 5:/ }).click();
  await sheet.getByLabel("Wörter in dieser Runde").selectOption("all");
  await sheet.getByLabel("Wörter pro Merkblock").selectOption("3");
  await sheet.getByRole("button", { name: "Starten" }).click();
  await expect(page.getByText("Ball", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Wörter verdecken" }).click();
  const field = page.getByLabel("Deine Lösung");
  await field.fill("Ball\nHaus\nBaun");
  await field.press("Enter");
  await expect(page.getByText("Noch nicht: Baum")).toBeVisible();
  await expectAccessible(page);
});

/** Baut `speechSynthesis` nach; `voices` bestimmt, ob es eine deutsche Stimme gibt. */
async function fakeSpeech(page: Page, hasVoice: boolean) {
  await page.addInitScript((withVoice: boolean) => {
    const voices = withVoice
      ? [
          {
            name: "Anna (Premium)",
            lang: "de-DE",
            voiceURI: "anna",
            default: true,
          },
        ]
      : [];
    const spoken: { text: string; volume: number; voice: boolean }[] = [];
    (window as unknown as { __spoken: typeof spoken }).__spoken = spoken;
    class FakeUtterance {
      text: string;
      lang = "";
      voice: unknown = null;
      rate = 1;
      volume = 1;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    }
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      value: FakeUtterance,
      configurable: true,
    });
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        speaking: false,
        pending: false,
        getVoices: () => voices,
        addEventListener() {},
        removeEventListener() {},
        cancel() {},
        speak(utterance: FakeUtterance) {
          spoken.push({
            text: utterance.text,
            volume: utterance.volume,
            voice: utterance.voice !== null,
          });
          setTimeout(() => utterance.onend?.(), 5);
        },
      },
    });
  }, hasVoice);
}

test("Stufe 6: Stimme wird vorbereitet, das erste Wort ist hörbar, gleich klingendes Wort wird erklärt", async ({
  page,
}) => {
  await fakeSpeech(page, true);
  await createBox(page, "Hörbox", ["Rad", "Sonne"]);
  await page.getByRole("button", { name: /^Hörbox/ }).click();
  const sheet = page.getByRole("dialog", { name: "Hörbox" });
  const stageSix = sheet.getByRole("button", { name: /^Stufe 6:/ });
  await expect(stageSix).toBeEnabled();
  await stageSix.click();
  await sheet.getByLabel("Wörter in dieser Runde").selectOption("all");
  await sheet.getByRole("button", { name: "Starten" }).click();

  await expect(page.getByRole("button", { name: "Anhören" })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as unknown as { __spoken: { text: string }[] }).__spoken.map(
          (entry) => entry.text,
        ),
      ),
    )
    .toEqual([" ", "Rad"]);
  const spoken = await page.evaluate(
    () =>
      (window as unknown as { __spoken: { volume: number; voice: boolean }[] })
        .__spoken,
  );
  expect(spoken[0]).toMatchObject({ volume: 0, voice: true });
  expect(spoken[1]).toMatchObject({ voice: true });
  await expect(page.getByText("Bedeutung: zum Fahren")).toBeVisible();
  await expectAccessible(page);

  await answer(page, "Rat");
  await expect(
    page.getByText("Das klingt genauso. Gemeint war ‚Rad‘ (zum Fahren)."),
  ).toBeVisible();
  await expectAccessible(page);
});

test("Stufe 6 ist ohne deutsche Stimme deaktiviert", async ({ page }) => {
  await fakeSpeech(page, false);
  await createBox(page, "Stummbox", ["Rad"]);
  await page.getByRole("button", { name: /^Stummbox/ }).click();
  const stageSix = page
    .getByRole("dialog", { name: "Stummbox" })
    .getByRole("button", { name: /^Stufe 6:/ });
  await expect(stageSix).toBeDisabled({ timeout: 5_000 });
  await expect(stageSix).toContainText(
    "Auf diesem Gerät gibt es keine deutsche Stimme.",
  );
  await expectAccessible(page);
});

test("Verlauf, Fortschrittsseite und Laufzettel zeigen die Runde", async ({
  page,
}) => {
  await page.goto("/lernen/fortschritt");
  await expect(page.getByText("Noch keine Wörter geübt")).toBeVisible();
  await expectAccessible(page);

  await createBox(page, "Lernbox", ["Sonne"]);
  await page.getByRole("button", { name: /^Lernbox/ }).click();
  const sheet = page.getByRole("dialog", { name: "Lernbox" });
  await sheet.getByLabel("Wörter in dieser Runde").selectOption("all");
  await sheet.getByRole("button", { name: "Starten" }).click();
  await answer(page, "Sonne");
  await expect(page.getByRole("heading", { name: "Geschafft!" })).toBeVisible({
    timeout: 3_000,
  });
  await page.getByRole("button", { name: "Verlauf ansehen" }).click();
  await expect(
    page.getByRole("heading", { name: "Verlauf: Lernbox" }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: /ein Wert, 100 Prozent/ }),
  ).toBeVisible();
  await expectAccessible(page);
  await page.getByRole("button", { name: "Säulen" }).click();
  await expectAccessible(page);

  await page.goto("/lernen/fortschritt");
  const section = page.getByRole("region", { name: "Wortspeicher" });
  await expect(section).toContainText("Trainierte Wörter");
  await expect(section).toContainText("Abgeschlossene Runden");
  await expectAccessible(page);

  await page.goto("/frei/german/lernwoerter/laufzettel");
  const table = page.getByRole("table");
  await expect(table).toContainText("Lernbox");
  await expect(table).toContainText("100 %");
  await page.getByLabel(/Name oder Kennung/).fill("Mia M.");
  await expect(page.getByTestId("worksheet-name")).toHaveText("Mia M.");
  await expectAccessible(page);
});
