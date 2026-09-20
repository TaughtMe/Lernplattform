import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("the profile uses original animals, keeps the choice and supports keyboard and small screens", async ({
  page,
}) => {
  await page.goto("/lernen/einstellungen");
  const trigger = page.getByRole("button", { name: "Profil-Tier auswählen" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Dein Profil" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("radio", { name: "Fuchs", exact: true }).click();
  await expect(
    dialog.getByRole("radio", { name: "Fuchs", exact: true }),
  ).toHaveAttribute("aria-checked", "true");
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
  await dialog.getByRole("button", { name: "Tier speichern" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(trigger.locator("img")).toHaveAttribute(
    "src",
    "/animals/fuchs.svg",
  );
  await page.reload();
  await expect(trigger.locator("img")).toHaveAttribute(
    "src",
    "/animals/fuchs.svg",
  );
  await trigger.focus();
  await trigger.press("Enter");
  await expect(
    dialog.getByRole("radio", { name: "Fuchs", exact: true }),
  ).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  const box = await trigger.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  await page.screenshot({
    path: test.info().outputPath("profile-home.png"),
    fullPage: true,
  });
});
