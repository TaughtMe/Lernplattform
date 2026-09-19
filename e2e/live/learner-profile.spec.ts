import { expect, test } from "@playwright/test";

test("failed automatic join keeps the code and retries only on request", async ({
  page,
}) => {
  let attempts = 0;
  await page.route("**/rest/v1/rpc/join_room_secure", async (route) => {
    attempts++;
    await route.fulfill({ json: [] });
  });
  await page.goto("/raum?code=4829");
  await expect(page.getByRole("alert")).toBeVisible();
  expect(attempts).toBe(1);
  await page.getByRole("button", { name: /Zur Code-Eingabe/ }).click();
  await expect(page.getByRole("textbox", { name: "Ziffer 1" })).toHaveValue(
    "4",
  );
  await page.getByRole("button", { name: "Beitreten", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  expect(attempts).toBe(2);
});

for (const preset of [true, false]) {
  test(`code link joins once with ${preset ? "saved" : "random"} animal and resumes identity`, async ({
    page,
  }) => {
    if (preset)
      await page.addInitScript(() => {
        localStorage.setItem(
          "lernraum:personal:profile:v1",
          JSON.stringify({ version: 1, animal: "Fuchs", adjective: "Flink" }),
        );
      });
    const joins: Record<string, string | null>[] = [];
    await page.route("**/rest/v1/rpc/*", async (route) => {
      const joining = route.request().url().endsWith("/join_room_secure");
      if (joining) joins.push(route.request().postDataJSON());
      await route.fulfill({
        json: joining
          ? [
              {
                room_id: "11111111-1111-4111-8111-111111111111",
                station_mode: false,
                status: "lobby",
                assigned_student_key: `${joins[0]!["p_student_key"]} 2`,
                participant_token: "a".repeat(48),
              },
            ]
          : [{ status: "lobby", session_id: null, config: {} }],
      });
    });
    await page.goto("/raum?code=4829");
    await expect(
      page.getByRole("heading", { name: /Du bist dabei/ }),
    ).toBeVisible();
    expect(joins).toHaveLength(1);
    expect(joins[0]!["p_participant_token"]).toBeNull();
    if (preset) expect(joins[0]!["p_student_key"]).toBe("Flinker Fuchs");
    else
      expect(
        await page.evaluate(
          () =>
            JSON.parse(localStorage.getItem("lernraum:personal:profile:v1")!)
              .animal,
        ),
      ).toBeTruthy();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: /Du bist dabei/ }),
    ).toBeVisible();
    expect(joins).toHaveLength(2);
    expect(joins[1]!["p_student_key"]).toBe(`${joins[0]!["p_student_key"]} 2`);
    expect(joins[1]!["p_participant_token"]).toBe("a".repeat(48));
    if (preset)
      await expect(page.locator("img.live-room-lobby-avatar")).toHaveAttribute(
        "src",
        "/animals/fuchs.svg",
      );
  });
}
