import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("start page exposes the core learner actions", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Gemeinsam lernen, im Unterricht und zu Hause.",
    }),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Raumcode" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Meine LernBox öffnen" }),
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
  for (const path of ["/", "/lernen", "/lernbox", "/raum", "/lehrer"]) {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();

    expect(results.violations, `Accessibility violations on ${path}`).toEqual(
      [],
    );
  }
});

test("mobile learners retain direct access to all primary areas", async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"));
  await page.goto("/");

  const mobileNavigation = page.getByRole("navigation", {
    name: "Mobile Hauptnavigation",
  });
  await expect(mobileNavigation).toBeVisible();
  await expect(
    mobileNavigation.getByRole("link", { name: "Lernen" }),
  ).toBeVisible();
  await expect(
    mobileNavigation.getByRole("link", { name: "Raum" }),
  ).toBeVisible();
  await expect(
    mobileNavigation.getByRole("link", { name: "Duell" }),
  ).toBeVisible();
  await expect(
    mobileNavigation.getByRole("link", { name: "Haus" }),
  ).toBeVisible();
});
