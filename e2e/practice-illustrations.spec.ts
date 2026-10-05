import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("practice illustrations load in both themes and retain accessible navigation", async ({
  page,
}) => {
  await page.goto("/ueben");
  const areas = [
    ["LernBox", "/lernbox"],
    ["Wortspeicher", "/frei/german/lernwoerter"],
    ["Tastenwelt", "/frei/typing"],
    ["Kopfrechnen", "/frei/mathematics"],
    ["Laufdiktat allein", "/frei/german/laufdiktat"],
  ] as const;
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  for (const theme of ["light", "dark"] as const) {
    if (theme === "dark") {
      await page.getByRole("button", { name: "Hell oder dunkel" }).click();
    }
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    for (const [title, href] of areas) {
      const link = page.getByRole("link", { name: new RegExp(`^${title}`) });
      await expect(link).toHaveAttribute("href", href);
      const image = link.locator("img");
      await expect(image).toHaveAttribute("alt", "");
      await expect
        .poll(() =>
          image.evaluate(
            (element: HTMLImageElement) =>
              element.complete && element.naturalWidth > 0,
          ),
        )
        .toBe(true);
      const bounds = await image.boundingBox();
      expect(bounds?.width).toBe(64);
      expect(bounds?.height).toBe(64);
    }
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth + 1,
      ),
    ).toBe(true);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.screenshot({
      path: test.info().outputPath(`practice-${theme}.png`),
      fullPage: true,
    });
  }
  const firstArea = page.getByRole("link", { name: /^LernBox/ });
  await firstArea.focus();
  await expect(firstArea).toBeFocused();
  await firstArea.press("Enter");
  await expect(page).toHaveURL(/\/lernbox$/);
});
