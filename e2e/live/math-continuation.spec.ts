import { expect, test } from "@playwright/test";

for (const withError of [true, false])
  test(`a finished math learner practices locally (errors: ${withError}) while the room remains live`, async ({
    page,
  }) => {
    let saved: Record<string, unknown> | null = null;
    const writes: Record<string, unknown>[] = [];
    await page.route("**/rest/v1/rpc/*", async (route) => {
      const name = new URL(route.request().url()).pathname.split("/").pop();
      const input = route.request().postDataJSON() as Record<string, unknown>;
      let body: unknown = null;
      if (name === "join_room_secure")
        body = [
          {
            room_id: "11111111-1111-4111-8111-111111111111",
            station_mode: false,
            status: "live",
            assigned_student_key: "Mia",
            participant_token: "a".repeat(48),
          },
        ];
      if (name === "get_room_state_secure")
        body = [
          {
            status: "live",
            session_id: "22222222-2222-4222-8222-222222222222",
            config: {
              words: [
                {
                  id: "math-1",
                  kind: "math",
                  prompt: "7 · 8",
                  targetWord: "56",
                },
              ],
              gameMode: "LAUFDIKTAT",
            },
          },
        ];
      if (name === "get_my_progress_secure") body = saved ? [saved] : [];
      if (name === "upsert_progress_secure") {
        writes.push(input);
        saved = {
          current_index: input["p_current_index"],
          peeks: input["p_peeks"],
          attempts: input["p_attempts"],
          errors: input["p_errors"],
          finished: input["p_finished"],
          duration_ms: input["p_duration_ms"],
          word_errors: input["p_word_errors"],
          station_number: null,
        };
        expect(JSON.stringify(input)).not.toContain('"answer"');
      }
      await route.fulfill({ json: body });
    });
    await page.goto("/raum?code=4829");

    await page
      .getByRole("button", { name: "Aufgabe zeigen", exact: true })
      .click();
    await page.getByRole("button", { name: "Jetzt schreiben" }).click();
    const answer = page.getByRole("textbox", { name: "Deine Antwort" });
    if (withError) {
      await answer.fill("54");
      await answer.press("Enter");
      await expect(
        page.getByText("Noch nicht richtig. Versuche es erneut."),
      ).toBeVisible();
    }
    await answer.fill("56");
    await answer.press("Enter");
    await expect(
      page.getByRole("heading", { name: "Geschafft, Mia!" }),
    ).toBeVisible();
    await expect(
      page.getByText(/wurde an diese Unterrichtsrunde/),
    ).toBeVisible();
    const count = writes.length;
    expect(writes.at(-1)).toMatchObject({
      p_finished: true,
      p_errors: withError ? 1 : 0,
    });
    await page
      .getByRole("link", {
        name: withError ? "Meine Fehler üben" : "Weitere Aufgaben üben",
      })
      .click();
    const practice = page.getByRole("textbox", { name: "Dein Ergebnis" });
    await expect(practice).toBeFocused();
    await practice.fill("999");
    await practice.press("Enter");
    await expect(
      page.getByText("Noch nicht – probiere es erneut."),
    ).toBeVisible();
    expect(writes).toHaveLength(count);
    await page.goto("/frei/mathematics");
    await expect(
      page.getByRole("button", {
        name: "Meine Fehler und Wiederholungen üben",
      }),
    ).toBeVisible();
  });
