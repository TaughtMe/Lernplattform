import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("local preview exposes the clear learner entries", async ({ page }) => {
  await page.goto("/");

  // Design 2a: ein Tier (öffnet den Lernraum), ein Code, sonst nichts.
  const animal = page.getByRole("link", { name: /^Weiter als / });
  await expect(animal).toHaveAttribute("href", "/lernen");
  await expect(page.getByRole("group", { name: "Raumcode" })).toBeVisible();
  const cameraButton = page.getByRole("button", {
    name: "QR-Code mit Kamera scannen",
  });
  await expect(cameraButton).toBeVisible();
  await expect(cameraButton.locator("svg")).toHaveCount(1);
  await expect(
    page.getByRole("link", { name: "Lehrerbereich" }),
  ).toHaveAttribute("href", "/lehrer");
  await expect(page.getByRole("button", { name: "Tier ändern" })).toHaveCount(
    0,
  );
  await expect(page.getByRole("link", { name: "Impressum" })).toBeVisible();

  // Die Startseite passt ohne Scrollen auf den Bildschirm.
  const dimensions = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    contentWidth: document.documentElement.scrollWidth,
    viewportHeight: document.documentElement.clientHeight,
    contentHeight: document.documentElement.scrollHeight,
  }));
  expect(dimensions.contentWidth).toBeLessThanOrEqual(
    dimensions.viewportWidth + 1,
  );
  expect(dimensions.contentHeight).toBeLessThanOrEqual(
    dimensions.viewportHeight + 1,
  );

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("the complete learning and teacher workspaces are reachable", async ({
  page,
}) => {
  await page.goto("/lernen");
  // Frisches Gerät: Die Hauptschaltfläche heißt „Loslegen“ (D5-2).
  await expect(
    page.getByRole("link", { name: "Loslegen" }).last(),
  ).toBeVisible();

  await page.goto("/lehrer/klassen");
  await expect(
    page.getByRole("heading", { name: "Klassen und Schüler" }),
  ).toBeVisible();
});

test("room code entry works with the keyboard", async ({ page }) => {
  await page.goto("/");
  // Das Tier erscheint erst nach dem Laden; dann reagieren die Felder.
  await expect(page.getByRole("link", { name: /^Weiter als / })).toBeVisible();
  const first = page.getByRole("textbox", { name: "Raumcode Zeichen 1" });
  await first.click();
  await page.keyboard.type("4829");
  await expect(page).toHaveURL(/\/raum\?code=4829$/);
});

test("teacher pilot offers the complete Laufdiktat content and mode set", async ({
  page,
}) => {
  const hydrated = () =>
    expect(page.locator("[data-hydrated]")).toHaveAttribute(
      "data-hydrated",
      "true",
    );
  await page.goto("/lehrer/live");

  await expect(
    page.getByRole("heading", { name: "Inhalt eingeben" }),
  ).toBeVisible();
  await hydrated();
  await expect(
    page.getByRole("button", { name: "Weiter zu Modus" }),
  ).toBeDisabled();
  await page
    .getByRole("textbox", { name: "Text" })
    .fill("Der Hund läuft. Die Katze schläft.");
  await expect(page.getByText("Die Katze schläft.").first()).toBeVisible();

  // Die Art kommt von der Startseite (`?neu=`); Kopf und Fuß bleiben gleich.
  const frame = () =>
    page.evaluate(() =>
      ["header", "footer"].map((tag) => {
        const rect = document.querySelector(tag)?.getBoundingClientRect();
        return rect ? [rect.top, rect.height, rect.width] : null;
      }),
    );
  const textFrame = await frame();
  // Die Seite entfernt `?neu=` nach dem Lesen selbst (router.replace). Erst
  // danach weiter navigieren, sonst bricht Firefox die nächste Navigation ab.
  const settled = () => expect(page).toHaveURL(/\/lehrer\/live$/);
  await page.goto("/lehrer/live?neu=vocabulary");
  await hydrated();
  await settled();
  await expect(
    page.getByRole("heading", { name: "Vokabelheft" }),
  ).toBeVisible();
  expect(await frame()).toEqual(textFrame);
  await page.goto("/lehrer/live?neu=math");
  await hydrated();
  await settled();
  await expect(page.getByText("0 Aufgaben")).toBeVisible();
  expect(await frame()).toEqual(textFrame);

  await page.goto("/lehrer/live");
  await hydrated();
  await page
    .getByRole("textbox", { name: "Text" })
    .fill("Der Hund läuft. Die Katze schläft.");
  await page.getByRole("button", { name: "Weiter zu Modus" }).click();
  await expect(
    page.getByRole("heading", { name: "Modus wählen" }),
  ).toBeVisible();
  for (const mode of ["Laufdiktat", "Freies Üben", "Battle", "Stationen"]) {
    await expect(
      page.getByRole("button", { name: new RegExp(`^${mode} `) }),
    ).toBeVisible();
  }
  await expect(page.getByRole("button", { name: "Speichern" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^Raum (jetzt )?öffnen$/ }),
  ).toBeVisible();

  // Unter 900 px öffnet ein Modus seine Einstellungen als Fenster (16a/16b).
  const narrow = (page.viewportSize()?.width ?? 1280) < 900;
  if (narrow) {
    await page.getByRole("button", { name: /^Battle / }).click();
    const dialog = page.getByRole("dialog", { name: "Einstellungen Battle" });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: /^Tinten-Angriff/ }),
    ).toBeVisible();
    const accessible = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(accessible.violations).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  } else {
    await expect(page.getByRole("region", { name: "Optionen" })).toBeVisible();
  }

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
  await expect(page.locator(".ui-room__join")).toHaveAttribute(
    "data-hydrated",
    "true",
  );
  await page.getByRole("button", { name: "Beitreten" }).click();

  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByRole("button", { name: /Zur Code-Eingabe/ }).click();
  await expect(page.getByRole("textbox", { name: "Ziffer 1" })).toHaveValue(
    "4",
  );
});

test("a configured teacher and student can complete one live round", async ({
  browser,
}) => {
  test.skip(
    !process.env["NEXT_PUBLIC_SUPABASE_URL"] ||
      !process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"],
    "Benötigt die eigens provisionierte lokale Supabase-Pilotumgebung.",
  );

  const teacher = await browser.newPage();
  const student = await browser.newPage();
  await teacher.goto("/lehrer/live");
  await teacher
    .getByRole("textbox", { name: "Text" })
    .fill("Der Schulweg ist kurz.");
  await teacher.getByRole("button", { name: "Weiter zu Modus" }).click();
  await teacher.getByRole("button", { name: /^Raum (jetzt )?öffnen$/ }).click();
  const roomCode = (
    await teacher
      .locator('[aria-label^="Raumcode "]')
      .getAttribute("aria-label")
  )?.replace("Raumcode ", "");

  await student.goto(`/raum?code=${roomCode ?? ""}`);
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
