import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("math errors survive reload and practice works offline with keyboard and help", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: /^Frei üben/ }).click();
  await page.getByRole("link", { name: /^Mathematik/ }).click();
  await page.getByRole("link", { name: /Kopfrechnen frei üben/ }).click();
  await expect(
    page.getByRole("heading", { name: "Kopfrechnen", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Hier erscheinen deine Fehler und Wiederholungen."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Eigene Aufgaben" }).click();
  await page
    .getByRole("textbox", { name: "Eine Aufgabe pro Zeile" })
    .fill("7 * 8");
  await page.getByRole("button", { name: "Runde starten" }).click();
  const answer = page.getByRole("textbox", { name: "Dein Ergebnis" });
  await expect(answer).toBeFocused();
  await answer.fill("54");
  await answer.press("Enter");
  await expect(
    page.getByText("Noch nicht – probiere es erneut."),
  ).toBeVisible();
  await expect(answer).toBeFocused();
  await answer.fill("56");
  await answer.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Gut gerechnet" }),
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Meine Fehler und Wiederholungen üben" }),
  ).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath("math-review.png"),
    fullPage: true,
  });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
  await context.setOffline(true);
  await page
    .getByRole("button", { name: "Meine Fehler und Wiederholungen üben" })
    .click();
  await expect(answer).toBeFocused();
  await page.getByRole("button", { name: "Lösung ansehen" }).click();
  await expect(page.getByText(/Die Lösung ist 56/)).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await answer.fill("56");
  await answer.press("Enter");
  await expect(page.getByText("Aufgabe 2 von 10")).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath("math-round.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
  const check = await page
    .getByRole("button", { name: "Prüfen" })
    .boundingBox();
  expect(check!.height).toBeGreaterThanOrEqual(44);
  await page.getByRole("button", { name: "Runde beenden" }).click();
  await expect(page.getByRole("heading", { name: "Heute üben" })).toBeVisible();
  await context.setOffline(false);
});

test("a learner can generate a short round with selected tables and gaps", async ({
  page,
}) => {
  await page.goto("/frei/mathematics");
  await page.getByRole("button", { name: /Mal/ }).click();
  await page.getByRole("button", { name: /Plus/ }).click();
  await page.getByRole("button", { name: /Minus/ }).click();
  await page.getByRole("button", { name: "7", exact: true }).click();
  await page.getByRole("spinbutton", { name: "Bis", exact: true }).fill("100");
  await page.getByRole("combobox", { name: "Anzahl" }).selectOption("5");
  await page.getByRole("checkbox", { name: "Lückenaufgaben" }).check();
  await page
    .getByRole("combobox", { name: "Lückenposition" })
    .selectOption("right");
  await page
    .getByRole("button", { name: "Aufgaben erzeugen", exact: true })
    .click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Runde starten" }).click();
  await expect(page.getByText("Aufgabe 1 von 5")).toBeVisible();
  await expect(page.locator("#math-task-title")).toContainText("_");
});
