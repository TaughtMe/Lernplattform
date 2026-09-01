import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("pilot start exposes only room join and the teacher path", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Bereit für dein Laufdiktat?" }),
  ).toBeVisible();
  await expect(page.getByRole("group", { name: "Raumcode" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "QR-Code mit Kamera scannen" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Lehrerbereich" }),
  ).toHaveAttribute("href", "/lehrer");
  await expect(page.getByText("Mein Lernraum", { exact: true })).toHaveCount(0);

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

test("legacy product routes are centrally redirected without deleting data", async ({
  page,
}) => {
  await page.goto("/lernen");
  await expect(page).toHaveURL(/\/?pilot=1$/);

  await page.goto("/lehrer/klassen");
  await expect(page).toHaveURL(/\/lehrer\/live\?pilot=1$/);
});

test("room code entry works with the keyboard", async ({ page }) => {
  await page.goto("/");
  const join = page.getByRole("button", { name: "Beitreten" });
  await expect(join).toBeEnabled();
  for (const [index, digit] of ["4", "8", "2", "9"].entries()) {
    await page
      .getByRole("textbox", { name: `Ziffer ${index + 1}` })
      .fill(digit);
  }
  await page.getByRole("textbox", { name: "Ziffer 4" }).press("Enter");
  await expect(page).toHaveURL(/\/raum\?code=4829$/);
});

test("teacher pilot offers the complete Laufdiktat content and mode set", async ({
  page,
}) => {
  await page.goto("/lehrer/live");

  await expect(
    page.getByRole("heading", { name: "Laufdiktat Lehrerdashboard" }),
  ).toBeAttached();
  await expect(page.locator(".teacher-live")).toHaveAttribute(
    "data-hydrated",
    "true",
  );
  await expect(page.getByRole("tab", { name: "Text" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Vokabeln" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Kopfrechnen" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Trennregeln" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Markierung als Abschnitt" }),
  ).toBeVisible();

  const stableFrame = async () =>
    page.evaluate(() => {
      const header = document.querySelector(".teacher-live__dashboard-header");
      const footer = document.querySelector(".teacher-live__wizard-footer");
      return {
        pageScroll: window.scrollY,
        pageHeight: document.documentElement.scrollHeight,
        viewportHeight: document.documentElement.clientHeight,
        header: header?.getBoundingClientRect().toJSON(),
        footer: footer?.getBoundingClientRect().toJSON(),
      };
    });
  const textFrame = await stableFrame();
  await page.getByRole("tab", { name: "Vokabeln" }).click();
  const vocabularyFrame = await stableFrame();
  await page.getByRole("tab", { name: "Kopfrechnen" }).click();
  const mathFrame = await stableFrame();
  expect(vocabularyFrame).toEqual(textFrame);
  expect(mathFrame).toEqual(textFrame);
  expect(textFrame.pageHeight).toBe(textFrame.viewportHeight);

  await page.getByRole("button", { name: /Weiter zur Konfiguration/ }).click();
  await expect(page.getByRole("radio", { name: /^Laufdiktat/ })).toBeVisible();
  await expect(page.getByRole("radio", { name: /^Freies Üben/ })).toBeVisible();
  await expect(page.getByRole("radio", { name: /^Battle/ })).toBeVisible();
  await expect(page.getByRole("radio", { name: /^Stationen/ })).toBeVisible();
  await expect(page.getByLabel("Lehrkraftfreigabe")).toHaveAttribute(
    "type",
    "password",
  );

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

test("room join keeps invalid input and shows an explicit unavailable state", async ({
  page,
}) => {
  await page.goto("/raum?code=4829");
  await expect(page.locator(".live-room-join")).toHaveAttribute(
    "data-hydrated",
    "true",
  );
  await page.getByLabel("Name oder Pseudonym").fill("Mia");
  await page.getByRole("button", { name: "Beitreten" }).click();

  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByLabel("Name oder Pseudonym")).toHaveValue("Mia");
  await expect(page.getByRole("textbox", { name: "Ziffer 1" })).toHaveValue(
    "4",
  );
});

test("a configured teacher and student can complete one live round", async ({
  browser,
}) => {
  test.skip(
    !process.env["NEXT_PUBLIC_SUPABASE_URL"] ||
      !process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"] ||
      !process.env["PILOT_TEACHER_ACCESS_CODE"],
    "Benötigt die eigens provisionierte lokale Supabase-Pilotumgebung.",
  );

  const teacher = await browser.newPage();
  const student = await browser.newPage();
  await teacher.goto("/lehrer/live");
  await teacher.getByLabel(/Text – Sätze/).fill("Der Schulweg ist kurz.");
  await teacher
    .getByRole("button", { name: /Weiter zur Konfiguration/ })
    .click();
  await teacher
    .getByLabel("Lehrkraftfreigabe")
    .fill(process.env["PILOT_TEACHER_ACCESS_CODE"] ?? "");
  await teacher.getByRole("button", { name: /Lobby öffnen/ }).click();
  const roomCode = await teacher.locator(".teacher-live__code").innerText();

  await student.goto(`/raum?code=${roomCode}`);
  await student.getByLabel("Name oder Pseudonym").fill("Schneller Igel");
  await student.getByRole("button", { name: "Beitreten" }).click();
  await expect(student.getByText(/Du bist dabei/)).toBeVisible();

  await teacher.getByRole("button", { name: "Sitzung starten" }).click();
  await student
    .getByRole("button", { name: "Verstanden – jetzt schreiben" })
    .click();
  await student
    .getByRole("textbox", { name: "Deine Antwort" })
    .fill("Der Schulweg ist kurz.");
  await student.getByRole("button", { name: "Prüfen" }).click();
  await expect(
    student.getByRole("heading", { name: /Geschafft/ }),
  ).toBeVisible();

  await teacher.close();
  await student.close();
});
