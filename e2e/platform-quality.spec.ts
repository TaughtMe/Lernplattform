import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("start page exposes the core learner actions", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Wie möchtest du heute lernen?",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Klassen- oder Raumcode" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "QR-Code mit Kamera scannen" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Mein Lernraum", exact: false }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Mein Lernraum/ })).toHaveCount(
    1,
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
    "/frei",
    "/frei/german",
    "/frei/german/laufdiktat",
    "/frei/german/lernwoerter",
    "/frei/mathematics",
    "/klasse/7b",
    "/lernbox",
    "/raum",
    "/lehrer",
  ]) {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();

    expect(results.violations, `Accessibility violations on ${path}`).toEqual(
      [],
    );
  }
});

test("mobile learners retain direct access to their personal learning room", async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"));
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "Mein Lernraum", exact: false }),
  ).toBeVisible();
});

test("the native LernBox creates and opens a personal deck", async ({
  page,
}) => {
  const runtimeErrors: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(message.text());
  });
  await page.goto("/lernbox");
  await expect(page.locator("iframe")).toHaveCount(0);

  await expect(
    page.getByRole("textbox", { name: "Name der neuen Lernbox" }),
  ).toBeVisible();
  const deckName = page.getByRole("textbox", {
    name: "Name der neuen Lernbox",
  });
  await deckName.fill("Englisch 7b");
  await expect(deckName).toHaveValue("Englisch 7b");
  await page.getByRole("button", { name: "Erstellen" }).click();

  await expect.poll(() => runtimeErrors).toEqual([]);
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const request = indexedDB.open("lernraum:personal:v1");
          const database = await new Promise<IDBDatabase>((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });
          const transaction = database.transaction(
            "learningBoxDecks",
            "readonly",
          );
          const read = transaction.objectStore("learningBoxDecks").getAll();
          const values = await new Promise<Array<{ title: string }>>(
            (resolve, reject) => {
              read.onsuccess = () => resolve(read.result);
              read.onerror = () => reject(read.error);
            },
          );
          database.close();
          return values.map((value) => value.title);
        }),
      { timeout: 10_000 },
    )
    .toContain("Englisch 7b");
  await expect(page.getByText("Englisch 7b", { exact: true })).toBeVisible();
  await page.getByText("Englisch 7b", { exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Englisch 7b" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Karte hinzufügen" }),
  ).toBeVisible();
});

test("a downloaded LernBox backup restores a deleted deck", async ({
  page,
}) => {
  await page.goto("/lernbox");
  await page
    .getByRole("textbox", { name: "Name der neuen Lernbox" })
    .fill("Sicherungsprobe");
  await page.getByRole("button", { name: "Erstellen" }).click();
  await expect(
    page.getByText("Sicherungsprobe", { exact: true }),
  ).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Sicherung speichern" }).click();
  const download = await downloadPromise;
  const backupPath = await download.path();
  expect(backupPath).not.toBeNull();

  await page.getByRole("button", { name: "Sicherungsprobe löschen" }).click();
  await expect(page.getByText("Sicherungsprobe", { exact: true })).toHaveCount(
    0,
  );

  await page
    .locator('input[type="file"][accept="application/json"]')
    .setInputFiles(backupPath!);
  await expect(page.getByRole("status")).toHaveText(
    "Sicherung wurde importiert.",
  );
  await expect(
    page.getByText("Sicherungsprobe", { exact: true }),
  ).toBeVisible();
});

test("a native Laufdiktat mistake becomes due LernBox practice", async ({
  page,
}) => {
  await page.goto("/frei/german/laufdiktat");
  await expect(page.locator("iframe")).toHaveCount(0);
  await page.getByRole("button", { name: "Vokabeln" }).click();
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

test("the five-stage learning-word path can be tried without an account", async ({
  page,
}) => {
  await page.goto("/frei/german/lernwoerter");
  await page.getByRole("button", { name: /4 Ansehen & verdecken/ }).click();
  await page
    .getByRole("textbox", { name: "Deine Lernwörter" })
    .fill("Schulweg");
  await page.getByRole("button", { name: "Stufe ausprobieren" }).click();

  await expect(page.getByText("Schulweg", { exact: true })).toBeVisible();
  const reveal = page.getByRole("button", { name: "Wörter verdecken" });
  await expect(reveal).toBeFocused();
  await page.keyboard.press("Enter");
  const answer = page.getByRole("textbox", { name: "Deine Lösung" });
  await expect(answer).toBeFocused();
  await expect(page.locator(".learning-word-letter-slots i")).toHaveCount(8);
  await answer.fill("Schulweck");
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Noch nicht sicher" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Verdeckt noch einmal versuchen" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(reveal).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(answer).toBeFocused();
  await answer.fill("Schulweg");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toContainText("Richtig");
  await expect(
    page.getByRole("heading", { name: "Du hast die Stufe ausprobiert." }),
  ).toBeVisible({ timeout: 3_000 });

  await page.getByRole("button", { name: "Andere Stufe testen" }).click();
  await page.getByRole("button", { name: /2 Wenige Lücken/ }).click();
  await page
    .getByRole("textbox", { name: "Deine Lernwörter" })
    .fill("Sonne\nMutter");
  await page.getByRole("button", { name: "Stufe ausprobieren" }).click();
  const directAnswer = page.getByRole("textbox", { name: "Deine Lösung" });
  await expect(directAnswer).toBeFocused();
  await directAnswer.fill("Sonne");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toContainText("Richtig");
  await expect(page.locator(".running-progress strong")).toHaveText("2 / 2", {
    timeout: 3_000,
  });
  await expect(directAnswer).toBeFocused();
});

test("large German word banks create manageable learning rounds", async ({
  page,
}) => {
  await page.goto("/frei/german/lernwoerter");
  await page.getByRole("button", { name: /Merkwörter & Fremdwörter/ }).click();
  const source = page.getByRole("textbox", { name: "Deine Lernwörter" });
  await expect(source).toHaveValue(/Computer/);
  expect((await source.inputValue()).split("\n").length).toBeGreaterThanOrEqual(
    100,
  );
  await expect(page.getByLabel("Wörter in dieser Runde")).toHaveValue("10");
  await page.getByRole("button", { name: "Stufe ausprobieren" }).click();
  await expect(page.locator(".running-progress strong")).toHaveText("1 / 10");
  await expect(
    page.getByRole("textbox", { name: "Deine Lösung" }),
  ).toBeFocused();
});

test("a learning result survives a page reload on the same device", async ({
  page,
}) => {
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
    page.locator(".progress-values").getByText("1", { exact: true }),
  ).toBeVisible();

  await page.reload();
  await expect(page.getByText("Versuche")).toBeVisible();
  await expect(page.getByLabel("Bedeutung: Box 2 von 5")).toBeVisible();
  await expect(page.getByLabel("Schreiben: Box 2 von 5")).toBeVisible();
  await expect(
    page.locator(".progress-values").getByText("1", { exact: true }),
  ).toBeVisible();
});

test("a vocabulary session advances through several due cards", async ({
  page,
}) => {
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
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(23, 21, 19)",
  );
  await expect(page.locator(".main-action--class")).toHaveCSS(
    "background-color",
    "rgb(36, 29, 27)",
  );
  await expect(page.locator(".main-action")).toHaveCount(1);

  await page.goto("/klasse/7b");
  const moduleTag = page.locator(".module-chips span").first();
  await expect(moduleTag).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(moduleTag).toHaveCSS("border-color", "rgb(85, 76, 69)");
  await expect(moduleTag).toHaveCSS("color", "rgb(185, 173, 163)");

  await page.goto("/klasse/7b/aufgaben/vokabeln");
  await expect(page.getByText("Deine Lernbox")).toBeVisible();
  await expect(page.getByLabel("Bedeutung: Box 1 von 5")).toBeVisible();
  await expect(page.getByLabel("Schreiben: Box 1 von 5")).toBeVisible();

  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("class content remains part of the personal learning room", async ({
  page,
}) => {
  await page.goto("/klasse/7b");
  await expect(
    page.getByText(/Sie führt keinen zweiten Lernstand/),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Im persönlichen Lernraum üben" }),
  ).toHaveAttribute("href", "/lernen");
});

test("the personal learning room presents one connected adaptive learning loop", async ({
  page,
}) => {
  await page.goto("/lernen");

  await expect(
    page.getByRole("heading", { name: "Was hilft dir heute weiter?" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Heute üben" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Fächer" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Meine Inhalte" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Mein Fortschritt" }),
  ).toBeVisible();

  await expect(
    page.getByRole("link", { name: /Vokabeln.*Fach öffnen/ }),
  ).toHaveAttribute("href", "/lernen/faecher/vokabeln");
  await expect(
    page.getByRole("link", { name: /Deutsch.*Fach öffnen/ }),
  ).toHaveAttribute("href", "/lernen/faecher/deutsch");
  await expect(
    page.getByRole("textbox", { name: "Klassen- oder Raumcode" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "QR-Code mit Kamera scannen" }),
  ).toBeVisible();
  await expect(
    page.getByText(/Vollständige Antworten werden nicht übertragen/),
  ).toBeVisible();
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
    if (message.type() === "error") runtimeErrors.push(message.text());
  });
  await page.goto("/lehrer");
  await expect(page.locator("iframe")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Unterrichtsrunde" }),
  ).toBeVisible();
  await expect(page.getByText("2 Aufgaben")).toBeVisible();

  await page.getByRole("button", { name: "Vokabeln" }).click();
  await expect.poll(() => runtimeErrors).toEqual([]);
  await expect(page.getByText("3 Aufgaben")).toBeVisible();
  await expect(
    page.getByRole("combobox", {
      name: "Vokabeln nach der Runde übernehmen",
    }),
  ).toHaveValue("errors");
  await page.getByRole("button", { name: "Kopfrechnen" }).click();
  await expect(page.getByText("4 Aufgaben")).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: "Negative Ergebnisse" }),
  ).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: "Lückenaufgaben" }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Weiter zu den Einstellungen" })
    .click();
  await expect(page.getByRole("button", { name: /Freies Üben/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Battle/ })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Lernstandscheck/ }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Laufdiktat/ })).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);

  await page.getByRole("button", { name: "Lobby öffnen" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Live-Räume sind lokal noch nicht konfiguriert",
  );
  await expect(page.getByText("Noch nicht geöffnet")).toBeVisible();
});

test("mental math advances automatically after Enter", async ({ page }) => {
  await page.goto("/frei/mathematics");
  await expect(
    page.getByRole("checkbox", { name: "Lückenaufgaben" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Mal/ }).click();
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
  await page.goto("/klasse/7b/aufgaben/vokabeln");
  await page.getByRole("button", { name: "Lernrunde starten" }).click();
  await page.getByRole("textbox", { name: "Deine Antwort" }).fill("Schule");
  await page.getByRole("button", { name: "Antwort prüfen" }).click();
  await expect(
    page.getByRole("heading", { name: "Noch nicht richtig" }),
  ).toBeVisible();

  await page.goto("/lernen");
  await expect(page.getByText("Aus deinem letzten Fehler")).toBeVisible();
  await page.getByRole("link", { name: /School words wiederholen/ }).click();
  await page.getByRole("button", { name: "Lernrunde starten" }).click();
  await page.getByRole("textbox", { name: "Deine Antwort" }).fill("Bibliothek");
  await page.getByRole("button", { name: "Antwort prüfen" }).click();
  await expect(
    page.getByRole("heading", { name: "Richtig gelöst" }),
  ).toBeVisible();

  await page.goto("/lernen");
  await expect(page.getByText("Aus deinem letzten Fehler")).toHaveCount(0);
});
