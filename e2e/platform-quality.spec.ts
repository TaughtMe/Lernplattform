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
