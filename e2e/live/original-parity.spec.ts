import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
const LIVE_APP_VERSION = `lernraum-${JSON.parse(readFileSync("package.json", "utf8")).version}`;

async function join(
  page: Page,
  config: Record<string, unknown>,
  resume = false,
) {
  await page.route("**/rest/v1/rpc/*", async (route) => {
    const name = new URL(route.request().url()).pathname.split("/").pop();
    const body =
      name === "join_room_secure"
        ? [
            {
              room_id: "11111111-1111-4111-8111-111111111111",
              station_mode: config["stationMode"] ?? false,
              status: "live",
              assigned_student_key: "Mia",
              participant_token: "a".repeat(48),
            },
          ]
        : name === "get_room_state_secure"
          ? [
              {
                status: "live",
                session_id: "22222222-2222-4222-8222-222222222222",
                config: {
                  words: [{ id: "house", kind: "text", targetWord: "Haus" }],
                  appVersion: LIVE_APP_VERSION,
                  ...config,
                },
              },
            ]
          : name === "get_my_progress_secure"
            ? []
            : null;
    await route.fulfill({ json: body });
  });
  if (resume) {
    await page.addInitScript(() =>
      sessionStorage.setItem("lernraum-live-resume", "4829"),
    );
    await page.goto("/raum");
    return;
  }
  await page.goto("/raum?code=4829");
}
async function accessible(page: Page, screenshot: string) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
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
    path: test.info().outputPath(screenshot),
    fullPage: true,
  });
}
test("original practice hints and visible copy correction", async ({
  page,
}) => {
  await join(page, { gameMode: "UEBUNG", uebungMaxAttempts: 2 });
  await page
    .getByRole("button", { name: "Aufgabe zeigen", exact: true })
    .click();
  await page.getByRole("button", { name: "Jetzt schreiben" }).click();
  const answer = page.getByRole("textbox", { name: "Deine Antwort" });
  await answer.fill("x");
  await answer.press("Enter");
  await expect(page.getByLabel("Buchstabenhilfe")).toBeVisible();
  await answer.fill("x");
  await answer.press("Enter");
  await expect(page.getByLabel("Lösung: Haus")).toBeVisible();
  await answer.fill("Hax");
  await answer.press("Enter");
  await expect(answer).toHaveValue("Hax");
  await accessible(page, "copy-guide.png");
  await answer.fill("Haus");
  await answer.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Geschafft, Mia!" }),
  ).toBeVisible();
  await expect(page.getByText(/Tempo: .* Punkte/)).toBeVisible();
});
test("station hides on touch release and returns to number selection", async ({
  page,
}) => {
  await join(page, { stationMode: true, stationCount: 2 });
  await page.getByRole("button", { name: "1", exact: true }).click();
  const stage = page.locator(".is-active-round");
  await expect(
    page.getByRole("button", { name: "Aufgabe zeigen" }),
  ).toBeEnabled();
  await stage.evaluate((element) => {
    // WebKit/Firefox do not expose constructible Touch objects on all devices.
    // Supply the same two-contact event payload to the actual React handler.
    const event = new Event("touchstart", { bubbles: true });
    Object.defineProperty(event, "touches", {
      value: [
        { identifier: 0, target: element },
        { identifier: 1, target: element },
      ],
    });
    element.dispatchEvent(event);
  });
  await expect(page.getByText("Haus", { exact: true })).toBeVisible();
  await accessible(page, "station-reveal.png");
  await stage.evaluate((element) => {
    const event = new Event("touchend", { bubbles: true });
    Object.defineProperty(event, "touches", { value: [] });
    element.dispatchEvent(event);
  });
  await expect(page.getByText("Haus", { exact: true })).not.toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Wähle deine Nummer" }),
  ).toBeVisible({ timeout: 6000 });
});
test("mismatched versions block the round with an understandable action", async ({
  page,
}) => {
  await join(page, { appVersion: "lernraum-99.0.0" });
  await expect(
    page.getByRole("heading", {
      name: "Die App-Versionen passen noch nicht zusammen.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Aktualisierung erneut prüfen" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Aufgabe zeigen" }),
  ).not.toBeVisible();
  await accessible(page, "version-mismatch.png");
});

test("resumes the room after an update even when the code was entered manually", async ({
  page,
}) => {
  await join(page, { gameMode: "LAUFDIKTAT" }, true);
  await expect(
    page.getByRole("button", { name: "Aufgabe zeigen", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => sessionStorage.getItem("lernraum-live-resume")),
  ).toBeNull();
});
