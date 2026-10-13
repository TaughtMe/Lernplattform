import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("the profile uses original animals, keeps the choice and supports keyboard and small screens", async ({
  page,
}) => {
  await page.goto("/lernen/einstellungen");
  // Design „Lernraum UI“: Das Tier wird direkt im Raster gewählt.
  const picker = page.getByRole("group", { name: "Tier auswählen" });
  // Nach dem Laden ist ein (zufälliges) Tier gewählt; erst dann ist die Seite bedienbar.
  await expect(picker.locator('[aria-pressed="true"]')).toHaveCount(1);
  const fox = picker.getByRole("button", { name: "Fuchs", exact: true });
  await fox.click();
  await expect(fox).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("heading", { level: 2, name: /Fuchs$/ }),
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.screenshot({
    path: test.info().outputPath("profile-animals.png"),
    fullPage: true,
  });

  await page.reload();
  await expect(fox).toHaveAttribute("aria-pressed", "true");
  await expect(
    page
      .getByRole("link", { name: "Profileinstellungen" })
      .filter({ visible: true }),
  ).toHaveAttribute("aria-current", "page");

  const koala = picker.getByRole("button", { name: "Koala", exact: true });
  await koala.focus();
  await koala.press("Enter");
  await expect(koala).toHaveAttribute("aria-pressed", "true");
  await expect(fox).toHaveAttribute("aria-pressed", "false");
  const box = await koala.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("secret figures stay hidden until the tap sequence, then can be chosen and persist", async ({
  page,
}) => {
  await page.goto("/lernen/einstellungen");
  const animals = page.getByRole("group", { name: "Tier auswählen" });
  await expect(animals.locator('[aria-pressed="true"]')).toHaveCount(1);
  const figures = page.getByRole("group", { name: "Figur auswählen" });
  await expect(figures).toHaveCount(0);

  // Falsche Reihenfolge schaltet nichts frei.
  for (const name of ["Löwin", "Löwin", "Koala", "Koala"]) {
    await animals.getByRole("button", { name, exact: true }).click();
  }
  await expect(figures).toHaveCount(0);

  for (const name of [
    "Koala",
    "Koala",
    "Tiefseefisch",
    "Tiefseefisch",
    "Löwin",
    "Löwin",
  ]) {
    await animals.getByRole("button", { name, exact: true }).click();
  }
  await expect(figures).toBeVisible();
  // Tiere und Figuren teilen sich ein Scrollfeld.
  expect(
    await page.evaluate(
      () =>
        document.querySelector('[aria-label="Figur auswählen"]')
          ?.parentElement ===
        document.querySelector('[aria-label="Tier auswählen"]')?.parentElement,
    ),
  ).toBe(true);
  const santa = figures.getByRole("button", {
    name: "Weihnachtsmann",
    exact: true,
  });
  await santa.click();
  await expect(santa).toHaveAttribute("aria-pressed", "true");
  await expect(animals.locator('[aria-pressed="true"]')).toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  await page.reload();
  await expect(figures).toBeVisible();
  await expect(santa).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.locator('img[src="/figuren/weihnachtsmann.svg"]').first(),
  ).toBeVisible();

  // Tier antippen wählt wieder das Tier.
  await animals.getByRole("button", { name: "Fuchs", exact: true }).click();
  await expect(santa).toHaveAttribute("aria-pressed", "false");
});
