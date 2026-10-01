import { expect, test } from "@playwright/test";

for (const gameMode of ["LAUFDIKTAT", "UEBUNG"] as const)
  test(`vocabulary from a ${gameMode} round lands in the learner's LernBox with its tag`, async ({
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
            session_id: "33333333-3333-4333-8333-333333333333",
            config: {
              words: [
                {
                  id: "voc-1",
                  kind: "vocabulary",
                  prompt: "house",
                  targetWord: "Haus",
                  promptLang: "en-GB",
                  answerLang: "de-DE",
                },
                {
                  id: "voc-2",
                  kind: "vocabulary",
                  prompt: "tree",
                  targetWord: "Baum",
                  promptLang: "en-GB",
                  answerLang: "de-DE",
                  tag: "Unit 3",
                },
              ],
              gameMode,
              vocabularyTransfer: "all",
              vocabularyTag: "Buch Klasse 5",
            },
          },
        ];
      if (name === "get_my_progress_secure") body = [];
      await route.fulfill({ json: body });
    });
    await page.goto("/raum?code=4829");

    for (const answer of ["Haus", "Baum"]) {
      await page
        .getByRole("button", { name: "Aufgabe zeigen", exact: true })
        .click();
      await page.getByRole("button", { name: "Jetzt schreiben" }).click();
      const field = page.getByRole("textbox", { name: "Deine Antwort" });
      await field.fill(answer);
      await field.press("Enter");
    }
    await expect(
      page.getByRole("heading", { name: "Geschafft, Mia!" }),
    ).toBeVisible();
    await expect(
      page.getByText("2 Vokabeln wurden in deine LernBox übernommen."),
    ).toBeVisible();

    const cards = await page.evaluate(async () => {
      const request = indexedDB.open("lernraum:personal:v1");
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const read = database
        .transaction("learningBoxCards", "readonly")
        .objectStore("learningBoxCards")
        .getAll();
      const values = await new Promise<
        Array<{ question: string; answer: string; tag?: string }>
      >((resolve, reject) => {
        read.onsuccess = () => resolve(read.result);
        read.onerror = () => reject(read.error);
      });
      database.close();
      return values
        .map(({ question, answer, tag }) => ({ question, answer, tag }))
        .sort((a, b) => a.question.localeCompare(b.question));
    });
    expect(cards).toEqual([
      { question: "house", answer: "Haus", tag: "Buch Klasse 5" },
      { question: "tree", answer: "Baum", tag: "Unit 3" },
    ]);
  });
