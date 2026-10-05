import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Die Konfiguration blockiert Service Worker; hier werden sie gebraucht.
test.describe("installability", () => {
  test.use({ serviceWorkers: "allow" });

  test("the start page is installable and registers the service worker", async ({
    page,
    browserName,
  }, testInfo) => {
    test.skip(
      browserName !== "chromium" || testInfo.project.name === "minimum-width",
      "Installierbarkeit lässt sich nur in Chromium über CDP prüfen.",
    );
    await page.goto("/");
    await expect
      .poll(() =>
        page.evaluate(
          async () => (await navigator.serviceWorker.getRegistrations()).length,
        ),
      )
      .toBeGreaterThan(0);

    const client = await page.context().newCDPSession(page);
    const { installabilityErrors } = (await client.send(
      "Page.getInstallabilityErrors",
    )) as { installabilityErrors: Array<{ errorId: string }> };
    // Playwright-Kontexte gelten als inkognito.
    expect(
      installabilityErrors.filter((error) => error.errorId !== "in-incognito"),
    ).toEqual([]);
  });
});

test("the start page offers installing the app below the room code", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.addEventListener("DOMContentLoaded", () => {
      const event = Object.assign(new Event("beforeinstallprompt"), {
        prompt: async () => {},
        userChoice: Promise.resolve({ outcome: "dismissed" }),
      });
      window.dispatchEvent(event);
    });
  });
  await page.goto("/");
  const button = page.getByRole("button", { name: "Als App installieren" });
  await expect(button).toBeVisible();
  const box = await button.boundingBox();
  const code = await page.getByLabel("Raumcode Zeichen 1").boundingBox();
  expect(box!.y).toBeGreaterThan(code!.y + code!.height);
  expect(box!.height).toBeGreaterThanOrEqual(44);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
