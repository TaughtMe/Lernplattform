import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];

test("the cloud sync card opens the WebDAV form on demand and stays accessible", async ({
  page,
}) => {
  await page.goto("/lernen/einstellungen", { waitUntil: "networkidle" });
  const card = page.getByRole("region", { name: "Cloud-Synchronisation" });
  const webdav = card.locator("details");
  const address = card.getByLabel("Server-Adresse");

  await expect(card.getByText("Microsoft OneDrive")).toBeVisible();
  await expect(card.getByText("Google Drive", { exact: true })).toBeVisible();
  await expect(address).toBeHidden();

  await card.getByText("WebDAV (z. B. Nextcloud)").click();
  await expect(webdav).toHaveJSProperty("open", true);
  await expect(address).toBeVisible();
  await expect(card.getByLabel("Benutzername")).toBeVisible();
  await expect(card.getByLabel("App-Passwort")).toBeVisible();

  await card.getByRole("button", { name: "In die Cloud sichern" }).click();
  await expect(
    card.getByText("Bitte Adresse, Benutzername und Passwort angeben."),
  ).toBeVisible();

  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);

  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  expect(results.violations).toEqual([]);
});
