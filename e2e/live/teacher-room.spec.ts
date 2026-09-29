import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const ROOM = {
  roomId: "33333333-3333-4333-8333-333333333333",
  code: "4829",
  accessToken: "t".repeat(32),
};

const participants = [
  {
    student_key: "participant-a",
    animal_token: "Fuchs",
    animal_number: 1,
    last_seen_at: new Date().toISOString(),
  },
  {
    student_key: "participant-b",
    animal_token: "Koala",
    animal_number: 2,
    last_seen_at: null,
  },
];

const progress = (key: string, index: number, finished: boolean) => ({
  student_key: key,
  current_index: index,
  peeks: 0,
  attempts: index,
  errors: finished ? 0 : 1,
  finished,
  duration_ms: null,
  word_errors: finished ? {} : { Hof: 1 },
  station_number: null,
  app_version: null,
});

/** Stellt einen gespeicherten Lehrkraft-Raum wieder her (ohne echten Dienst). */
async function restoreRoom(page: Page, status: "lobby" | "live") {
  await page.addInitScript(
    (room) =>
      sessionStorage.setItem(
        "lernraum-teacher-live-room",
        JSON.stringify(room),
      ),
    ROOM,
  );
  await page.route("**/rest/v1/rpc/*", async (route) => {
    const name = new URL(route.request().url()).pathname.split("/").pop();
    const body =
      name === "get_room_state_secure"
        ? [
            {
              status,
              session_id: status === "live" ? "session-1" : null,
              config: {
                words: [
                  {
                    id: "a",
                    kind: "text",
                    targetWord: "Der Hund bellt laut im Hof.",
                  },
                  { id: "b", kind: "text", targetWord: "Die Katze schläft." },
                ],
              },
            },
          ]
        : name === "get_room_participants_secure"
          ? participants
          : name === "get_room_students_secure"
            ? [
                progress("participant-a", 2, true),
                progress("participant-b", 1, false),
              ]
            : null;
    await route.fulfill({ json: body });
  });
  await page.goto("/lehrer/live");
}

async function accessible(page: Page) {
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
}

test("the teacher lobby projects the code and lists joined animals", async ({
  page,
}) => {
  await restoreRoom(page, "lobby");
  await expect(page.getByRole("heading", { name: "Lobby" })).toBeVisible();
  await expect(page.getByLabel("Raumcode 4829")).toBeVisible();
  await expect(
    page.getByRole("img", { name: "QR-Code zum Raum 4829" }).first(),
  ).toBeVisible();
  await expect(page.getByText("Fuchs", { exact: true })).toBeVisible();
  await expect(page.getByText("Koala 2", { exact: true })).toBeVisible();
  await expect(page.getByText("participant-a")).toHaveCount(0);
  await accessible(page);
  await page.screenshot({
    path: test.info().outputPath("teacher-lobby.png"),
    fullPage: true,
  });
});

test("the live view shows progress per animal and the most frequent errors", async ({
  page,
}) => {
  await restoreRoom(page, "live");
  await expect(
    page.getByRole("heading", { name: "Live-Sitzung" }),
  ).toBeVisible();
  const fox = page.getByRole("listitem").filter({ hasText: "Fuchs" });
  await expect(fox.getByText("Fertig")).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Häufigste Fehler" }).getByText("Hof"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Ergebnisse als CSV" }),
  ).toBeEnabled();
  await accessible(page);
  await page.screenshot({
    path: test.info().outputPath("teacher-live.png"),
    fullPage: true,
  });
});
