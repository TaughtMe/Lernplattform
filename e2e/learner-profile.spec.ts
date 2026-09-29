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
