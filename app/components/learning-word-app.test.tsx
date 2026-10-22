import "fake-indexeddb/auto";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resetSpeechState } from "../../src/speech/speaker";
import type { DailyPlanItem } from "../../src/domain/daily-plan";
import {
  learningWordId,
  type LearningWordProgress,
} from "../../src/domain/learning-word-progress";
import { learningEventV1Schema } from "../../src/domain/learning-bundle";
import { localDayKey } from "../../src/domain/local-day";
import { resolveStages, resolveVisibility } from "../../src/domain/release";
import { createDailyPlanRepository } from "../../src/storage/daily-plan";
import type { LearningWordStage } from "../../src/domain/learning-word";
import {
  PersonalLearningDatabase,
  createLearningWordProgressRepository,
  createWordBoxRepository,
  createWordRoundRepository,
} from "../../src/storage/personal-learning-events";
import { ReleaseProvider } from "../release/release-context";
import { LearningWordApp } from "./learning-word-app";

const databases: PersonalLearningDatabase[] = [];

async function setup(
  options: {
    query?: string | undefined;
    stages?: string | undefined;
    /** Speichert den Plan des heutigen Tages mit diesen Elementen. */
    plan?: (words: LearningWordProgress[]) => DailyPlanItem[];
    /** Alle Plan-Elemente sind heute schon beantwortet. */
    doneToday?: boolean;
    prepare?: (repositories: {
      database: PersonalLearningDatabase;
      boxes: ReturnType<typeof createWordBoxRepository>;
      rounds: ReturnType<typeof createWordRoundRepository>;
      progress: ReturnType<typeof createLearningWordProgressRepository>;
    }) => Promise<void>;
  } = {},
) {
  const database = new PersonalLearningDatabase(`ws-${crypto.randomUUID()}`);
  databases.push(database);
  const repositories = {
    boxes: createWordBoxRepository(database),
    rounds: createWordRoundRepository(database),
    progress: createLearningWordProgressRepository(database),
    plan: createDailyPlanRepository(database),
  };
  await options.prepare?.({ database, ...repositories });
  if (options.plan) {
    const now = new Date();
    const items = options.plan(await repositories.progress.list());
    await database.dailyPlans.put({
      day: localDayKey(now),
      createdAt: new Date(now.getTime() - 60_000).toISOString(),
      size: 20,
      items,
    });
    if (options.doneToday)
      await database.learningEvents.bulkAdd(
        items.map((entry) =>
          answeredToday(
            entry.objectIds[0]!,
            new Date(now.getTime() - 30_000).toISOString(),
          ),
        ),
      );
  }
  window.history.pushState(
    null,
    "",
    `/frei/german/lernwoerter${options.query ?? ""}`,
  );
  render(
    <ReleaseProvider
      value={resolveVisibility(resolveStages(options.stages), false)}
    >
      <LearningWordApp repositories={repositories} />
    </ReleaseProvider>,
  );
  return { database, ...repositories };
}

/** Schreibt einen Lernstand direkt: Boxen steigen nur in der fälligen Wiederholung. */
async function seedProgress(
  database: PersonalLearningDatabase,
  word: string,
  values: {
    box: LearningWordProgress["box"];
    stage?: LearningWordStage;
    dueAt?: string;
  },
) {
  await database.learningWordProgress.put({
    id: learningWordId(word),
    word,
    stage: values.stage ?? 1,
    box: values.box,
    dueAt: values.dueAt ?? "2099-01-01T00:00:00.000Z",
    attempts: 4,
    incorrectAttempts: 0,
    helpUses: 0,
    lastPracticedAt: "2026-10-01T08:00:00.000Z",
  });
}

/** Ein heute nach dem Plan beantwortetes Element: Es gilt als erledigt. */
function answeredToday(objectId: string, occurredAt: string) {
  return learningEventV1Schema.parse({
    id: `erledigt-${objectId}`,
    learningObjectId: objectId,
    occurredAt,
    source: "lesson",
    learningArea: "german",
    roundId: "heute-erledigt",
    direction: "prompt-to-answer",
    answerMode: "typed",
    help: "none",
    assessment: {
      knowledge: "correct",
      writing: "correct",
      selfCorrected: false,
    },
  });
}

afterEach(async () => {
  window.history.pushState(null, "", "/");
  await Promise.all(
    databases.splice(0).map(async (database) => {
      database.close();
      await database.delete();
    }),
  );
});

const SLOW = { timeout: 4000 };

async function openBox(
  user: ReturnType<typeof userEvent.setup>,
  title: string,
) {
  const tile = await screen.findByRole("button", {
    name: new RegExp(`^${title}`),
  });
  await waitFor(() => expect(tile).toBeEnabled());
  await user.click(tile);
}

async function startRound(
  user: ReturnType<typeof userEvent.setup>,
  stage: LearningWordStage,
) {
  const sheet = await screen.findByRole("dialog");
  await user.click(
    within(sheet).getByRole("button", {
      name: new RegExp(`^Stufe ${stage}:`),
    }),
  );
  await user.selectOptions(
    within(sheet).getByLabelText("Wörter in dieser Runde"),
    "all",
  );
  await user.click(within(sheet).getByRole("button", { name: "Starten" }));
}

async function answer(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.type(
    await screen.findByLabelText("Deine Lösung"),
    `${text}{Enter}`,
  );
}

describe("Übersicht", () => {
  it("zeigt Wortboxen als Kacheln mit Fortschritt und letztem Ergebnis", async () => {
    await setup({
      prepare: async ({ database, boxes, rounds }) => {
        const box = await boxes.create("Meine Tiere", [
          "Hund",
          "Katze",
          "Maus",
          "Pferd",
        ]);
        // Box 3 und höher gilt als „sicher“.
        for (const word of ["Hund", "Katze"]) {
          await seedProgress(database, word, { box: 4 });
        }
        await rounds.save({
          id: "alt",
          boxId: box.id,
          boxTitle: box.title,
          stage: 3,
          startedAt: "2026-10-09T08:00:00.000Z",
          completedAt: "2026-10-09T08:05:00.000Z",
          words: [
            {
              word: "Hund",
              firstTry: true,
              attempts: 1,
              usedHelp: false,
              firstResult: "richtig",
            },
          ],
          percent: 80,
        });
      },
    });
    const tile = await screen.findByRole("button", { name: /^Meine Tiere/ });
    expect(tile).toHaveTextContent("Hund, Katze, Maus");
    expect(tile).toHaveTextContent("2 / 4 sicher");
    expect(tile).toHaveTextContent("Stufe 3 · 25 % der Box (1 von 4 Wörtern)");
    expect(tile).not.toHaveTextContent("Bestwert");
    expect(
      screen.getByRole("button", { name: /^Doppelkonsonanten/ }),
    ).toHaveTextContent("Noch nicht geübt");
    expect(
      screen.getByRole("button", { name: /^s, ss und ß/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Neue Wortbox" }),
    ).toBeInTheDocument();
  });

  it("zeigt „Aus dem Unterricht“ zuerst, danach eigene und feste Wortboxen", async () => {
    await setup({
      prepare: async ({ boxes }) => {
        await boxes.create("Eigene Box", ["Haus"]);
        await boxes.importFromLesson({
          words: ["Hund"],
          errorWords: ["Hund"],
          sourceId: "s",
        });
      },
    });
    await screen.findByRole("button", { name: /^Aus dem Unterricht/ });
    const titles = screen
      .getAllByRole("listitem")
      .map((item) => item.querySelector("span")?.textContent)
      .filter(Boolean);
    expect(titles.slice(0, 3)).toEqual([
      "Aus dem Unterricht",
      "Eigene Box",
      "Doppelkonsonanten",
    ]);
    // „Hund“ ist sofort fällig.
    expect(await screen.findByText("1")).toBeInTheDocument();
  });
});

describe("Wortlisten", () => {
  it("legt eine Wortbox an, fügt Wörter hinzu, ändert, löscht und löscht die Wortbox", async () => {
    const user = userEvent.setup();
    const { boxes } = await setup();
    const newBox = await screen.findByRole("button", { name: "Neue Wortbox" });
    await waitFor(() => expect(newBox).toBeEnabled());
    await user.click(newBox);
    const dialog = await screen.findByRole("dialog");
    await user.type(
      within(dialog).getByLabelText("Name der Wortbox"),
      "Meine Wörter",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Wortbox anlegen" }),
    );

    expect(
      await screen.findByRole("heading", { name: "Meine Wörter" }),
    ).toBeInTheDocument();
    const field = screen.getByLabelText(/Wort hinzufügen/);
    await user.type(field, "Sonne, Mond; sonne{Enter}");
    // Eine eingefügte Liste mit Zeilenumbruch wird getrennt.
    await user.click(field);
    await user.paste("Stern\nsonne");
    const list = await screen.findByRole("list", {
      name: "Wörter in Meine Wörter",
    });
    await waitFor(() =>
      expect(within(list).getAllByRole("listitem")).toHaveLength(3),
    );

    await user.click(screen.getByRole("button", { name: "‚Mond‘ ändern" }));
    const edit = screen.getByRole("textbox", { name: "‚Mond‘ ändern zu" });
    await user.clear(edit);
    await user.type(edit, "Monde{Enter}");
    expect(await screen.findByText("Monde")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "‚Sonne‘ löschen" }));
    await waitFor(() =>
      expect(screen.queryByText("Sonne")).not.toBeInTheDocument(),
    );
    expect((await boxes.list())[0]!.words.map((w) => w.text)).toEqual([
      "Monde",
      "Stern",
    ]);

    await user.click(screen.getByRole("button", { name: "Wortbox löschen" }));
    await user.click(
      screen.getByRole("button", { name: "Ja, Wortbox löschen" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Wortspeicher" }),
    ).toBeInTheDocument();
    expect(await boxes.list()).toEqual([]);
  });

  it("kopiert eine feste Wortbox als eigene", async () => {
    const user = userEvent.setup();
    const { boxes } = await setup();
    const menu = await screen.findByRole("button", {
      name: "Wortliste von Doppelkonsonanten",
    });
    await waitFor(() => expect(menu).toBeEnabled());
    await user.click(menu);
    expect(
      screen.queryByRole("button", { name: /ändern$/ }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Als eigene Wortbox kopieren" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Doppelkonsonanten (Kopie)" }),
    ).toBeInTheDocument();
    expect(await boxes.list()).toHaveLength(1);
  });
});

describe("Startblatt", () => {
  it("zeigt das letzte Ergebnis je Stufe und die empfohlene Stufe", async () => {
    const user = userEvent.setup();
    await setup({
      prepare: async ({ boxes, rounds, progress }) => {
        const box = await boxes.create("Tiere", ["Hund"]);
        await progress.recordAttempt({
          words: ["Hund"],
          correct: true,
          usedHelp: false,
          selfCorrected: false,
          stage: 2,
          roundId: "r",
          attemptId: "0",
        });
        await rounds.save({
          id: "alt",
          boxId: box.id,
          boxTitle: box.title,
          stage: 2,
          startedAt: "2026-10-09T08:00:00.000Z",
          completedAt: "2026-10-09T08:05:00.000Z",
          words: [
            {
              word: "Hund",
              firstTry: true,
              attempts: 1,
              usedHelp: false,
              firstResult: "richtig",
            },
          ],
          percent: 80,
        });
      },
    });
    await openBox(user, "Tiere");
    const sheet = await screen.findByRole("dialog");
    expect(
      within(sheet).getByRole("button", { name: /Stufe 2:.*100 % der Box/ }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      within(sheet).getByRole("button", { name: /Stufe 1:.*Zuletzt –/ }),
    ).toBeInTheDocument();
    expect(sheet).not.toHaveTextContent("Bestwert");
    expect(sheet).not.toHaveTextContent("Zuletzt 80 %");
    // Richtig auf Stufe 2 setzt die Merkstufe des Wortes auf 2, ohne +1 (W-8).
    expect(
      within(sheet).getByRole("button", { name: /Stufe 2:.*empfohlen/ }),
    ).toBeInTheDocument();
    // Ohne deutsche Stimme ist Stufe 6 sichtbar, aber nicht wählbar.
    expect(
      within(sheet).getByRole("button", { name: /Stufe 6/ }),
    ).toBeDisabled();
  });

  it("öffnet sich mit ?sammlung= für die passende Wortbox", async () => {
    await setup({ query: "?sammlung=silent-h" });
    expect(
      await screen.findByRole("dialog", { name: "Dehnungs-h" }),
    ).toBeInTheDocument();
  });

  it("ignoriert ungültige Adressparameter", async () => {
    await setup({ query: "?woerter=<b>&sammlung=gibt-es-nicht" });
    expect(
      await screen.findByRole("heading", { name: "Wortspeicher" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("Runden", () => {
  async function oneWordBox(stages?: string) {
    return setup({
      stages,
      prepare: async ({ boxes }) => {
        await boxes.create("Test", ["Ball"]);
      },
    });
  }

  it.each([1, 2, 3] as const)("spielt Stufe %i durch", async (stage) => {
    const user = userEvent.setup();
    const { rounds } = await oneWordBox();
    await openBox(user, "Test");
    await startRound(user, stage);
    await answer(user, "Ball");
    expect(
      await screen.findByRole("heading", { name: "Geschafft!" }, SLOW),
    ).toBeInTheDocument();
    expect(screen.getByText("100 %")).toBeInTheDocument();
    await waitFor(async () => expect(await rounds.list()).toHaveLength(1));
    expect((await rounds.list())[0]).toMatchObject({
      stage,
      percent: 100,
      boxTitle: "Test",
    });
  });

  it("spielt Stufe 4 mit Merken und Eingabe auf den Strichen", async () => {
    const user = userEvent.setup();
    await oneWordBox();
    await openBox(user, "Test");
    await startRound(user, 4);
    expect(await screen.findByText("Ball")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Wörter verdecken" }));
    expect(screen.queryByText("Ball")).not.toBeInTheDocument();
    await answer(user, "Ball");
    expect(
      await screen.findByRole("heading", { name: "Geschafft!" }, SLOW),
    ).toBeInTheDocument();
  });

  it("spielt Stufe 5 je Wort und zeigt den Prozentwert", async () => {
    const user = userEvent.setup();
    const { rounds } = await setup({
      prepare: async ({ boxes }) => {
        await boxes.create("Drei", ["Ball", "Haus", "Baum"]);
      },
    });
    await openBox(user, "Drei");
    const sheet = await screen.findByRole("dialog");
    await user.click(within(sheet).getByRole("button", { name: /Stufe 5:/ }));
    await user.selectOptions(
      within(sheet).getByLabelText("Wörter in dieser Runde"),
      "all",
    );
    await user.selectOptions(
      within(sheet).getByLabelText("Wörter pro Merkblock"),
      "3",
    );
    await user.click(within(sheet).getByRole("button", { name: "Starten" }));
    await user.click(
      await screen.findByRole("button", { name: "Wörter verdecken" }),
    );
    const field = await screen.findByLabelText("Deine Lösung");
    await user.type(
      field,
      "Ball{Shift>}{Enter}{/Shift}Haus{Shift>}{Enter}{/Shift}Baun{Enter}",
    );
    // Ein Wort falsch: Rückmeldung je Wort, dann erneut versuchen.
    expect(await screen.findByText("Noch nicht sicher")).toBeInTheDocument();
    expect(screen.getByText(/Noch nicht: Baum/)).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Noch einmal versuchen" }),
    );
    await user.click(
      await screen.findByRole("button", { name: "Wörter verdecken" }),
    );
    await user.type(
      await screen.findByLabelText("Deine Lösung"),
      "Baum{Shift>}{Enter}{/Shift}Ball{Shift>}{Enter}{/Shift}Haus{Enter}",
    );
    expect(
      await screen.findByRole("heading", { name: "Geschafft!" }, SLOW),
    ).toBeInTheDocument();
    expect(screen.getByText("67 %")).toBeInTheDocument();
    expect(
      screen.getByText("2 von 3 Wörtern dieser Runde auf Anhieb richtig"),
    ).toBeInTheDocument();
    await waitFor(async () => expect(await rounds.list()).toHaveLength(1));
  });

  it("zeigt nach einem Fehler den Buchstabenvergleich", async () => {
    const user = userEvent.setup();
    await oneWordBox();
    await openBox(user, "Test");
    await startRound(user, 1);
    await answer(user, "Bal");
    expect(await screen.findByText("Noch nicht sicher")).toBeInTheDocument();
    expect(
      screen.getByText("Fast richtig: ein Buchstabe ist anders."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("list", { name: "Das ist anders" }),
    ).toHaveTextContent(/Buchstabe fehlt: l/);
    expect(
      screen.getByText(/Du hast „Bal“ geschrieben, richtig ist „Ball“/),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Noch einmal versuchen" }),
    );
    await answer(user, "Ball");
    expect(
      await screen.findByRole("heading", { name: "Geschafft!" }, SLOW),
    ).toBeInTheDocument();
    // Selbstkorrektur zählt im Prozentwert nicht.
    expect(screen.getByText("0 %")).toBeInTheDocument();
  });

  it("verhindert „auf Anhieb“, wenn „Wort zeigen“ benutzt wurde", async () => {
    const user = userEvent.setup();
    await oneWordBox();
    await openBox(user, "Test");
    await startRound(user, 2);
    await user.click(
      await screen.findByRole("button", { name: "Wort zeigen" }),
    );
    expect(screen.getByRole("status")).toHaveTextContent("Ball");
    await answer(user, "Ball");
    expect(
      await screen.findByRole("heading", { name: "Geschafft!" }, SLOW),
    ).toBeInTheDocument();
    expect(screen.getByText("0 %")).toBeInTheDocument();
    expect(
      screen.getAllByText("mit Hilfe")[0]!.previousSibling,
    ).toHaveTextContent("1");
  });

  it("zeigt keinen Rekord, speichert jede Runde nur einmal und zeigt im Startblatt das letzte Ergebnis", async () => {
    const user = userEvent.setup();
    const { rounds } = await oneWordBox();
    await openBox(user, "Test");
    await startRound(user, 1);
    await answer(user, "Bal");
    await user.click(
      await screen.findByRole("button", { name: "Noch einmal versuchen" }),
    );
    await answer(user, "Ball");
    expect(
      await screen.findByRole("heading", { name: "Geschafft!" }, SLOW),
    ).toBeInTheDocument();
    expect(screen.getByText("0 %")).toBeInTheDocument();
    expect(screen.queryByText(/Bestwert/)).not.toBeInTheDocument();
    expect(screen.getByText("Heute 1 Wort geübt")).toBeInTheDocument();
    // Box-Fortschritt inklusive der gerade beendeten Runde (W-10).
    expect(
      screen.getByText(
        "Wortbox: 0 von 1 Wort auf Stufe 1 auf Anhieb richtig (0 %)",
      ),
    ).toBeInTheDocument();
    await waitFor(async () => expect(await rounds.list()).toHaveLength(1));

    await user.click(screen.getByRole("button", { name: "Nochmal üben" }));
    await answer(user, "Ball");
    expect(await screen.findByText("100 %", {}, SLOW)).toBeInTheDocument();
    expect(screen.queryByText(/Bestwert/)).not.toBeInTheDocument();
    // Die Übungsmenge des Tages zählt beide Runden.
    expect(screen.getByText("Heute 2 Wörter geübt")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Wortbox: 1 von 1 Wort auf Stufe 1 auf Anhieb richtig (100 %)",
      ),
    ).toBeInTheDocument();
    await waitFor(async () => expect(await rounds.list()).toHaveLength(2));

    // Im Startblatt steht jetzt das letzte Ergebnis, nicht der Bestwert.
    await user.click(
      screen.getByRole("button", { name: "Andere Stufe wählen" }),
    );
    const sheet = await screen.findByRole("dialog");
    expect(
      await within(sheet).findByRole("button", {
        name: /Stufe 1:.*100 % der Box/,
      }),
    ).toBeInTheDocument();
  });

  it("speichert beim Beenden keine Runde, behält aber den Lernstand", async () => {
    const user = userEvent.setup();
    const { rounds, progress } = await oneWordBox();
    await openBox(user, "Test");
    await startRound(user, 1);
    await answer(user, "Bal");
    await screen.findByText("Noch nicht sicher");
    await user.click(screen.getByRole("button", { name: "Übung beenden" }));
    expect(
      await screen.findByRole("heading", { name: "Wortspeicher" }),
    ).toBeInTheDocument();
    expect(await rounds.list()).toEqual([]);
    expect((await progress.list())[0]).toMatchObject({
      word: "Ball",
      incorrectAttempts: 1,
    });
  });

  it("startet „Gemischt trainieren“ mit den fälligen Wörtern", async () => {
    const user = userEvent.setup();
    await setup({
      prepare: async ({ boxes }) => {
        await boxes.importFromLesson({
          words: ["Hund"],
          errorWords: ["Hund"],
          sourceId: "s",
        });
      },
    });
    const mixed = await screen.findByRole("button", {
      name: "Gemischt trainieren",
    });
    await waitFor(() => expect(mixed).toBeEnabled());
    expect(screen.getByText("Trainingswort heute")).toBeInTheDocument();
    await user.click(mixed);
    expect(
      await screen.findByRole("dialog", { name: "Trainingswörter heute" }),
    ).toBeInTheDocument();
  });
});

describe("Freies Üben und fällige Wiederholung", () => {
  const FUTURE = "2099-01-01T00:00:00.000Z";

  it("ändert beim freien Üben die Box nicht, auch nicht auf Stufe 1", async () => {
    const user = userEvent.setup();
    const { progress } = await setup({
      prepare: async ({ database, boxes }) => {
        await boxes.create("Test", ["Ball"]);
        await seedProgress(database, "Ball", { box: 3, stage: 3 });
      },
    });
    await openBox(user, "Test");
    await startRound(user, 1);
    await answer(user, "Ball");
    await screen.findByRole("heading", { name: "Geschafft!" }, SLOW);
    await waitFor(async () =>
      expect((await progress.list())[0]).toMatchObject({ attempts: 5 }),
    );
    expect((await progress.list())[0]).toMatchObject({
      box: 3,
      stage: 3,
      dueAt: FUTURE,
    });
  });

  it("macht beim freien Üben ein falsches Wort bis zum nächsten Tag fällig, ohne die Box zu ändern", async () => {
    const user = userEvent.setup();
    const { progress } = await setup({
      prepare: async ({ database, boxes }) => {
        await boxes.create("Test", ["Ball"]);
        await seedProgress(database, "Ball", { box: 3, stage: 3 });
      },
    });
    await openBox(user, "Test");
    await startRound(user, 1);
    await answer(user, "Bal");
    await screen.findByText("Noch nicht sicher");
    await user.click(
      screen.getByRole("button", { name: "Noch einmal versuchen" }),
    );
    await answer(user, "Ball");
    await screen.findByRole("heading", { name: "Geschafft!" }, SLOW);
    await waitFor(async () =>
      expect((await progress.list())[0]).toMatchObject({ attempts: 6 }),
    );
    const [ball] = await progress.list();
    expect(ball).toMatchObject({ box: 3, stage: 1 });
    const dueAt = new Date(ball!.dueAt).getTime();
    expect(dueAt).toBeGreaterThan(Date.now());
    expect(dueAt).toBeLessThanOrEqual(Date.now() + 86_400_000);
  });

  it("sperrt in „Trainingswörter heute“ die Stufen 1 bis 3 und wählt Stufe 4 vor", async () => {
    const user = userEvent.setup();
    await setup({
      prepare: async ({ boxes }) => {
        await boxes.importFromLesson({
          words: ["Hund"],
          errorWords: ["Hund"],
          sourceId: "s",
        });
      },
    });
    const mixed = await screen.findByRole("button", {
      name: "Gemischt trainieren",
    });
    await waitFor(() => expect(mixed).toBeEnabled());
    await user.click(mixed);
    const sheet = await screen.findByRole("dialog", {
      name: "Trainingswörter heute",
    });
    for (const stage of [1, 2, 3]) {
      const card = within(sheet).getByRole("button", {
        name: new RegExp(`^Stufe ${stage}:`),
      });
      expect(card).toBeDisabled();
      expect(card).toHaveTextContent(
        "In der Wiederholung schreibst du die Wörter aus dem Kopf.",
      );
    }
    expect(
      within(sheet).getByRole("button", { name: /^Stufe 4:/ }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      within(sheet).getByRole("button", { name: /^Stufe 4:/ }),
    ).toBeEnabled();
    expect(
      within(sheet).getByRole("button", { name: /^Stufe 5:/ }),
    ).toBeEnabled();
  });

  it("lässt andere Wortboxen unverändert wählbar", async () => {
    const user = userEvent.setup();
    await setup({
      prepare: async ({ boxes }) => {
        await boxes.create("Test", ["Ball"]);
      },
    });
    await openBox(user, "Test");
    const sheet = await screen.findByRole("dialog");
    for (const stage of [1, 2, 3, 4, 5]) {
      expect(
        within(sheet).getByRole("button", {
          name: new RegExp(`^Stufe ${stage}:`),
        }),
      ).toBeEnabled();
    }
  });

  it("hebt in „Trainingswörter heute“ die Box nur beim ersten Versuch eines fälligen Wortes", async () => {
    const user = userEvent.setup();
    const { progress } = await setup({
      prepare: async ({ boxes }) => {
        await boxes.importFromLesson({
          words: ["Hund", "Katze"],
          errorWords: ["Hund", "Katze"],
          sourceId: "s",
        });
      },
    });
    const mixed = await screen.findByRole("button", {
      name: "Gemischt trainieren",
    });
    await waitFor(() => expect(mixed).toBeEnabled());
    await user.click(mixed);
    const sheet = await screen.findByRole("dialog");
    await user.selectOptions(
      within(sheet).getByLabelText("Wörter in dieser Runde"),
      "all",
    );
    await user.click(within(sheet).getByRole("button", { name: "Starten" }));

    // Stufe 4: Merken, verdecken, schreiben. Die Reihenfolge der Wörter ist zufällig.
    const first = await readMemorizedWord();
    await user.click(screen.getByRole("button", { name: "Wörter verdecken" }));
    await answer(user, first);
    const second = await readMemorizedWord();
    await user.click(screen.getByRole("button", { name: "Wörter verdecken" }));
    // Erster Versuch falsch, dann richtig: Box 1, morgen fällig.
    await answer(user, "Xx");
    await user.click(
      await screen.findByRole("button", { name: "Noch einmal versuchen" }),
    );
    await user.click(
      await screen.findByRole("button", { name: "Wörter verdecken" }),
    );
    await answer(user, second);
    await screen.findByRole("heading", { name: "Geschafft!" }, SLOW);

    await waitFor(async () =>
      expect((await progress.list()).every((entry) => entry.attempts > 0)).toBe(
        true,
      ),
    );
    const byWord = new Map((await progress.list()).map((e) => [e.word, e]));
    expect(byWord.get(first)).toMatchObject({ box: 2, stage: 4 });
    expect(new Date(byWord.get(first)!.dueAt).getTime()).toBeGreaterThan(
      Date.now() + 2 * 86_400_000,
    );
    expect(byWord.get(second)).toMatchObject({ box: 1 });
    expect(new Date(byWord.get(second)!.dueAt).getTime()).toBeLessThanOrEqual(
      Date.now() + 86_400_000,
    );
  });

  /** Das Wort, das in der Merkphase auf dem Bildschirm steht („Hund“ oder „Katze“). */
  async function readMemorizedWord() {
    const word = await screen.findByText(/^(Hund|Katze)$/);
    return word.textContent!;
  }

  it("zeigt bei den Fehlerwörtern „n Wörter geübt“ statt eines Prozentwerts", async () => {
    const user = userEvent.setup();
    const { rounds } = await setup({ query: "?woerter=Ball&quelle=fehler" });
    const sheet = await screen.findByRole("dialog", {
      name: "Wörter mit den meisten Fehlern",
    });
    await user.click(within(sheet).getByRole("button", { name: "Jetzt üben" }));
    const start = await screen.findByRole("dialog", { name: "Fehlerwörter" });
    expect(start).not.toHaveTextContent("%");
    await startRound(user, 1);
    await answer(user, "Ball");
    await screen.findByRole("heading", { name: "Geschafft!" }, SLOW);
    expect(screen.getByText("1 Wort geübt")).toBeInTheDocument();
    expect(screen.queryByText(/ %$/)).not.toBeInTheDocument();
    // Kein Box-Fortschritt für die vorübergehende Fehlerwörter-Box.
    expect(screen.queryByText(/^Wortbox:/)).not.toBeInTheDocument();
    await waitFor(async () => expect(await rounds.list()).toHaveLength(1));
    // Gespeichert wird unverändert, auch der Prozentwert.
    expect((await rounds.list())[0]).toMatchObject({
      boxId: "fehler",
      percent: 100,
    });

    await user.click(
      screen.getByRole("button", { name: "Andere Stufe wählen" }),
    );
    const sheetAgain = await screen.findByRole("dialog");
    expect(
      await within(sheetAgain).findByRole("button", { name: /Stufe 1:/ }),
    ).toHaveTextContent("1 Wort geübt");
    expect(sheetAgain).not.toHaveTextContent("%");
  });
});

describe("Tagesportion mit ?heute=1", () => {
  const germanItem = (word: LearningWordProgress): DailyPlanItem => ({
    key: `german:${word.id}`,
    module: "german",
    kind: "error",
    objectIds: [word.id],
  });
  const lesson = async ({
    boxes,
  }: {
    boxes: ReturnType<typeof createWordBoxRepository>;
  }) => {
    await boxes.importFromLesson({
      words: ["Hund", "Katze", "Maus"],
      errorWords: ["Hund", "Katze", "Maus"],
      sourceId: "s",
    });
  };

  it("öffnet „Fällige“ nur mit den Wörtern der Portion", async () => {
    const user = userEvent.setup();
    await setup({
      query: "?heute=1",
      prepare: lesson,
      // „Maus“ ist auch fällig, steht aber nicht in der Portion.
      plan: (words) =>
        words.filter((word) => word.word !== "Maus").map(germanItem),
    });
    const sheet = await screen.findByRole("dialog", {
      name: "Trainingswörter heute",
    });
    expect(
      within(sheet).getByText("2 Wörter in dieser Wortbox"),
    ).toBeInTheDocument();

    await startRound(user, 4);
    // Die Runde hat zwei Wörter (nicht drei): „Maus“ ist nicht Teil der Portion.
    expect(await screen.findByText("1 / 2")).toBeInTheDocument();
  });

  it("sagt, dass der Teil für heute geschafft ist, wenn nichts offen ist", async () => {
    // Die Portion ist heute schon erledigt.
    await setup({
      query: "?heute=1",
      prepare: lesson,
      plan: (words) => words.slice(0, 1).map(germanItem),
      doneToday: true,
    });
    expect(
      await screen.findByText(
        "Dein Teil für heute ist geschafft. Du kannst frei weiterüben.",
      ),
    ).toHaveAttribute("role", "status");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    // Das freie Üben mit allen fälligen Wörtern bleibt.
    expect(screen.getByText("Trainingswörter heute")).toBeInTheDocument();
  });

  it("öffnet ohne ?heute=1 kein Startblatt", async () => {
    await setup({
      prepare: lesson,
      plan: (words) => words.map(germanItem),
    });
    await screen.findByRole("button", { name: "Gemischt trainieren" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("Brücke zur Textbox", () => {
  it("öffnet mit ?woerter= das Blatt und speichert nichts ohne Aktion", async () => {
    const user = userEvent.setup();
    const { boxes } = await setup({ query: "?woerter=Ball,Stra%C3%9Fe,ball" });
    const sheet = await screen.findByRole("dialog", {
      name: "Wörter aus der Textbox",
    });
    expect(
      within(sheet).getByRole("list", { name: "Wörter aus der Textbox" }),
    ).toHaveTextContent("BallStraße");
    expect(await boxes.list()).toEqual([]);

    await user.click(
      within(sheet).getByRole("button", { name: "In eine Wortbox speichern" }),
    );
    await user.click(within(sheet).getByRole("button", { name: "Speichern" }));
    expect(
      await within(sheet).findByText(
        /Die Wörter liegen jetzt in der Wortbox ‚Aus der Textbox‘/,
      ),
    ).toBeInTheDocument();
    const [box] = await boxes.list();
    expect(box).toMatchObject({ title: "Aus der Textbox" });
    expect(box!.words.map((w) => [w.text, w.source])).toEqual([
      ["Ball", "textbox"],
      ["Straße", "textbox"],
    ]);
  });

  it("speichert in eine vorhandene eigene Wortbox", async () => {
    const user = userEvent.setup();
    const { boxes } = await setup({
      query: "?woerter=Ball",
      prepare: async ({ boxes: repo }) => {
        await repo.create("Meine Box", ["Haus"]);
      },
    });
    const sheet = await screen.findByRole("dialog", {
      name: "Wörter aus der Textbox",
    });
    await user.click(
      within(sheet).getByRole("button", { name: "In eine Wortbox speichern" }),
    );
    await user.selectOptions(
      within(sheet).getByLabelText("Wortbox"),
      "Meine Box",
    );
    await user.click(within(sheet).getByRole("button", { name: "Speichern" }));
    await waitFor(async () =>
      expect((await boxes.list())[0]!.words.map((w) => w.text)).toEqual([
        "Haus",
        "Ball",
      ]),
    );
  });

  it("übt mit „Jetzt üben“ eine vorübergehende Wortbox, die nicht gespeichert wird", async () => {
    const user = userEvent.setup();
    const { boxes, rounds } = await setup({ query: "?woerter=Ball" });
    const sheet = await screen.findByRole("dialog", {
      name: "Wörter aus der Textbox",
    });
    await user.click(within(sheet).getByRole("button", { name: "Jetzt üben" }));
    await startRound(user, 1);
    await answer(user, "Ball");
    expect(
      await screen.findByRole("heading", { name: "Geschafft!" }, SLOW),
    ).toBeInTheDocument();
    expect(await boxes.list()).toEqual([]);
    await waitFor(async () => expect(await rounds.list()).toHaveLength(1));
    expect((await rounds.list())[0]).toMatchObject({
      boxId: "textbox",
      boxTitle: "Aus der Textbox",
    });
  });

  it("zeigt am Ende „Mit einem Text weiterüben“, wenn die Textbox sichtbar ist", async () => {
    const user = userEvent.setup();
    await setup({ query: "?woerter=Ball", stages: "textbox=frei" });
    const sheet = await screen.findByRole("dialog", {
      name: "Wörter aus der Textbox",
    });
    await user.click(within(sheet).getByRole("button", { name: "Jetzt üben" }));
    await startRound(user, 1);
    await answer(user, "Ball");
    const link = await screen.findByRole(
      "link",
      { name: "Mit einem Text weiterüben" },
      SLOW,
    );
    expect(link).toHaveAttribute("href", "/frei/german/textbox?woerter=Ball");
  });

  it("zeigt die Aktion nicht, solange die Textbox in der Vorschau ist", async () => {
    const user = userEvent.setup();
    await setup({ query: "?woerter=Ball", stages: "textbox=vorschau" });
    const sheet = await screen.findByRole("dialog", {
      name: "Wörter aus der Textbox",
    });
    await user.click(within(sheet).getByRole("button", { name: "Jetzt üben" }));
    await startRound(user, 1);
    await answer(user, "Ball");
    await screen.findByRole("heading", { name: "Geschafft!" }, SLOW);
    expect(
      screen.queryByRole("link", { name: "Mit einem Text weiterüben" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Andere Übung wählen" }),
    ).toBeInTheDocument();
  });
});

describe("Stufe 6: Hören und schreiben", () => {
  type Utter = {
    text: string;
    lang: string;
    voice: unknown;
    volume: number;
    onend: (() => void) | null;
    onerror: (() => void) | null;
  };

  function stubSpeech(
    voices: {
      name: string;
      lang: string;
      voiceURI: string;
      default: boolean;
    }[],
  ) {
    const spoken: Utter[] = [];
    class FakeUtterance {
      text: string;
      lang = "";
      voice: unknown = null;
      rate = 1;
      volume = 1;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    }
    vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
    vi.stubGlobal("speechSynthesis", {
      speaking: false,
      pending: false,
      getVoices: () => voices,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      cancel: () => undefined,
      speak: (utterance: Utter) => {
        spoken.push(utterance);
        setTimeout(() => utterance.onend?.(), 5);
      },
    });
    return spoken;
  }

  const anna = {
    name: "Anna (Premium)",
    lang: "de-DE",
    voiceURI: "anna",
    default: true,
  };

  afterEach(() => {
    vi.unstubAllGlobals();
    resetSpeechState();
  });

  async function openStage6(
    user: ReturnType<typeof userEvent.setup>,
    words: string[],
  ) {
    await setup({
      prepare: async ({ boxes }) => {
        await boxes.create("Hören", words);
      },
    });
    await openBox(user, "Hören");
    const sheet = await screen.findByRole("dialog");
    return sheet;
  }

  it("ist ohne deutsche Stimme deaktiviert", async () => {
    stubSpeech([]);
    const user = userEvent.setup();
    const sheet = await openStage6(user, ["Rad"]);
    const card = await within(sheet).findByRole("button", {
      name: /^Stufe 6:/,
    });
    await waitFor(() => expect(card).toBeDisabled());
    await waitFor(
      () =>
        expect(card).toHaveTextContent(
          "Auf diesem Gerät gibt es keine deutsche Stimme.",
        ),
      SLOW,
    );
  });

  it("wärmt die Stimme stumm auf, spricht das erste Wort mit Stimme und zählt „Anhören“ nicht als Hilfe", async () => {
    const spoken = stubSpeech([anna]);
    const user = userEvent.setup();
    const sheet = await openStage6(user, ["Rad", "Sonne"]);
    const card = await within(sheet).findByRole("button", {
      name: /^Stufe 6:/,
    });
    await waitFor(() => expect(card).toBeEnabled());
    await user.click(card);
    await user.selectOptions(
      within(sheet).getByLabelText("Wörter in dieser Runde"),
      "all",
    );
    await user.click(within(sheet).getByRole("button", { name: "Starten" }));

    await screen.findByRole("button", { name: "Anhören" }, SLOW);
    await waitFor(
      () => expect(spoken.map((u) => u.text)).toEqual([" ", "Rad"]),
      SLOW,
    );
    expect(spoken[0]).toMatchObject({ volume: 0, voice: anna });
    expect(spoken[1]).toMatchObject({ lang: "de-DE", voice: anna });
    // Kein Schriftbild, aber die Bedeutungshilfe für das gleich klingende Wort.
    expect(
      screen.queryByRole("heading", { name: /Rad/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Bedeutungshilfe: zum Fahren")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Anhören" }));
    await user.click(screen.getByRole("button", { name: "Anhören" }));
    await waitFor(() =>
      expect(
        spoken.filter((u) => u.text === "Rad").length,
      ).toBeGreaterThanOrEqual(2),
    );

    // „Rat“ statt „Rad“: besondere Rückmeldung.
    await answer(user, "Rat");
    expect(
      await screen.findByText(
        "Das klingt genauso. Gemeint war ‚Rad‘ (zum Fahren).",
      ),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Noch einmal versuchen" }),
    );
    await answer(user, "Rad");
    await screen.findByLabelText("Deine Lösung", {}, SLOW);
    await answer(user, "Sonne");
    expect(
      await screen.findByRole("heading", { name: "Geschafft!" }, SLOW),
    ).toBeInTheDocument();
    // Rad war nur mit Selbstkorrektur richtig, Sonne auf Anhieb: 50 %.
    expect(screen.getByText("50 %")).toBeInTheDocument();
    expect(
      screen.getAllByText("mit Hilfe")[0]!.previousSibling,
    ).toHaveTextContent("0");
  });

  it("zählt „Wort zeigen“ als Hilfe", async () => {
    stubSpeech([anna]);
    const user = userEvent.setup();
    const sheet = await openStage6(user, ["Sonne"]);
    const card = await within(sheet).findByRole("button", {
      name: /^Stufe 6:/,
    });
    await waitFor(() => expect(card).toBeEnabled());
    await user.click(card);
    await user.click(within(sheet).getByRole("button", { name: "Starten" }));
    await user.click(
      await screen.findByRole("button", { name: "Wort zeigen" }, SLOW),
    );
    await answer(user, "Sonne");
    expect(
      await screen.findByRole("heading", { name: "Geschafft!" }, SLOW),
    ).toBeInTheDocument();
    expect(screen.getByText("0 %")).toBeInTheDocument();
  });
});

describe("Textvorschlag nach der Runde", () => {
  async function playWiese(stages: string | undefined) {
    const user = userEvent.setup();
    await setup({ query: "?woerter=Wiese", stages });
    const sheet = await screen.findByRole("dialog", {
      name: "Wörter aus der Textbox",
    });
    await user.click(within(sheet).getByRole("button", { name: "Jetzt üben" }));
    await startRound(user, 1);
    await answer(user, "Wiese");
    await screen.findByRole("heading", { name: "Geschafft!" }, SLOW);
  }

  it("zeigt den besten passenden Text als Karte mit Link in die Textbox", async () => {
    await playWiese("textbox=frei");
    const card = await screen.findByRole(
      "region",
      { name: "Passender Text" },
      SLOW,
    );
    expect(card).toHaveTextContent("enthält 1 deiner 1 Wörter");
    expect(
      within(card).getByRole("link", { name: "Text üben" }),
    ).toHaveAttribute("href", "/frei/german/textbox?woerter=Wiese");
    expect(
      screen.queryByRole("link", { name: "Mit einem Text weiterüben" }),
    ).not.toBeInTheDocument();
  });

  it("zeigt die Karte nicht, solange die Textbox nicht sichtbar ist", async () => {
    await playWiese("textbox=vorschau");
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(
      screen.queryByRole("region", { name: "Passender Text" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Mit einem Text weiterüben" }),
    ).not.toBeInTheDocument();
  });
});
