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
  await expect(page.getByText("1", { exact: true })).toHaveCount(2);

  await page.reload();
  await expect(page.getByText("Versuche")).toBeVisible();
  await expect(page.getByText("1", { exact: true })).toHaveCount(2);
});

test("a teacher can prepare an assignment without publishing it", async ({
  page,
}) => {
  await page.goto("/lehrer");

  await page.getByLabel("Titel").fill("School words · Teil 2");
  await page
    .getByLabel("Kurze Arbeitsanweisung")
    .fill("Bearbeite die nächste Vokabelrunde.");
  await page.getByLabel("Erscheint unter").selectOption("today");
  await page.getByRole("button", { name: "Als Entwurf speichern" }).click();

  await expect(page.getByText("Entwurf gespeichert.")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "School words · Teil 2" }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Zur Veröffentlichung vorbereiten" })
    .click();
  await expect(page.getByText("Bereit", { exact: true })).toBeVisible();

  await page.reload();
  await expect(
    page.getByRole("heading", { name: "School words · Teil 2" }),
  ).toBeVisible();
});
