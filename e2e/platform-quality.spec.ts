import { expect, test, type Page } from "@playwright/test";
import {
  createEnrollmentCode,
  createEnrollmentLink,
} from "../src/domain/class-enrollment";
import { createTeacherAssignmentCode } from "../src/domain/teacher-workspace";
import { analyzeAccessibility } from "./accessibility-helpers";
import { createBox, startRound } from "./wortspeicher-helpers";

// Die Demo-Klasse 7b ist Testgelände und nur mit Vorschau sichtbar (Bereich
// `demo-klasse`); die Tests, die sie aufrufen, schalten die Vorschau ein.
async function enablePreview(page: Page) {
  await page.context().addCookies([
    {
      name: "lernraum-vorschau",
      value: "1",
      url: test.info().project.use.baseURL ?? "http://localhost:3000",
    },
  ]);
}

function isKnownFrameworkDiagnostic(message: string) {
  return (
    message.includes("<link rel=preload> must have a valid `as` value") ||
    // `app/layout.tsx` setzt `interactive-widget` bewusst für Chrome auf
    // Android. WebKit kennt den Schlüssel nicht und meldet das als Fehler,
    // ignoriert ihn aber folgenlos.
    message ===
      'Viewport argument key "interactive-widget" not recognized and ignored.'
  );
}

test("start page exposes the core learner actions", async ({ page }) => {
  await page.goto("/");

  const animal = page.getByRole("link", { name: /^Weiter als / });
  await expect(animal).toHaveAttribute("href", "/lernen");
  await expect(
    page.getByRole("heading", { level: 1, name: /^Weiter als / }),
  ).toBeVisible();
  await expect(page.getByRole("group", { name: "Raumcode" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "QR-Code mit Kamera scannen" }),
  ).toBeVisible();

  // Design 2a: großes Tier oben, Raumcode darunter.
  const discBox = await animal.boundingBox();
  const joinBox = await page
    .getByRole("group", { name: "Raumcode" })
    .boundingBox();
  // Seit e6abfa7 misst die Scheibe min(288 px, 29 dvh), damit Impressum und
  // Datenschutz auf der Startseite ohne Scrollen sichtbar bleiben.
  const viewportHeight = await page.evaluate(() => window.innerHeight);
  expect(discBox?.width ?? 0).toBeCloseTo(
    Math.min(288, viewportHeight * 0.29),
    0,
  );
  expect(discBox?.width ?? 0).toBeGreaterThanOrEqual(180);
  expect(joinBox?.y ?? 0).toBeGreaterThan(
    (discBox?.y ?? 0) + (discBox?.height ?? 0),
  );
});

test("layout never scrolls horizontally", async ({ page }) => {
  await page.goto("/");

  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));

  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
});

test("primary pages have no automatically detectable WCAG A/AA violations", async ({
  page,
}) => {
  test.setTimeout(60_000);
  for (const path of [
    "/",
    "/lernen",
    "/lernen/material",
    "/lernen/fortschritt",
    "/lernen/aufgaben",
    "/lernen/klasse",
    "/frei",
    "/frei/german",
    "/frei/german/laufdiktat",
    "/frei/german/lernwoerter",
    "/frei/mathematics",
    "/lernbox",
    "/raum",
    "/lehrer",
    "/lehrer/live",
    "/lehrer/klassen",
    "/lehrer/material",
    "/lehrer/aufgaben",
    "/lehrer/einstellungen",
  ]) {
    await page.goto(path);
    const results = await analyzeAccessibility(page);

    expect(results.violations, `Accessibility violations on ${path}`).toEqual(
      [],
    );
  }
});

test("the demo class has no automatically detectable WCAG A/AA violations", async ({
  page,
}) => {
  await enablePreview(page);
  await page.goto("/klasse/7b");
  const results = await analyzeAccessibility(page);

  expect(results.violations, "Accessibility violations on /klasse/7b").toEqual(
    [],
  );
});

test("mobile learners retain direct access to their personal learning room", async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"));
  await page.goto("/");
  // Startseite 2a: Das eigene Tier führt direkt in den Lernraum.
  const room = page.getByRole("link", { name: /^Weiter als / });
  await expect(room).toBeVisible();
  await expect(room).toHaveAttribute("href", "/lernen");
});

/** Öffnet das Plus-Menü; Klicks vor der Hydration gehen verloren, daher wiederholen. */
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

async function createLernBoxDeck(page: Page, name: string) {
  await chooseFromPlusMenu(page, /Selbst eintragen/);
  await page
    .getByRole("textbox", { name: "Name des neuen Stapels" })
    .fill(name);
  await page.getByRole("button", { name: "Stapel anlegen" }).click();
}

test("the native LernBox creates a deck, adds a word and opens the start sheet", async ({
  page,
}) => {
  const runtimeErrors: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      !isKnownFrameworkDiagnostic(message.text())
    ) {
      runtimeErrors.push(message.text());
    }
  });
  await page.goto("/lernbox");
  await expect(page.locator("iframe")).toHaveCount(0);

  await createLernBoxDeck(page, "Englisch 7b");
  await page.getByRole("textbox", { name: "Deutsch" }).fill("Haus");
  await page.getByRole("textbox", { name: "Englisch" }).fill("house");
  await page.getByRole("button", { name: "Speichern und nächste" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "„Haus“ gespeichert · Box 1",
  );
  await page.getByRole("button", { name: "Fertig" }).click();

  await expect.poll(() => runtimeErrors).toEqual([]);
  await expect(page.getByText("Englisch 7b", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Englisch 7b/ }).click();
  await expect(page.getByRole("button", { name: "Los geht's" })).toBeVisible();
});

test("a downloaded LernBox backup restores a deleted deck", async ({
  page,
}) => {
  await page.goto("/lernbox");
  await createLernBoxDeck(page, "Sicherungsprobe");
  await page.getByRole("button", { name: "Schließen" }).click();
  await expect(
    page.getByRole("button", { name: /Sicherungsprobe/ }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Bearbeiten", exact: true }).click();
  await page.getByText("Stapel, Ordner und Sicherung").click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Sicherung speichern" }).click();
  const download = await downloadPromise;
  const backupPath = await download.path();
  expect(backupPath).not.toBeNull();

  await page.getByRole("button", { name: "Sicherungsprobe löschen" }).click();
  await expect(
    page.getByRole("button", { name: "Sicherungsprobe löschen" }),
  ).toHaveCount(0);

  await page
    .locator('input[type="file"][accept="application/json"]')
    .setInputFiles(backupPath!);
  await expect(page.getByRole("status")).toHaveText(
    "Sicherung wurde importiert.",
  );
  await expect(
    page.getByRole("button", { name: "Sicherungsprobe löschen" }),
  ).toBeVisible();
});

test("the LernBox start page offers a tile for a new deck", async ({
  page,
}) => {
  await page.goto("/lernbox");
  const tile = page.getByRole("button", { name: "Neuer Stapel", exact: true });
  await expect(async () => {
    await tile.click();
    await expect(
      page.getByRole("textbox", { name: "Name des neuen Stapels" }),
    ).toBeVisible({ timeout: 1_000 });
  }).toPass();
  await page
    .getByRole("textbox", { name: "Name des neuen Stapels" })
    .fill("Kachelprobe");
  await page.getByRole("button", { name: "Stapel anlegen" }).click();
  await expect(page.getByRole("button", { name: /Kachelprobe/ })).toBeVisible();
});

test("a box can be practised without moving its words", async ({ page }) => {
  await page.goto("/lernbox");
  await createLernBoxDeck(page, "Boxprobe");
  await page.getByRole("textbox", { name: "Deutsch" }).fill("Haus");
  await page.getByRole("textbox", { name: "Englisch" }).fill("house");
  await page.getByRole("button", { name: "Speichern und nächste" }).click();
  await page.getByRole("button", { name: "Fertig" }).click();
  await expect(async () => {
    await page.getByRole("button", { name: /^Box 1: .* üben$/ }).click();
    await expect(page.getByRole("button", { name: "Los geht's" })).toBeVisible({
      timeout: 1_000,
    });
  }).toPass();
  await page.getByRole("button", { name: "Los geht's" }).click();
  await page.getByRole("textbox", { name: "Deine Antwort" }).fill("house");
  await page.getByRole("button", { name: /Prüfen/ }).click();
  await expect(page.getByText("Box 1 bleibt · nur geübt")).toBeVisible();
});

test("the LernBox imports, filters and practises words", async ({ page }) => {
  await page.goto("/lernbox");
  await createLernBoxDeck(page, "Importprobe");
  await page.getByRole("button", { name: "Schließen" }).click();
  await chooseFromPlusMenu(page, /Viele einfügen/);
  await page.getByRole("button", { name: "Einfügen oder Datei" }).click();
  await page
    .getByRole("textbox", { name: "Vokabeln zum Importieren" })
    .fill(
      "Vorderseite;Rückseite;Tag\nHaus\thome | house\tNomen\nlaufen;to run;Verben",
    );
  await page.getByRole("button", { name: "Vorschau ansehen" }).click();
  await expect(page.getByText("2 Vokabeln erkannt")).toBeVisible();
  await page.getByRole("button", { name: "Übernehmen" }).click();
  await expect(page.getByRole("status")).toHaveText("2 Vokabeln importiert.");
  await page.getByRole("button", { name: "Schließen" }).click();

  await page.getByRole("button", { name: "Bearbeiten", exact: true }).click();
  await page
    .getByRole("searchbox", { name: "Vokabeln durchsuchen" })
    .fill("verben");
  await expect(
    page.getByRole("button", { name: "laufen bearbeiten" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Haus bearbeiten" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "LernBox", exact: true }).click();

  await page.getByRole("button", { name: /Importprobe/ }).click();
  await page.getByRole("button", { name: "Los geht's" }).click();
  await expect(page.getByRole("heading", { level: 2 })).toBeVisible();
  const question = (
    await page.getByRole("heading", { level: 2 }).innerText()
  ).trim();
  await page
    .getByRole("textbox", { name: "Deine Antwort" })
    .fill(question === "laufen" ? "to run" : "home");
  await page.getByRole("button", { name: /Prüfen/ }).click();
  await expect(page.getByRole("heading", { name: "Gewusst" })).toBeVisible();
  await page.getByRole("button", { name: "Weiter" }).click();
  await page.getByRole("button", { name: "Runde beenden" }).click();
  await expect(page.getByRole("heading", { name: "LernBox" })).toBeVisible();
});

test("typed words show a preview and are saved only after Übernehmen", async ({
  page,
}) => {
  await page.goto("/lernbox");
  await createLernBoxDeck(page, "Tipp-Import");
  await page.getByRole("button", { name: "Schließen" }).click();
  await chooseFromPlusMenu(page, /Viele einfügen/);
  await page
    .getByRole("textbox", { name: "Vorderseite, Zeile 1" })
    .fill("Haus");
  await page.getByRole("textbox", { name: "Rückseite, Zeile 1" }).fill("house");
  await page
    .getByRole("textbox", { name: "Rückseite, Zeile 1" })
    .press("Enter");
  await expect(
    page.getByRole("textbox", { name: "Vorderseite, Zeile 2" }),
  ).toBeFocused();
  await page
    .getByRole("textbox", { name: "Vorderseite, Zeile 2" })
    .fill("Baum");
  await page.getByRole("button", { name: "Vorschau ansehen" }).click();
  await expect(page.getByText("1 Vokabel erkannt")).toBeVisible();
  await expect(page.getByText("Zeile 2: Rückseite leer")).toBeVisible();
  await page.getByRole("button", { name: "Übernehmen" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "1 Vokabel importiert · Zeile 2 übersprungen.",
  );
});

test("many imported words give a portion of at most 20 and 'Weiterlernen' starts it in the module", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const today = new Date();
  // Der Plan eines Tages entsteht beim ersten Öffnen einer Lernseite und bleibt
  // dann stehen. Die Vokabeln werden daher „gestern“ importiert; heute kommen
  // sie als neue Aufgaben in die Portion.
  await page.clock.setFixedTime(new Date(today.getTime() - 24 * 3_600_000));
  await page.goto("/lernbox");
  await createLernBoxDeck(page, "Mengenprobe");
  await page.getByRole("button", { name: "Schließen" }).click();
  await chooseFromPlusMenu(page, /Viele einfügen/);
  await page.getByRole("button", { name: "Einfügen oder Datei" }).click();
  await page
    .getByRole("textbox", { name: "Vokabeln zum Importieren" })
    .fill(
      Array.from(
        { length: 150 },
        (_, index) => `Wort${index}\tword${index}`,
      ).join("\n"),
    );
  await page.getByRole("button", { name: "Vorschau ansehen" }).click();
  await expect(page.getByText("150 Vokabeln erkannt")).toBeVisible();
  await page.getByRole("button", { name: "Übernehmen" }).click();
  await expect(page.getByRole("status")).toHaveText("150 Vokabeln importiert.");

  // Heute: Die Startseite zeigt die Portion, nicht die 150 Vokabeln.
  await page.clock.setFixedTime(today);
  await page.goto("/lernen");
  await expect(page.getByText("0 von 10 Aufgaben heute")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("150");
  expect((await analyzeAccessibility(page)).violations).toEqual([]);

  // „Weiterlernen“ öffnet die Portion im Modul; eine Runde läuft.
  const next = page.getByRole("link", { name: "Weiterlernen" }).last();
  await expect(next).toHaveAttribute("href", "/lernbox?heute=1");
  await next.click();
  const sheet = page.getByRole("dialog", { name: "Heute dran" });
  await expect(sheet).toBeVisible();
  // Die Richtung kommt aus der Portion: keine Richtungswahl.
  await expect(sheet.getByRole("group", { name: "Richtung" })).toHaveCount(0);
  await sheet.getByRole("button", { name: "Mündlich" }).click();
  await sheet.getByRole("button", { name: "Los geht's" }).click();
  await expect(page.getByText(/10 übrig/)).toBeVisible();
  expect((await analyzeAccessibility(page)).violations).toEqual([]);
  await page.getByRole("button", { name: "Antwort zeigen" }).click();
  await page.getByRole("button", { name: "Gewusst", exact: true }).click();
  await expect(page.getByText(/9 übrig/)).toBeVisible();

  // Die beantwortete Aufgabe zählt in der Portion.
  await page.getByRole("button", { name: "Runde beenden" }).click();
  await page.goto("/lernen");
  await expect(page.getByText("1 von 10 Aufgaben heute")).toBeVisible();
});

test("math and learning words say when the portion for today is done", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const done = "Dein Teil für heute ist geschafft. Du kannst frei weiterüben.";
  // Ohne Lernstand ist die Portion leer: Beide Module sagen es und bleiben frei.
  for (const path of [
    "/frei/mathematics?heute=1",
    "/frei/german/lernwoerter?heute=1",
  ]) {
    await page.goto(path);
    await expect(page.getByText(done)).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const results = await analyzeAccessibility(page);
    expect(results.violations, `Accessibility violations on ${path}`).toEqual(
      [],
    );
  }
});

test("the typing world lists every lesson and starts the current one", async ({
  page,
}) => {
  await page.goto("/frei/typing");
  await expect(page.getByText(/^0 von \d+ Stationen geschafft$/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^Lektion 2: .*noch gesperrt$/ }),
  ).toBeDisabled();
  // Vor dem Laden der Seite gehen Klicks verloren; bis zur Übung wiederholen.
  await expect(async () => {
    await page
      .getByRole("button", { name: /^Lektion 1: .*hier geht es weiter$/ })
      .click();
    await expect(
      page.getByRole("button", { name: "Zur Übersicht" }),
    ).toBeVisible({
      timeout: 1_000,
    });
  }).toPass();
});

test("a native Laufdiktat mistake becomes due LernBox practice", async ({
  page,
}) => {
  await page.goto("/frei/german/laufdiktat");
  await expect(page.locator("iframe")).toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: "Hauptnavigation" }),
  ).toBeAttached();
  const vocabularyMode = page.getByRole("button", { name: "Vokabeln" });
  await vocabularyMode.click();
  await expect(vocabularyMode).toHaveAttribute("aria-pressed", "true");
  const source = page.getByRole("textbox", {
    name: /Vokabeln – eine Zeile pro Paar/,
  });
  await source.fill("library;Bibliothek");
  await page.getByRole("button", { name: "Laufdiktat starten" }).click();

  await expect(page.getByRole("heading", { name: "library" })).toBeVisible();
  await page
    .getByRole("button", { name: "Verstanden – jetzt schreiben" })
    .click();
  await page.getByRole("textbox", { name: "Deine Antwort" }).fill("Bücherei");
  await page.getByRole("button", { name: "Prüfen" }).click();
  await expect(
    page.getByRole("heading", { name: "Noch nicht richtig" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Noch einmal versuchen" }).click();
  await page
    .getByRole("button", { name: "Verstanden – jetzt schreiben" })
    .click();
  await page.getByRole("textbox", { name: "Deine Antwort" }).fill("Bibliothek");
  await page.getByRole("button", { name: "Prüfen" }).click();
  await page.getByRole("button", { name: "Runde abschließen" }).click();

  await expect(
    page.getByText("1 Vokabeln sind jetzt in deiner LernBox fällig."),
  ).toBeVisible();
  await page.getByRole("link", { name: "Meine Fehler jetzt üben" }).click();
  await expect(
    page.getByRole("heading", { name: "Fehler aus Laufdiktat" }),
  ).toBeVisible();
});

test("the learning-word path can be tried without an account", async ({
  page,
}) => {
  await createBox(page, "Schulweg-Box", ["Schulweg"]);
  await startRound(page, "Schulweg-Box", 4);

  await expect(page.getByText("Schulweg", { exact: true })).toBeVisible();
  const reveal = page.getByRole("button", { name: "Wörter verdecken" });
  await expect(reveal).toBeFocused();
  await page.keyboard.press("Enter");
  const answer = page.getByRole("textbox", { name: "Deine Lösung" });
  await expect(answer).toBeFocused();
  await expect(page.locator("i[data-active]")).toHaveCount(8);
  await answer.fill("Schulweck");
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Noch nicht sicher" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Noch einmal versuchen" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(reveal).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(answer).toBeFocused();
  await answer.fill("Schulweg");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toContainText("Richtig");
  await expect(page.getByRole("heading", { name: "Geschafft!" })).toBeVisible({
    timeout: 3_000,
  });

  await page.getByRole("button", { name: "Andere Stufe wählen" }).click();
  const sheet = page.getByRole("dialog", { name: "Schulweg-Box" });
  const stageTwo = sheet.getByRole("button", { name: /^Stufe 2:/ });
  await stageTwo.click();
  await expect(stageTwo).toHaveAttribute("aria-pressed", "true");
  await sheet.getByRole("button", { name: "Starten" }).click();
  const directAnswer = page.getByRole("textbox", { name: "Deine Lösung" });
  await expect(directAnswer).toBeFocused();
  await directAnswer.fill("Schulweg");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toContainText("Richtig");
  await expect(page.getByRole("heading", { name: "Geschafft!" })).toBeVisible({
    timeout: 3_000,
  });
});

test("large German word banks create manageable learning rounds", async ({
  page,
}) => {
  await page.goto("/frei/german/lernwoerter");
  await page.getByRole("button", { name: /^Merkwörter & Fremdwörter/ }).click();
  const sheet = page.getByRole("dialog", { name: "Merkwörter & Fremdwörter" });
  await expect(sheet.getByLabel("Wörter in dieser Runde")).toHaveValue("10");
  await sheet.getByRole("button", { name: "Starten" }).click();
  const progress = page.getByRole("progressbar", {
    name: "Fortschritt der Runde",
  });
  await expect(progress).toHaveAttribute("aria-valuemax", "10");
  await expect(progress).toHaveAttribute("aria-valuenow", "1");
  await expect(
    page.getByRole("textbox", { name: "Deine Lösung" }),
  ).toBeFocused();
});

test("a learning result survives a page reload on the same device", async ({
  page,
}) => {
  await enablePreview(page);
  await page.goto("/klasse/7b/aufgaben/vokabeln");
  await page.getByRole("button", { name: "Lernrunde starten" }).click();
  await page.getByRole("textbox", { name: "Deine Antwort" }).fill("Bibliothek");
  await page.getByRole("button", { name: "Antwort prüfen" }).click();

  await expect(
    page.getByRole("heading", { name: "Richtig gelöst" }),
  ).toBeVisible();
  await expect(page.getByLabel("Bedeutung: Box 2 von 5")).toBeVisible();
  await expect(page.getByLabel("Schreiben: Box 2 von 5")).toBeVisible();
  await expect(
    page.locator(".ui-stats").getByText("1", { exact: true }),
  ).toBeVisible();

  await page.reload();
  await expect(page.getByText("Versuche")).toBeVisible();
  await expect(page.getByLabel("Bedeutung: Box 2 von 5")).toBeVisible();
  await expect(page.getByLabel("Schreiben: Box 2 von 5")).toBeVisible();
  await expect(
    page.locator(".ui-stats").getByText("1", { exact: true }),
  ).toBeVisible();
});

test("a vocabulary session advances through several due cards", async ({
  page,
}) => {
  await enablePreview(page);
  await page.goto("/klasse/7b/aufgaben/vokabeln");
  await expect(page.getByText("5 von 5 Karten fällig")).toBeVisible();
  await page.getByRole("button", { name: "Lernrunde starten" }).click();
  await expect(page.getByLabel("Karte 1 von 5")).toBeVisible();

  await page.getByRole("textbox", { name: "Deine Antwort" }).fill("Bibliothek");
  await page.getByRole("button", { name: "Antwort prüfen" }).click();
  await page.getByRole("button", { name: "Nächste Karte" }).click();

  await expect(page.getByLabel("Karte 2 von 5")).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "classroom" }),
  ).toBeVisible();
});

test("vocabulary can be written in the reverse direction", async ({ page }) => {
  await enablePreview(page);
  await page.goto("/klasse/7b/aufgaben/vokabeln");
  const reverseDirection = page.getByRole("button", {
    name: "Deutsch → Englisch",
  });
  await reverseDirection.click();
  await expect(reverseDirection).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Lernrunde starten" }).click();

  await expect(
    page.getByRole("heading", { level: 2, name: "Bibliothek" }),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "Deine Antwort" }).fill("library");
  await page.getByRole("button", { name: "Antwort prüfen" }).click();
  await expect(
    page.getByRole("heading", { name: "Richtig gelöst" }),
  ).toBeVisible();
});

test("flashcard mode reveals and self-assesses an answer", async ({ page }) => {
  await enablePreview(page);
  await page.goto("/klasse/7b/aufgaben/vokabeln");
  const flashcards = page.getByRole("button", { name: /Karteikarten/ });
  await flashcards.click();
  await expect(flashcards).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Lernrunde starten" }).click();
  await page.getByRole("button", { name: "Antwort aufdecken" }).click();

  await expect(page.getByText("Bibliothek", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Gewusst" }).click();
  await expect(
    page.getByRole("heading", { name: "Richtig gelöst" }),
  ).toBeVisible();
  await expect(page.getByLabel("Schreiben: Box 1 von 5")).toBeVisible();
});

test("dark mode is stored and the Leitner view stays accessible", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("theme-preference", "dark");
  });
  await page.goto("/lernen");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  // Dunkelmodus-Tokens aus Entscheidung 47 (Design „Lernraum UI“).
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(23, 21, 15)",
  );

  await enablePreview(page);
  await page.goto("/klasse/7b");
  const classContent = page.getByRole("region", {
    name: "Inhalte aus dieser Klasse",
  });
  await expect(classContent).toHaveCSS("background-color", "rgb(34, 31, 27)");
  const moduleTag = classContent.locator(".ui-pill").first();
  // Dunkelmodus-Tokens aus Entscheidung 47 (Design „Lernraum UI“).
  await expect(moduleTag).toHaveCSS("background-color", "rgb(47, 43, 37)");
  await expect(moduleTag).toHaveCSS("color", "rgb(168, 158, 140)");

  await enablePreview(page);
  await page.goto("/klasse/7b/aufgaben/vokabeln");
  await expect(page.getByText("Deine Lernbox")).toBeVisible();
  await expect(page.getByLabel("Bedeutung: Box 1 von 5")).toBeVisible();
  await expect(page.getByLabel("Schreiben: Box 1 von 5")).toBeVisible();

  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);

  const results = await analyzeAccessibility(page);
  expect(results.violations).toEqual([]);
});

test("class content remains part of the personal learning room", async ({
  page,
}) => {
  await enablePreview(page);
  await page.goto("/klasse/7b");
  await expect(
    page.getByText(/Sie führt keinen zweiten Lernstand/),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Im persönlichen Lernraum üben" }),
  ).toHaveAttribute("href", "/lernen");
});

test("the personal learning room keeps today's task focused and separates supporting areas", async ({
  page,
}) => {
  await page.goto("/lernen");

  // Design 3a/3b: das Tier in der Mitte, ein Haupt-Knopf (frisches Gerät: „Loslegen“, D5-2).
  await expect(
    page.getByRole("link", { name: "Loslegen" }).last(),
  ).toBeVisible();
  const layout = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(layout.content).toBeLessThanOrEqual(layout.viewport + 1);

  // Entscheidung 48: Lernen, Üben und Raum in einer Navigation, keine
  // zweite Reiterreihe; auf dem Desktop als 100 px breite Leiste.
  const nav = page.getByRole("navigation", { name: "Hauptnavigation" });
  for (const label of ["Lernen", "Üben", "Raum"]) {
    await expect(
      nav.getByRole("link", { name: label, exact: true }),
    ).toBeVisible();
  }
  await expect(
    page.getByRole("navigation", { name: "Lernbereiche" }),
  ).toHaveCount(0);
  if ((page.viewportSize()?.width ?? 0) >= 900) {
    const rail = (await nav.boundingBox())?.width ?? 0;
    expect(rail).toBeLessThanOrEqual(100);
  }

  // Üben: eine Kachel je Bereich.
  await nav.getByRole("link", { name: "Üben" }).click();
  for (const [title, href] of [
    ["LernBox", "/lernbox"],
    ["Wortspeicher", "/frei/german/lernwoerter"],
    ["Tastenwelt", "/frei/typing"],
    ["Kopfrechnen", "/frei/mathematics"],
    ["Laufdiktat allein", "/frei/german/laufdiktat"],
  ] as const) {
    await expect(
      page.getByRole("link", { name: new RegExp(`^${title}`) }),
    ).toHaveAttribute("href", href);
  }

  await page.waitForLoadState("networkidle");
  await page.goto("/lernen/material");
  await expect(
    page.getByRole("heading", { name: "Lernwerkstatt" }),
  ).toBeVisible();

  await page.waitForLoadState("networkidle");
  await page.goto("/lernen/klasse");
  await expect(
    page.getByRole("textbox", { name: "Einschreibecode" }),
  ).toBeVisible();

  await page.waitForLoadState("networkidle");
  await page.goto("/lernen/fortschritt");
  await expect(
    page.getByText(/Vollständige Antworten werden nicht übertragen/),
  ).toBeVisible();
});

test("practice areas keep their fields inside the student frame", async ({
  page,
}) => {
  for (const route of [
    "/lernbox",
    "/frei/german/lernwoerter",
    "/frei/mathematics",
    "/frei/german/laufdiktat",
  ]) {
    await page.goto(route);
    await expect(
      page.getByRole("navigation", { name: "Hauptnavigation" }),
    ).toBeVisible();
    const overflowing = await page.evaluate(() =>
      [...document.querySelectorAll("#inhalt input, #inhalt textarea")]
        .filter((field) => {
          const own = field.getBoundingClientRect();
          const parent = field.parentElement!.getBoundingClientRect();
          return own.width > 0 && own.right > parent.right + 1;
        })
        .map((field) => field.getAttribute("aria-label") ?? field.id),
    );
    expect(overflowing, route).toEqual([]);
  }

  // Auch der Raum-Beitritt liegt im Schülerrahmen, damit man ihn verlassen kann.
  await page.goto("/raum");
  const nav = page.getByRole("navigation", { name: "Hauptnavigation" });
  await expect(
    nav.getByRole("link", { name: "Raum", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await nav.getByRole("link", { name: "Üben", exact: true }).click();
  await expect(page).toHaveURL(/\/ueben$/);
});

test("teacher material and assignment tools share a consistent grid", async ({
  page,
}) => {
  await page.goto("/lehrer/material");
  await expect(
    page.getByRole("heading", { name: "Freigabe an Schüler", level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Vokabelpakete" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Datei importieren" }),
  ).toBeVisible();

  // Aufgaben sind noch in der Vorschau.
  await page.goto("/lehrer/aufgaben?vorschau=an");
  const layout = await page.evaluate(() => {
    const boxes = [
      'form[aria-labelledby="assignment-form-title"]',
      'section[aria-label="Aufgabenliste"]',
      'section[aria-labelledby="qr-generator-title"]',
      'section[aria-labelledby="qr-reader-title"]',
    ].map((selector) =>
      document.querySelector(selector)?.getBoundingClientRect(),
    );
    return boxes.map((box) => ({
      width: box?.width ?? 0,
      height: box?.height ?? 0,
    }));
  });
  expect(layout.every(({ width }) => width > 0)).toBe(true);
  if ((page.viewportSize()?.width ?? 0) > 800) {
    expect(Math.abs(layout[0]!.width - layout[1]!.width)).toBeLessThan(2);
    expect(Math.abs(layout[2]!.width - layout[3]!.width)).toBeLessThan(2);
    expect(Math.abs(layout[2]!.height - layout[3]!.height)).toBeLessThan(2);
  }
});

test("free practice is selected inside a subject", async ({ page }) => {
  await page.goto("/lernen/faecher/deutsch");

  await expect(
    page.getByRole("link", { name: /Lernwörter frei üben/ }),
  ).toHaveAttribute("href", "/frei/german/lernwoerter");
  await expect(
    page.getByRole("heading", { name: "Freies Üben" }),
  ).toBeVisible();
});

test("teachers can prepare every native live-room content type", async ({
  page,
}) => {
  const runtimeErrors: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      !isKnownFrameworkDiagnostic(message.text())
    ) {
      runtimeErrors.push(message.text());
    }
  });
  // Der Raum wertet `?neu=math` genau einmal aus und räumt die Adresse sofort
  // mit `router.replace` auf. `toHaveURL` sähe die Zwischenadresse nur, wenn es
  // vor dem Aufräumen abfragt. Darum hält ein Hook jeden Verlaufseintrag fest.
  await page.addInitScript(() => {
    const urls: string[] = [];
    (window as unknown as { __historyUrls: string[] }).__historyUrls = urls;
    for (const method of ["pushState", "replaceState"] as const) {
      const original = history[method];
      history[method] = function (...args: Parameters<typeof original>) {
        if (args[2] != null) urls.push(String(args[2]));
        return original.apply(this, args);
      };
    }
  });
  await page.goto("/lehrer");
  await expect(page.locator("iframe")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Neues Laufdiktat" }),
  ).toBeVisible();
  await expect(
    page.getByText("Dieses Gerät ist die Schutzgrenze."),
  ).toHaveCount(1);
  await expect(page.getByText("Lehrer-Login")).toHaveCount(0);
  // Kein eigener Knopf „Raum öffnen“: Eine Kachel führt zum Laufdiktat.
  await expect(page.getByRole("button", { name: "Raum öffnen" })).toHaveCount(
    0,
  );
  await page.getByRole("link", { name: /^Mathe/ }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { __historyUrls: string[] }).__historyUrls,
      ),
    )
    .toContainEqual(expect.stringMatching(/\/lehrer\/live\?neu=math/));
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "Inhalt eingeben" }),
  ).toHaveCount(0);

  // Die Art wählt die Startseite (`?neu=`); der Editor zeigt Schritt 1.
  const openEditor = async (kind: "vocabulary" | "math") => {
    await page.goto(`/lehrer/live?neu=${kind}`);
    await expect(
      page.getByRole("heading", { name: "Inhalt eingeben" }),
    ).toBeVisible();
    await expect(page.locator("[data-hydrated]")).toHaveAttribute(
      "data-hydrated",
      "true",
    );
  };

  // Vokabelheft: Paare von Hand, Sprachen wählbar.
  await openEditor("vocabulary");
  await page
    .getByRole("textbox", { name: "Vokabel 1", exact: true })
    .fill("Hund");
  await page
    .getByRole("textbox", { name: "Übersetzung 1", exact: true })
    .fill("dog");
  await expect(page.getByText("1 Vokabel", { exact: true })).toBeVisible();

  // Mathe: Aufgaben erzeugen und eine eigene ergänzen.
  await openEditor("math");
  await page.getByRole("button", { name: "Aufgabe hinzufügen" }).click();
  await page.getByRole("textbox", { name: "Aufgabe", exact: true }).fill("7+5");
  await expect(page.getByText("= 12", { exact: true })).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.getByText("1 Aufgaben", { exact: true })).toBeVisible();
  await expect.poll(() => runtimeErrors).toEqual([]);

  await page.getByRole("button", { name: "Weiter zu Modus" }).click();
  for (const mode of ["Laufdiktat", "Freies Üben", "Battle", "Stationen"]) {
    await expect(
      page.getByRole("button", { name: new RegExp(`^${mode} `) }),
    ).toBeVisible();
  }
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);

  await page.getByRole("button", { name: /^Raum (jetzt )?öffnen$/ }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Live-Räume sind lokal noch nicht konfiguriert",
  );
  await expect(
    page.getByRole("heading", { name: "Modus wählen" }),
  ).toBeVisible();
});

test("the local teacher workspace manages classes, students, assignments and QR codes", async ({
  page,
}) => {
  await page.goto("/lehrer/einstellungen", { waitUntil: "networkidle" });

  const profile = page.getByRole("form", {
    name: "Persönliche Informationen",
  });
  // Das Profil speichert beim Tippen; „Wird gespeichert …“ verschwindet danach.
  await profile.getByLabel("Anzeigename").fill("Frau Beispiel");
  await profile.getByLabel("Schule").fill("Lernschule");
  await profile.getByLabel("Fächer").fill("Deutsch, Mathematik");
  await expect(profile.getByText("Wird beim Tippen gespeichert")).toBeVisible();

  await page.goto("/lehrer/klassen", { waitUntil: "networkidle" });
  // Ohne Klasse steht die Zeile „Neue Klasse“ offen.
  const classForm = page.getByRole("form", { name: "Neue Klasse anlegen" });
  await expect(classForm.getByLabel("Lehrkraft")).toHaveValue("Frau Beispiel");
  await classForm.getByLabel("Klassenname").fill("Klasse 7a");
  await classForm.getByRole("button", { name: "Anlegen" }).click();
  await expect(page.getByText("Klasse wurde lokal angelegt.")).toBeVisible();

  await page.getByRole("button", { name: "+ Neue Klasse" }).click();
  await classForm.getByLabel("Klassenname").fill("Klasse 8b");
  await classForm.getByRole("button", { name: "Anlegen" }).click();
  await expect(
    page.getByRole("navigation", { name: "Klassen" }).getByRole("button"),
  ).toHaveCount(2);

  const studentPanel = page.getByRole("region", {
    name: "Ausgewählte Klasse",
  });
  await studentPanel.getByLabel("Name oder Alias").fill("Alex");
  await studentPanel.getByRole("button", { name: "Hinzufügen" }).click();
  await expect(studentPanel.getByText("Alex")).toBeVisible();
  await studentPanel
    .getByRole("button", { name: "Alex: QR-Code anzeigen" })
    .click();
  await expect(
    studentPanel.getByRole("img", {
      name: "Einschreibungs-QR-Code für Alex",
    }),
  ).toBeVisible();
  await expect(
    studentPanel.getByRole("textbox", { name: "Einschreibecode" }),
  ).toHaveCount(0);
  await studentPanel
    .getByRole("button", { name: "Alex: QR-Code schließen" })
    .click();
  await studentPanel.getByRole("button", { name: "QR-Bogen drucken" }).click();
  await expect(
    page.getByRole("heading", { name: "QR-Bogen für Klasse 8b" }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Einschreibungs-QR-Code für Alex" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Zurück zur Klasse" }).click();
  const classNavigation = page.getByRole("navigation", { name: "Klassen" });
  await classNavigation
    .getByRole("button", { name: "Klasse 7a, 2026/27" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Klasse 7a", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Alex")).toHaveCount(0);
  await classNavigation
    .getByRole("button", { name: "Klasse 8b, 2026/27" })
    .click();
  await expect(studentPanel.getByText("Alex")).toBeVisible();

  await page.goto("/lehrer/aufgaben?vorschau=an", {
    waitUntil: "networkidle",
  });
  const assignmentForm = page.getByRole("form", {
    name: "Aufgabe erstellen",
  });
  await assignmentForm.getByLabel("Titel").fill("Lernwörter üben");
  await assignmentForm
    .getByLabel("Arbeitsauftrag")
    .fill("Bearbeitet die Lernwort-Runde bis Freitag.");
  await assignmentForm.getByLabel("Klasse 7a").check();
  await assignmentForm.getByLabel("Klasse 8b").check();
  await assignmentForm
    .getByRole("button", { name: "Aufgabe zuteilen" })
    .click();
  await expect(
    page.getByText("Aufgabe wurde erstellt und den Klassen zugeteilt."),
  ).toBeVisible();

  const assignmentCode = createTeacherAssignmentCode({
    id: "123e4567-e89b-42d3-a456-426614174003",
    title: "Lernwörter üben",
    instructions: "Bearbeitet die Lernwort-Runde bis Freitag.",
    subject: "german",
    materialId: null,
    classIds: [
      "123e4567-e89b-42d3-a456-426614174004",
      "123e4567-e89b-42d3-a456-426614174005",
    ],
    memberIds: [],
    dueDate: "",
    status: "assigned",
    createdAt: "2026-09-20T10:00:00.000Z",
    updatedAt: "2026-09-20T10:00:00.000Z",
  });
  await page.getByLabel("Code manuell prüfen").fill(assignmentCode);
  await page.getByRole("button", { name: "Code prüfen" }).click();
  await expect(
    page.getByRole("article", { name: "Eingelesene Aufgabe" }),
  ).toContainText("Lernwörter üben");

  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
});

test("an enrollment QR link opens Lernraum and adds the class only after identity confirmation", async ({
  page,
}) => {
  const now = "2026-08-30T10:00:00.000Z";
  const code = createEnrollmentCode(
    {
      id: "123e4567-e89b-42d3-a456-426614174001",
      name: "Klasse 7b",
      teacherName: "Frau Beispiel",
      schoolYear: "2026/27",
      enabledModules: ["vocabulary"],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "123e4567-e89b-42d3-a456-426614174002",
      classId: "123e4567-e89b-42d3-a456-426614174001",
      displayName: "Léa",
      enrollmentToken: "0123456789abcdef0123456789abcdef",
      createdAt: now,
    },
  );

  await page.goto(createEnrollmentLink("http://localhost:3000", code));

  await expect(
    page.getByRole("heading", { name: "Bist du Léa?" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Klasse 7b/ })).toHaveCount(0);
  await expect(page).not.toHaveURL(/beitreten=/);

  await page.getByRole("button", { name: "Ja, ich bin Léa" }).click();

  await expect(page.getByRole("link", { name: /Klasse 7b/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("link", { name: /Klasse 7b/ })).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
});

test("mental math advances automatically after Enter", async ({ page }) => {
  await page.goto("/frei/mathematics");
  await expect(
    page.getByRole("checkbox", { name: "Lückenaufgaben" }),
  ).toBeVisible();
  const multiplication = page.getByRole("button", { name: /Mal/ });
  await multiplication.click();
  await expect(multiplication).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("group", { name: /Einmaleins-Reihen/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Runde starten" }).click();
  const taskHeading = page.locator("#math-task-title");
  await expect(taskHeading).toBeVisible();
  const task = await taskHeading.innerText();
  const [left, right] = task.match(/\d+/g)?.map(Number) ?? [];
  if (left === undefined || right === undefined) {
    throw new Error(`Ungültige Kopfrechenaufgabe: ${task}`);
  }
  const answer = task.includes("+")
    ? left + right
    : task.includes("−")
      ? left - right
      : task.includes("·")
        ? left * right
        : left / right;
  const input = page.getByRole("textbox", { name: "Dein Ergebnis" });
  await input.fill(String(answer));
  await input.press("Enter");
  await expect(page.getByText("Aufgabe 2 von 10")).toBeVisible();
});

test("a class error becomes practice and disappears after correction", async ({
  page,
}) => {
  await enablePreview(page);
  await page.goto("/klasse/7b/aufgaben/vokabeln");
  await page.getByRole("button", { name: "Lernrunde starten" }).click();
  await page.getByRole("textbox", { name: "Deine Antwort" }).fill("Schule");
  await page.getByRole("button", { name: "Antwort prüfen" }).click();
  await expect(
    page.getByRole("heading", { name: "Noch nicht richtig" }),
  ).toBeVisible();

  // Der letzte Fehler führt die Empfehlung an: „Weiterlernen“ öffnet ihn.
  await page.goto("/lernen");
  const next = page.getByRole("link", { name: "Weiterlernen" }).last();
  await expect(next).toHaveAttribute("href", /\/klasse\//);
  await next.click();
  await page.getByRole("button", { name: "Lernrunde starten" }).click();
  await page.getByRole("textbox", { name: "Deine Antwort" }).fill("Bibliothek");
  await page.getByRole("button", { name: "Antwort prüfen" }).click();
  await expect(
    page.getByRole("heading", { name: "Richtig gelöst" }),
  ).toBeVisible();

  // Ohne offenen Schritt heißt der Knopf „Frei üben“ statt „Weiterlernen“ (D5-2).
  await page.goto("/lernen");
  await expect(
    page.getByRole("link", { name: /^(Weiterlernen|Frei üben)$/ }).last(),
  ).not.toHaveAttribute("href", /aufgaben\/vokabeln/);
});
