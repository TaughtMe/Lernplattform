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
  await expect(page.getByRole("textbox", { name: "Raumcode" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Mein Lernraum", exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Freies Üben", exact: false }),
  ).toBeVisible();
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

test("mobile learners retain direct access to the two learner entries", async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"));
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "Mein Lernraum", exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Freies Üben", exact: false }),
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
  await expect(page.locator(".main-action--free")).toHaveCSS(
    "background-color",
    "rgb(25, 35, 34)",
  );

  await page.goto("/lernen");
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

test("new class content becomes due practice", async ({ page }) => {
  await page.goto("/klasse/7b");
  await expect(page.getByText("Heute fällig")).toBeVisible();
  await expect(
    page.getByRole("link", { name: /School words wiederholen/ }),
  ).toBeVisible();
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

  await page.goto("/klasse/7b");
  await expect(page.getByText("Aus deinem letzten Fehler")).toBeVisible();
  await page.getByRole("link", { name: /School words wiederholen/ }).click();
  await page.getByRole("button", { name: "Lernrunde starten" }).click();
  await page.getByRole("textbox", { name: "Deine Antwort" }).fill("Bibliothek");
  await page.getByRole("button", { name: "Antwort prüfen" }).click();
  await expect(
    page.getByRole("heading", { name: "Richtig gelöst" }),
  ).toBeVisible();

  await page.goto("/klasse/7b");
  await expect(page.getByText("Im Moment ist nichts offen.")).toBeVisible();
});
