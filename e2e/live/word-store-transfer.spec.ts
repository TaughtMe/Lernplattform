import { expect, test } from "@playwright/test";
import { revealAndRelease } from "./hold";

/** Text-Laufdiktat: Falsch geschriebene Wörter landen im Wortspeicher des Kindes. */
test("falsch geschriebene Wörter kommen in „Aus dem Unterricht“ und werden fällig", async ({
  page,
}) => {
  await page.route("**/rest/v1/rpc/*", async (route) => {
    const name = new URL(route.request().url()).pathname.split("/").pop();
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
          session_id: "66666666-6666-4666-8666-666666666666",
          config: {
            words: [
              { id: "t1", kind: "text", targetWord: "Der Hund läuft schnell." },
            ],
            gameMode: "UEBUNG",
            wordStoreTransfer: "errors",
          },
        },
      ];
    if (name === "get_my_progress_secure") body = [];
    await route.fulfill({ json: body });
  });
  await page.goto("/raum?code=4829");

  const field = page.getByRole("textbox", { name: "Deine Antwort" });
  await revealAndRelease(page);
  await field.fill("Der Hunt läuft schnel.");
  await field.press("Enter");
  await expect(page.getByText("Noch nicht richtig")).toBeVisible();
  await field.fill("Der Hund läuft schnell.");
  await field.press("Enter");

  await expect(
    page.getByRole("heading", { name: "Geschafft, Mia!" }),
  ).toBeVisible();
  await expect(
    page.getByText(/„Hund" und „schnell" liegen jetzt in deinem Wortspeicher/),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Im Wortspeicher üben" }),
  ).toHaveAttribute("href", "/frei/german/lernwoerter");

  const stored = await page.evaluate(async () => {
    const request = indexedDB.open("lernraum:personal:v1");
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const read = (table: string) =>
      new Promise<unknown[]>((resolve, reject) => {
        const request = database
          .transaction(table, "readonly")
          .objectStore(table)
          .getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    const boxes = (await read("wordBoxes")) as Array<{
      id: string;
      words: Array<{ text: string }>;
    }>;
    const progress = (await read("learningWordProgress")) as Array<{
      word: string;
      box: number;
      attempts: number;
    }>;
    database.close();
    return {
      box: boxes.map((box) => ({
        id: box.id,
        words: box.words.map((word) => word.text),
      })),
      due: progress.map(({ word, box, attempts }) => ({ word, box, attempts })),
    };
  });
  expect(stored.box).toEqual([
    { id: "unterricht", words: ["Hund", "schnell"] },
  ]);
  expect(stored.due.sort((a, b) => a.word.localeCompare(b.word))).toEqual([
    { word: "Hund", box: 1, attempts: 0 },
    { word: "schnell", box: 1, attempts: 0 },
  ]);

  // Die Wörter zählen zu „Trainingswörter heute“.
  await page.getByRole("link", { name: "Im Wortspeicher üben" }).click();
  await expect(page.getByText("2 Trainingswörter heute")).toBeVisible();
});
