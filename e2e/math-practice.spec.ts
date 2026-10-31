import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures";

test("math errors survive reload and practice works offline with keyboard and help", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: /^Weiter als / }).click();
  await page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("link", { name: "Üben" })
    .click();
  await page.getByRole("link", { name: /^Kopfrechnen/ }).click();
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
  await expect(page.getByText("Noch nicht.", { exact: true })).toBeVisible();
  await expect(page.getByText(/Nutze die Nachbaraufgabe/)).toBeVisible();
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
  // Tipp und Lösungsweg gibt es erst nach dem ersten Fehlversuch.
  await expect(
    page.getByRole("button", { name: "Lösungsweg zeigen" }),
  ).toHaveCount(0);
  await answer.fill("55");
  await answer.press("Enter");
  await expect(page.getByText("Noch nicht.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Lösungsweg zeigen" }).click();
  await expect(
    page.getByText("Jetzt rechnest du zu Ende: 35 + 21."),
  ).toBeVisible();
  // Die Lösung steht in der Hilfe nie.
  await expect(page.getByText(/Die Lösung ist/)).toHaveCount(0);
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
  // Mitten in der Runde fragt der Rundenschutz nach (C-001).
  await page
    .getByRole("alertdialog", { name: "Runde wirklich beenden?" })
    .getByRole("button", { name: "Beenden" })
    .click();
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
  // Die Vorschau nennt nur Anzahl und Art, keine Aufgabe und keine Lösung.
  await expect(
    page.getByText("5 Aufgaben · Mal bis 100 · Reihe 7 · Lücken", {
      exact: true,
    }),
  ).toBeVisible();
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

test("the preview before a round shows no solutions and no single tasks", async ({
  page,
}) => {
  await page.goto("/frei/mathematics");
  // Erst nach dem Laden reagieren die Schaltflächen.
  await expect(
    page.getByText("Hier erscheinen deine Fehler und Wiederholungen."),
  ).toBeVisible();
  await page.getByRole("combobox", { name: "Anzahl" }).selectOption("10");
  await page
    .getByRole("button", { name: "Aufgaben erzeugen", exact: true })
    .click();
  await expect(
    page.getByText("10 Aufgaben · Plus und Minus bis 20", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Andere Aufgaben" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /neu würfeln|löschen/ }),
  ).toHaveCount(0);
  // Kein „= <Ergebnis>“ vor der Runde.
  const setupText = await page.locator("body").innerText();
  expect(setupText).not.toMatch(/=\s*\d/);

  await page.getByRole("button", { name: "Runde starten" }).click();
  await expect(page.getByText("Aufgabe 1 von 10")).toBeVisible();
  const firstTask = (await page.locator("#math-task-title").innerText()).trim();
  // Weder die erste Rundenaufgabe noch ihr Ergebnis stand in der Vorschau.
  expect(setupText).not.toContain(firstTask);
  expect(setupText).not.toContain(`${firstTask} =`);
});

test("a fraction task is typeset and its help never shows the result", async ({
  page,
}) => {
  await page.goto("/frei/mathematics");
  await page.getByRole("button", { name: "Eigene Aufgaben" }).click();
  await page
    .getByRole("textbox", { name: "Eine Aufgabe pro Zeile" })
    .fill("19 + 1 + 3+ \\frac{1}{2}");
  await page.getByRole("button", { name: "Runde starten" }).click();
  const task = page.locator("#math-task-title");
  await expect(task.locator(".katex")).toBeVisible();
  await expect(task.locator(".katex-html")).not.toContainText("frac");
  // Vor dem ersten Fehlversuch gibt es weder Tipp noch Lösungsweg.
  await expect(
    page.getByRole("button", { name: "Lösungsweg zeigen" }),
  ).toHaveCount(0);
  const answer = page.getByRole("textbox", { name: "Dein Ergebnis" });
  await answer.fill("23");
  await answer.press("Enter");
  await expect(page.getByText("Noch nicht.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Lösungsweg zeigen" }).click();
  const help = page.getByText("So geht es:").locator("xpath=ancestor::div[1]");
  await expect(help).toContainText("Rechne zuerst 19 + 1 = 20.");
  await expect(help).toContainText("Dann 20 + 3 = 23.");
  await expect(help.locator(".katex")).toBeVisible();
  await expect(help).not.toContainText(/23[,.]5|Die Lösung/);
  await page.screenshot({
    path: test.info().outputPath("math-fraction-help.png"),
    fullPage: true,
  });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
  await answer.fill("23,5");
  await answer.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Gut gerechnet" }),
  ).toBeVisible();
});
