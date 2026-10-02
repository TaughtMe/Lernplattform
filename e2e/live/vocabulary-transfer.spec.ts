import { expect, test, type Page } from "@playwright/test";

type RoundState = {
  sessionId: string;
  status: "live" | "ended";
  words: Array<Record<string, string>>;
  gameMode: "LAUFDIKTAT" | "UEBUNG";
  vocabularyTransfer: "errors" | "all" | "none";
};

const sessions = {
  one: "33333333-3333-4333-8333-333333333333",
  two: "44444444-4444-4444-8444-444444444444",
  three: "55555555-5555-4555-8555-555555555555",
};
const vocabulary = [
  { id: "voc-1", prompt: "house", targetWord: "Haus" },
  { id: "voc-2", prompt: "tree", targetWord: "Baum" },
  { id: "voc-3", prompt: "dog", targetWord: "Hund" },
].map((word) => ({
  ...word,
  kind: "vocabulary",
  promptLang: "en-GB",
  answerLang: "de-DE",
}));

/** Spiegelt den Raumdienst; der Zustand lässt sich zwischen Runden ändern. */
async function mockRoom(page: Page, state: RoundState) {
  await page.route("**/rest/v1/rpc/*", async (route) => {
    const name = new URL(route.request().url()).pathname.split("/").pop();
    let body: unknown = null;
    if (name === "join_room_secure")
      body = [
        {
          room_id: "11111111-1111-4111-8111-111111111111",
          station_mode: false,
          status: state.status,
          assigned_student_key: "Mia",
          participant_token: "a".repeat(48),
        },
      ];
    if (name === "get_room_state_secure")
      body = [
        {
          status: state.status,
          session_id: state.sessionId,
          config: {
            words: state.words,
            gameMode: state.gameMode,
            vocabularyTransfer: state.vocabularyTransfer,
          },
        },
      ];
    if (name === "get_my_progress_secure") body = [];
    await route.fulfill({ json: body });
  });
}

/** Minimaler Realtime-Dienst, damit die Lehrkraft die Runde beenden kann. */
async function mockRealtime(page: Page) {
  let endRound = () => {};
  await page.routeWebSocket(/realtime\/v1\/websocket/, (socket) => {
    const reply = (
      joinRef: unknown,
      ref: unknown,
      topic: unknown,
      response: object,
    ) =>
      socket.send(
        JSON.stringify([
          joinRef,
          ref,
          topic,
          "phx_reply",
          { status: "ok", response },
        ]),
      );
    let roomTopic = "";
    socket.onMessage((raw) => {
      // Binäre Broadcast-Frames (Nachrichten des Kindes) braucht dieser Test nicht.
      if (typeof raw !== "string") return;
      const [joinRef, ref, topic, event] = JSON.parse(raw);
      if (event === "phx_join") roomTopic = topic;
      if (ref) reply(joinRef, ref, topic, { postgres_changes: [] });
    });
    endRound = () =>
      socket.send(
        JSON.stringify([
          null,
          null,
          roomTopic,
          "broadcast",
          { type: "broadcast", event: "session-ended", payload: {} },
        ]),
      );
  });
  return { endRound: () => endRound() };
}

async function answerWord(page: Page, answer: string) {
  await page
    .getByRole("button", { name: "Aufgabe zeigen", exact: true })
    .click();
  await page.getByRole("button", { name: "Jetzt schreiben" }).click();
  const field = page.getByRole("textbox", { name: "Deine Antwort" });
  await field.fill(answer);
  await field.press("Enter");
}

async function readCards(page: Page) {
  return page.evaluate(async () => {
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
      Array<{ question: string; box: number; reverseBox: number }>
    >((resolve, reject) => {
      read.onsuccess = () => resolve(read.result);
      read.onerror = () => reject(read.error);
    });
    database.close();
    return values
      .map(({ question, box, reverseBox }) => ({ question, box, reverseBox }))
      .sort((a, b) => a.question.localeCompare(b.question));
  });
}

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
      page.getByText("2 neue Vokabeln sind jetzt in deiner LernBox."),
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

test("ending the round after the first word still puts all vocabulary into the LernBox", async ({
  page,
}) => {
  const state: RoundState = {
    sessionId: sessions.one,
    status: "live",
    words: vocabulary,
    gameMode: "LAUFDIKTAT",
    vocabularyTransfer: "all",
  };
  await mockRoom(page, state);
  const realtime = await mockRealtime(page);
  await page.goto("/raum?code=4829");

  await answerWord(page, "Haus");
  await expect(page.getByText("2 / 3")).toBeVisible();

  state.status = "ended";
  realtime.endRound();
  await expect(
    page.getByRole("heading", { name: "Diese Runde ist beendet." }),
  ).toBeVisible();
  await expect(
    page.getByText("3 neue Vokabeln sind jetzt in deiner LernBox."),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Zur LernBox" })).toBeVisible();

  // Wort 1 sicher gewusst (Box 2), die nicht erreichten starten in Box 1.
  expect(await readCards(page)).toEqual([
    { question: "dog", box: 1, reverseBox: 1 },
    { question: "house", box: 2, reverseBox: 1 },
    { question: "tree", box: 1, reverseBox: 1 },
  ]);
});

test("a second round with help puts a known card back into box 1 without a duplicate", async ({
  page,
}) => {
  const state: RoundState = {
    sessionId: sessions.two,
    status: "live",
    words: vocabulary.slice(0, 2),
    gameMode: "LAUFDIKTAT",
    vocabularyTransfer: "all",
  };
  await mockRoom(page, state);
  await page.goto("/raum?code=4829");

  // Runde 1: alles sicher gewusst, beide Karten starten in Box 2.
  await answerWord(page, "Haus");
  await answerWord(page, "Baum");
  await expect(
    page.getByText("2 neue Vokabeln sind jetzt in deiner LernBox."),
  ).toBeVisible();
  expect(await readCards(page)).toEqual([
    { question: "house", box: 2, reverseBox: 1 },
    { question: "tree", box: 2, reverseBox: 1 },
  ]);

  // Runde 2: „house“ dreimal falsch (Abschreibvorlage), „tree“ ein Tippfehler
  // mit Buchstabenhilfe. Nur „house“ fällt zurück in Box 1.
  state.sessionId = sessions.three;
  state.gameMode = "UEBUNG";
  await page.goto("/raum?code=4829");
  await answerWord(page, "Hous");
  const field = page.getByRole("textbox", { name: "Deine Antwort" });
  for (const wrong of ["Hau", "Hu"]) {
    await field.fill(wrong);
    await field.press("Enter");
  }
  await expect(page.getByLabel("Lösung: Haus")).toBeVisible();
  await field.fill("Haus");
  await field.press("Enter");
  await answerWord(page, "Bam");
  await expect(page.getByLabel("Buchstabenhilfe")).toBeVisible();
  await field.fill("Baum");
  await field.press("Enter");
  await expect(
    page.getByText("2 Vokabeln üben wir noch einmal."),
  ).toBeVisible();

  expect(await readCards(page)).toEqual([
    { question: "house", box: 1, reverseBox: 1 },
    { question: "tree", box: 2, reverseBox: 1 },
  ]);
});
