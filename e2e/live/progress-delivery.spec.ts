import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("completion survives failed delivery, retry and reload", async ({
  page,
}) => {
  const roomId = "11111111-1111-4111-8111-111111111111";
  const sessionId = "22222222-2222-4222-8222-222222222222";
  let writes = 0;
  let saved: Record<string, unknown> | null = null;
  await page.route("**/rest/v1/rpc/*", async (route) => {
    const name = new URL(route.request().url()).pathname.split("/").pop();
    const input = route.request().postDataJSON() as Record<string, unknown>;
    let body: unknown = null;
    if (name === "join_room_secure")
      body = [
        {
          room_id: roomId,
          station_mode: false,
          status: "live",
          assigned_student_key: "Mia",
          participant_token: "a".repeat(48),
        },
      ];
    else if (name === "get_room_state_secure")
      body = [
        {
          status: "live",
          session_id: sessionId,
          config: {
            words: [{ id: "house", kind: "text", targetWord: "Haus" }],
            gameMode: "LAUFDIKTAT",
          },
        },
      ];
    else if (name === "get_my_progress_secure") body = saved ? [saved] : [];
    else if (name === "upsert_progress_secure") {
      writes++;
      if (writes === 1) {
        await route.fulfill({
          status: 503,
          json: { message: "Temporary outage" },
        });
        return;
      }
      expect(input["p_current_index"]).toBe(0);
      expect(input["p_finished"]).toBe(true);
      saved = {
        current_index: input["p_current_index"],
        peeks: input["p_peeks"],
        attempts: input["p_attempts"],
        errors: input["p_errors"],
        finished: true,
        duration_ms: input["p_duration_ms"],
        word_errors: input["p_word_errors"],
        station_number: null,
      };
    }
    await route.fulfill({ json: body });
  });
  await page.goto("/raum?code=4829");

  await page
    .getByRole("button", { name: "Aufgabe zeigen", exact: true })
    .click();
  await page.getByRole("button", { name: "Jetzt schreiben" }).click();
  await expect(
    page.getByRole("textbox", { name: "Deine Antwort" }),
  ).toBeFocused();
  await page.getByRole("textbox", { name: "Deine Antwort" }).fill("Haus");
  await page.getByRole("textbox", { name: "Deine Antwort" }).press("Enter");
  await expect(
    page.getByRole("heading", { name: "Geschafft, Mia!" }),
  ).toBeVisible();
  await expect(page.getByText(/konnte nicht gesendet werden/)).toBeVisible();
  const retry = page.getByRole("button", { name: "Erneut senden" });
  await retry.focus();
  await expect(retry).toBeFocused();
  const box = await retry.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
  await page.screenshot({
    path: test.info().outputPath("completion-retry.png"),
    fullPage: true,
  });
  await retry.press("Enter");
  await expect(page.getByText(/wurde an diese Unterrichtsrunde/)).toBeVisible();
  expect(writes).toBe(2);
  await page.reload();

  await expect(
    page.getByRole("heading", { name: "Geschafft, Mia!" }),
  ).toBeVisible();
  expect(writes).toBe(2);
});
