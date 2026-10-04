import { expect, test, type CDPSession, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const LIVE_APP_VERSION = `lernraum-${JSON.parse(readFileSync("package.json", "utf8")).version}`;

async function join(page: Page, config: Record<string, unknown>) {
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
                  words: [
                    { id: "house", kind: "text", targetWord: "Haus" },
                    { id: "tree", kind: "text", targetWord: "Baum" },
                  ],
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
  await page.goto("/raum?code=4829");
}

type Point = { x: number; y: number; id: number };

/** Echte Mehrfinger-Eingabe über das DevTools-Protokoll (nur Chromium). */
async function touch(
  cdp: CDPSession,
  type: "touchStart" | "touchMove" | "touchEnd",
  points: Point[],
) {
  await cdp.send("Input.dispatchTouchEvent", {
    type,
    touchPoints: type === "touchEnd" ? [] : points,
  });
}

test.beforeEach(({ browserName }) => {
  test.skip(browserName !== "chromium", "Echte Touch-Eingabe nur in Chromium");
});

async function surface(page: Page) {
  const box = await page.locator("[data-game-surface]").boundingBox();
  expect(box).not.toBeNull();
  const { width, height, x, y } = box!;
  return {
    left: { x: x + 30, y: y + height / 2, id: 1 },
    right: { x: x + width - 30, y: y + height / 2, id: 2 },
    middle: { x: x + width / 2, y: y + height / 2, width },
  };
}

test("two fingers show the word, slipping keeps it, release opens the field", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "Zwei-Finger-Geste ist für Touch-Geräte gedacht");
  await join(page, { gameMode: "UEBUNG" });
  const cdp = await page.context().newCDPSession(page);
  await expect(page.getByRole("heading", { name: /zu sehen\./ })).toBeVisible();
  const { left, right } = await surface(page);
  await touch(cdp, "touchStart", [left, right]);
  await expect(page.getByText("Haus", { exact: true })).toBeVisible();
  // Verrutschen: 50 px nach innen.
  await touch(cdp, "touchMove", [
    { ...left, x: left.x + 50 },
    { ...right, x: right.x - 50 },
  ]);
  await page.waitForTimeout(150);
  await expect(page.getByText("Haus", { exact: true })).toBeVisible();
  await touch(cdp, "touchEnd", []);
  const answer = page.getByRole("textbox", { name: "Deine Antwort" });
  await expect(answer).toBeVisible();
  await answer.fill("Ha");
  // Aus dem Schreibfeld erneut ansehen: Antwort bleibt erhalten.
  await page.getByRole("button", { name: /nochmal ansehen/ }).click();
  await touch(cdp, "touchStart", [left, right]);
  await expect(page.getByText("Haus", { exact: true })).toBeVisible();
  await touch(cdp, "touchEnd", []);
  await expect(answer).toHaveValue("Ha");
});

test("pinching in the middle does not zoom the game", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "Pinch ist nur auf Touch-Geräten relevant");
  await join(page, { gameMode: "UEBUNG" });
  const cdp = await page.context().newCDPSession(page);
  await expect(page.getByRole("heading", { name: /zu sehen\./ })).toBeVisible();
  const { middle } = await surface(page);
  const a = { x: middle.x - 20, y: middle.y, id: 1 };
  const b = { x: middle.x + 20, y: middle.y, id: 2 };
  await touch(cdp, "touchStart", [a, b]);
  for (let step = 1; step <= 6; step += 1) {
    await touch(cdp, "touchMove", [
      { ...a, x: a.x - step * 18 },
      { ...b, x: b.x + step * 18 },
    ]);
  }
  await touch(cdp, "touchEnd", []);
  expect(await page.evaluate(() => window.visualViewport?.scale)).toBe(1);
});

test("a station returns to the number choice three seconds after release", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "Zwei-Finger-Geste ist für Touch-Geräte gedacht");
  await join(page, { stationMode: true, stationCount: 2 });
  await page.getByRole("button", { name: "1", exact: true }).click();
  const cdp = await page.context().newCDPSession(page);
  await expect(page.getByRole("heading", { name: /zu sehen\./ })).toBeVisible();
  const { left, right } = await surface(page);
  await touch(cdp, "touchStart", [left, right]);
  await expect(page.getByText("Haus", { exact: true })).toBeVisible();
  await touch(cdp, "touchEnd", []);
  await expect(page.getByText("Haus", { exact: true })).not.toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Welche Nummer bist du?" }),
  ).toBeVisible({ timeout: 6000 });
});

test("A and L reveal on a computer and no letters land in the field", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "Tastatur-Weg für Computer");
  await join(page, { gameMode: "UEBUNG" });
  await expect(page.getByRole("heading", { name: /zu sehen\./ })).toBeVisible();
  await page.keyboard.down("a");
  await page.keyboard.down("l");
  await expect(page.getByText("Haus", { exact: true })).toBeVisible();
  await page.keyboard.up("a");
  // „l“ bleibt gedrückt: Tastenwiederholung darf nichts schreiben.
  await page.waitForTimeout(150);
  await page.keyboard.up("l");
  const answer = page.getByRole("textbox", { name: "Deine Antwort" });
  await expect(answer).toBeFocused();
  await expect(answer).toHaveValue("");
  await expect(
    page.getByRole("button", { name: /Aufgabe zeigen/ }),
  ).toHaveCount(0);
});
