import { expect, test, type Page } from "./fixtures";
import { analyzeAccessibility } from "./accessibility-helpers";

/**
 * LernBox-Lernformen „Zuordnen“ und mischbare Fragearten mit „Auswahl“
 * (docs/umsetzungsplan-lernbox-lernformen.md, LF-3; Entscheidung 84: „Test“
 * ist darin aufgegangen).
 * Die Reihenfolge der Kacheln und Fragen ist zufällig: Die Tests lesen, was auf
 * dem Bildschirm steht, und schlagen die Lösung in ihrer Vokabelliste nach.
 */

const PAIRS = [
  ["Haus", "house"],
  ["Hund", "dog"],
  ["Baum", "tree"],
  ["Katze", "cat"],
  ["Tisch", "table"],
  ["Stuhl", "chair"],
  ["Buch", "book"],
  ["Auto", "car"],
] as const;
const DECK = "Lernformen";

const english = (german: string) =>
  PAIRS.find(([front]) => front === german)?.[1] ?? "";
/** Gegenstück einer Kachel: zu „Haus“ „house“ und umgekehrt. */
function partner(text: string) {
  const found = PAIRS.find(([front, back]) => front === text || back === text);
  if (!found) throw new Error(`Unbekannte Kachel: ${text}`);
  return found[0] === text ? found[1] : found[0];
}

async function enablePreview(page: Page) {
  await page.context().addCookies([
    {
      name: "lernraum-vorschau",
      value: "1",
      url: test.info().project.use.baseURL ?? "http://localhost:3000",
    },
  ]);
}

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

/** Legt den Stapel mit acht Vokabeln an und lässt die Übersicht offen. */
async function createDeck(page: Page) {
  await enablePreview(page);
  await page.goto("/lernbox");
  await chooseFromPlusMenu(page, /Selbst eintragen/);
  await page
    .getByRole("textbox", { name: "Name des neuen Stapels" })
    .fill(DECK);
  await page.getByRole("button", { name: "Stapel anlegen" }).click();
  await page.getByRole("button", { name: "Schließen" }).click();
  await chooseFromPlusMenu(page, /Viele einfügen/);
  await page.getByRole("button", { name: "Einfügen oder Datei" }).click();
  await page
    .getByRole("textbox", { name: "Vokabeln zum Importieren" })
    .fill(PAIRS.map(([front, back]) => `${front};${back}`).join("\n"));
  await page.getByRole("button", { name: "Vorschau ansehen" }).click();
  await expect(page.getByText("8 Vokabeln erkannt")).toBeVisible();
  await page.getByRole("button", { name: "Übernehmen" }).click();
  await expect(page.getByRole("status")).toHaveText("8 Vokabeln importiert.");
  await page.getByRole("button", { name: "Schließen" }).click();
}

async function openStart(page: Page) {
  await page.getByRole("button", { name: new RegExp(DECK) }).click();
  return page.getByRole("dialog", { name: DECK });
}

async function startForm(page: Page, form: "Zuordnen") {
  const sheet = await openStart(page);
  await sheet.getByRole("button", { name: form, exact: true }).click();
  await sheet.getByRole("button", { name: "Los geht's" }).click();
}

/**
 * Startet eine Runde mit den gewählten Fragearten. Der erste Tipp ersetzt die
 * Vorgabe, jeder weitere nimmt eine Art dazu.
 */
async function startKinds(page: Page, kinds: readonly string[]) {
  const sheet = await openStart(page);
  for (const kind of kinds) {
    await sheet.getByRole("button", { name: kind, exact: true }).click();
  }
  for (const kind of kinds) {
    await expect(
      sheet.getByRole("button", { name: kind, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  }
  await sheet.getByRole("button", { name: "Los geht's" }).click();
}

const tiles = (page: Page) =>
  page.getByRole("group", { name: /Kacheln/ }).getByRole("button");

/** Löst alle offenen Paare der laufenden Runde. */
async function solveRound(page: Page) {
  for (;;) {
    const count = await tiles(page).count();
    if (count === 0) return;
    const first = (await tiles(page).first().innerText()).trim();
    await tiles(page).getByText(first, { exact: true }).first().click();
    await tiles(page).getByText(partner(first), { exact: true }).click();
    await expect(tiles(page)).toHaveCount(count - 2);
  }
}

/** Frage lesen und Lösung nachschlagen. */
async function currentQuestion(page: Page) {
  const prompt = (
    await page.getByRole("heading", { level: 2 }).innerText()
  ).trim();
  return { prompt, solution: english(prompt) };
}

const choiceGroup = (page: Page) =>
  page.getByRole("group", { name: /Wähle die passende/ });
const boxes = (page: Page) => page.getByRole("img", { name: /Boxverteilung/ });
const done = (page: Page) =>
  page.getByRole("heading", { name: "Gut gearbeitet" });

/**
 * Beantwortet jede Karte richtig, bis die Runde endet. Zählt, wie viele Karten
 * als Auswahl und wie viele als Schreibfrage kamen.
 */
async function playRound(page: Page) {
  const counted = { choice: 0, writing: 0 };
  for (let step = 0; step < 20; step += 1) {
    const field = page.getByRole("textbox", { name: "Deine Antwort" });
    await expect(done(page).or(choiceGroup(page)).or(field)).toBeVisible();
    if (await done(page).isVisible()) return counted;
    const { solution } = await currentQuestion(page);
    if (await choiceGroup(page).isVisible()) {
      counted.choice += 1;
      await page.getByRole("radio", { name: solution, exact: true }).check();
      await page.getByRole("button", { name: /^Prüfen/ }).click();
      // Rückmeldung nach jeder Karte; Auswahl verschiebt nichts (LF-3).
      await expect(page.getByText(/Box 1 bleibt · nur geübt/)).toBeVisible();
    } else {
      counted.writing += 1;
      await field.fill(solution);
      await field.press("Enter");
    }
    await expect(page.getByRole("heading", { name: "Gewusst" })).toBeVisible();
    await page.getByRole("button", { name: /^Weiter/ }).click();
  }
  throw new Error("Die Runde endet nicht.");
}

test("Zuordnen: ganzer Durchlauf mit einem Fehlversuch, ohne Barrierefehler", async ({
  page,
}) => {
  await createDeck(page);
  await startForm(page, "Zuordnen");
  // Acht Karten ergeben zwei Runden zu vier Paaren (4 + 4), also acht Kacheln.
  await expect(tiles(page)).toHaveCount(8);
  expect((await analyzeAccessibility(page)).violations).toEqual([]);

  // Zwei Spalten (LF-2): links Begriffe, rechts Bedeutungen.
  const column = (name: string) =>
    page.getByRole("group", { name, exact: true }).getByRole("button");
  await expect(column("Begriffe")).toHaveCount(4);
  await expect(column("Bedeutungen")).toHaveCount(4);
  // Absichtlich ein falsches Paar: ein Begriff mit einer fremden Bedeutung.
  const first = (await column("Begriffe").first().innerText()).trim();
  const meanings = (await column("Bedeutungen").allInnerTexts()).map((text) =>
    text.trim(),
  );
  const other = meanings.find((text) => text !== partner(first))!;
  await tiles(page).getByText(first, { exact: true }).click();
  expect((await analyzeAccessibility(page)).violations).toEqual([]);
  await tiles(page).getByText(other, { exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Das passt nicht zusammen",
  );
  await expect(tiles(page)).toHaveCount(8);

  await solveRound(page);
  await expect(
    page.getByRole("heading", { name: "Runde 1 von 2 geschafft" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Nächste Runde" }).click();
  await solveRound(page);

  await expect(
    page.getByRole("heading", { name: "Alle Paare gefunden" }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("8 Paare · 1 Fehlversuch");
  expect((await analyzeAccessibility(page)).violations).toEqual([]);

  // Zuordnen ändert nichts: alle acht Karten bleiben in Box 1, der Stapel ist „neu“.
  await page.getByRole("button", { name: "Zur LernBox" }).click();
  await expect(boxes(page)).toHaveAccessibleName(
    "Boxverteilung: Box 1: 8, Box 2: 0, Box 3: 0, Box 4: 0, Box 5: 0",
  );
  await expect(page.getByText("8 neu")).toBeVisible();
});

test("Zuordnen nur mit der Tastatur", async ({ page }) => {
  await createDeck(page);
  await startForm(page, "Zuordnen");
  await expect(tiles(page)).toHaveCount(8);
  const focusedTile = () =>
    page.evaluate(() => {
      const element = document.activeElement;
      return element?.hasAttribute("aria-pressed")
        ? (element.textContent ?? "").trim()
        : null;
    });
  async function tabToTile(wanted?: string) {
    for (let step = 0; step < 40; step += 1) {
      await page.keyboard.press("Tab");
      const text = await focusedTile();
      if (text !== null && (wanted === undefined || text === wanted))
        return text;
    }
    throw new Error("Kachel nicht per Tab erreicht");
  }
  const first = await tabToTile();
  await page.keyboard.press("Enter");
  // Die Partnerkachel liegt irgendwo im Raster: Tab vorwärts, dann zurück zum Rand.
  const wanted = partner(first);
  for (let step = 0; step < 40; step += 1) {
    if ((await focusedTile()) === wanted) break;
    await page.keyboard.press("Tab");
  }
  if ((await focusedTile()) !== wanted) {
    for (let step = 0; step < 40; step += 1) {
      await page.keyboard.press("Shift+Tab");
      if ((await focusedTile()) === wanted) break;
    }
  }
  await page.keyboard.press("Enter");
  await expect(tiles(page)).toHaveCount(6);
  await expect(page.locator(":focus")).toBeVisible();
});

test("Auswahl: Rückmeldung nach jeder Karte, ohne Barrierefehler, keine Box ändert sich", async ({
  page,
}) => {
  await createDeck(page);
  await startKinds(page, ["Auswahl"]);
  await expect(choiceGroup(page)).toBeVisible();
  await expect(page.getByRole("radio")).toHaveCount(4);
  expect((await analyzeAccessibility(page)).violations).toEqual([]);
  // Eine falsche Wahl: „Nicht gewusst“, die Box bleibt trotzdem.
  const { solution } = await currentQuestion(page);
  const labels = await page
    .locator("label", { has: page.getByRole("radio") })
    .allInnerTexts();
  const wrong = labels.map((text) => text.trim()).find((t) => t !== solution)!;
  await page.getByRole("radio", { name: wrong, exact: true }).check();
  await page.getByRole("button", { name: /^Prüfen/ }).click();
  await expect(
    page.getByRole("heading", { name: "Nicht gewusst" }),
  ).toBeVisible();
  await expect(page.getByText(/Box 1 bleibt · nur geübt/)).toBeVisible();
  expect((await analyzeAccessibility(page)).violations).toEqual([]);
  await page.getByRole("button", { name: /^Weiter/ }).click();
  const counted = await playRound(page);
  expect(counted.writing).toBe(0);
  await page.getByRole("button", { name: "Zur LernBox" }).click();
  await expect(boxes(page)).toHaveAccessibleName(
    "Boxverteilung: Box 1: 8, Box 2: 0, Box 3: 0, Box 4: 0, Box 5: 0",
  );
});

test("Gemischt: Schreiben und Auswahl wechseln, nur geschriebene Karten steigen auf", async ({
  page,
}) => {
  await createDeck(page);
  await startKinds(page, ["Auswahl", "Schreiben"]);
  const counted = await playRound(page);
  expect(counted.choice).toBeGreaterThan(0);
  expect(counted.writing).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Zur LernBox" }).click();
  await expect(boxes(page)).toHaveAccessibleName(
    `Boxverteilung: Box 1: ${8 - counted.writing}, Box 2: ${counted.writing}, Box 3: 0, Box 4: 0, Box 5: 0`,
  );
});

test("Touch-Ziele der Kacheln und Antworten sind groß genug", async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"));
  await createDeck(page);
  await startForm(page, "Zuordnen");
  await expect(tiles(page)).toHaveCount(8);
  const noOverflow = () =>
    page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    );
  for (const tile of await tiles(page).all()) {
    const box = (await tile.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  expect(await noOverflow()).toBe(true);

  await page.getByRole("button", { name: "Runde beenden" }).click();
  await page.getByRole("button", { name: "Beenden", exact: true }).click();
  await startKinds(page, ["Auswahl"]);
  await expect(choiceGroup(page)).toBeVisible();
  for (const radio of await page
    .locator("label", {
      has: page.getByRole("radio"),
    })
    .all()) {
    const box = (await radio.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  expect(await noOverflow()).toBe(true);
});

test("Abbruch: „Runde beenden“ fragt nach und lässt nichts zum Weitermachen zurück", async ({
  page,
}) => {
  await createDeck(page);
  await startKinds(page, ["Auswahl", "Schreiben"]);
  await expect(
    choiceGroup(page).or(page.getByRole("textbox", { name: "Deine Antwort" })),
  ).toBeVisible();
  await page.getByRole("button", { name: "Runde beenden" }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Beenden", exact: true }).click();
  await expect(
    page.getByRole("button", { name: new RegExp(DECK) }),
  ).toBeVisible();
  await expect(page.getByText("Weitermachen")).toHaveCount(0);
});
