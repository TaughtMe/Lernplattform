import "fake-indexeddb/auto";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { resolveStages, resolveVisibility } from "../../src/domain/release";
import {
  buildRoundSnapshot,
  parseRoundSnapshot,
} from "../../src/domain/round-snapshot";
import { wordRoundSnapshotSchema } from "../../src/domain/word-round-snapshot";
import { createDailyPlanRepository } from "../../src/storage/daily-plan";
import {
  PersonalLearningDatabase,
  createLearningWordProgressRepository,
  createWordBoxRepository,
  createWordRoundRepository,
} from "../../src/storage/personal-learning-events";
import { ROUND_SNAPSHOT_KEYS } from "../../src/storage/round-snapshot";
import { ReleaseProvider } from "../release/release-context";
import { RoundGuardProvider } from "../ui/round-guard";
import { StudentFrame } from "../views/shell/student-frame";
import { LearningWordApp } from "./learning-word-app";

const WORDS = [
  "Hase",
  "Igel",
  "Fuchs",
  "Reh",
  "Dachs",
  "Maus",
  "Biene",
  "Katze",
  "Hund",
  "Pferd",
];
const SLOW = { timeout: 4000 };
const databases: PersonalLearningDatabase[] = [];

async function prepare() {
  const database = new PersonalLearningDatabase(`ws-${crypto.randomUUID()}`);
  databases.push(database);
  const repositories = {
    boxes: createWordBoxRepository(database),
    rounds: createWordRoundRepository(database),
    progress: createLearningWordProgressRepository(database),
    plan: createDailyPlanRepository(database),
  };
  await repositories.boxes.create("Zehn Tiere", WORDS);
  window.history.pushState(null, "", "/frei/german/lernwoerter");

  /** Öffnet die App neu (Neuladen): gleiche Datenbank, gleicher Speicher. */
  const mount = () =>
    render(
      <ReleaseProvider
        value={resolveVisibility(resolveStages(undefined), false)}
      >
        <RoundGuardProvider>
          <StudentFrame
            items={[
              { href: "/ueben", label: "Üben", icon: "pencil", active: true },
            ]}
            profileHref="/lernen/einstellungen"
          >
            <LearningWordApp repositories={repositories} />
          </StudentFrame>
        </RoundGuardProvider>
      </ReleaseProvider>,
    );
  return { database, ...repositories, mount };
}

afterEach(async () => {
  localStorage.clear();
  window.history.pushState(null, "", "/");
  await Promise.all(
    databases.splice(0).map(async (database) => {
      database.close();
      await database.delete();
    }),
  );
});

type User = ReturnType<typeof userEvent.setup>;

async function startTenWordRound(user: User) {
  const tile = await screen.findByRole("button", { name: /^Zehn Tiere/ });
  await waitFor(() => expect(tile).toBeEnabled());
  await user.click(tile);
  const sheet = await screen.findByRole("dialog");
  await user.click(within(sheet).getByRole("button", { name: /^Stufe 1:/ }));
  await user.click(within(sheet).getByRole("button", { name: "Starten" }));
}

/** Stufe 1 zeigt das Wort als Vorgabe. */
function promptWord() {
  const text = document.querySelector("h2")?.textContent ?? "";
  return WORDS.includes(text) ? text : "";
}

async function answerWord(user: User, text?: string) {
  const word = text ?? promptWord();
  await user.type(
    await screen.findByLabelText("Deine Lösung"),
    `${word}{Enter}`,
  );
  return word;
}

/** Beantwortet die nächsten Wörter richtig und wartet jeweils auf das folgende. */
async function answerRight(user: User, count: number) {
  const seen: string[] = [];
  for (let step = 0; step < count; step += 1) {
    const word = promptWord();
    seen.push(await answerWord(user, word));
    await waitFor(() => expect(promptWord()).not.toBe(word), SLOW);
    await waitFor(() => expect(promptWord()).not.toBe(""), SLOW);
  }
  return seen;
}

function savedSnapshot() {
  return parseRoundSnapshot(
    localStorage.getItem(ROUND_SNAPSHOT_KEYS.wortspeicher),
    {
      module: "wortspeicher",
      now: new Date(),
      state: wordRoundSnapshotSchema,
    },
  );
}

describe("Wortspeicher: Runde fortsetzen (C-001)", { timeout: 30_000 }, () => {
  it("bietet nach drei Antworten und Neuladen „Weitermachen (3 von 10)“ an und setzt dort fort", async () => {
    const user = userEvent.setup();
    const { mount, database, rounds } = await prepare();
    const first = mount();
    await startTenWordRound(user);
    const seen = await answerRight(user, 3);
    await waitFor(() => expect(savedSnapshot()?.done).toBe(3));

    // Neuladen: Die App verschwindet, nur Datenbank und Speicher bleiben.
    first.unmount();
    mount();
    const resume = await screen.findByRole("button", {
      name: "Weitermachen (3 von 10)",
    });
    expect(screen.getByText(/Zehn Tiere · Stufe 1/)).toBeInTheDocument();

    await user.click(resume);
    expect(await screen.findByText("4 / 10")).toBeInTheDocument();
    // Ein schon beantwortetes Wort kommt nicht noch einmal.
    expect(seen).not.toContain(promptWord());
    await answerRight(user, 6);
    await answerWord(user);
    expect(
      await screen.findByRole("heading", { name: "Geschafft!" }, SLOW),
    ).toBeInTheDocument();

    // Genau zehn Antworten, jedes Wort einmal; die Runde ist einmal gespeichert.
    await waitFor(async () => expect(await rounds.list()).toHaveLength(1));
    expect((await rounds.list())[0]!.words).toHaveLength(10);
    expect(await database.learningEvents.count()).toBe(10);
    // Abgeschlossen: kein Angebot mehr.
    await waitFor(() =>
      expect(localStorage.getItem(ROUND_SNAPSHOT_KEYS.wortspeicher)).toBeNull(),
    );
  });

  it("wertet nach dem Fortsetzen einen Fehlversuch nicht als ersten Versuch", async () => {
    const user = userEvent.setup();
    const { mount, database } = await prepare();
    const first = mount();
    await startTenWordRound(user);
    const word = promptWord();
    await answerWord(user, word.slice(0, 3));
    await screen.findByText("Noch nicht sicher");
    await waitFor(() => expect(savedSnapshot()).not.toBeNull());

    first.unmount();
    mount();
    await user.click(
      await screen.findByRole("button", { name: /^Weitermachen/ }),
    );
    // Die Rückmeldung zum Fehlversuch steht wieder da.
    await user.click(
      await screen.findByRole("button", { name: /noch einmal/i }),
    );
    await answerWord(user, word);
    await waitFor(async () =>
      expect(await database.learningEvents.count()).toBe(2),
    );
    const events = await database.learningEvents.toArray();
    expect(new Set(events.map((event) => event.id)).size).toBe(2);
    expect(events.map((event) => event.assessment.knowledge).sort()).toEqual([
      "correct",
      "incorrect",
    ]);
  });

  it("fragt bei einem Tipp auf die Leiste, das Logo und den Knopf der Übung nach", async () => {
    const user = userEvent.setup();
    const { mount } = await prepare();
    mount();
    await startTenWordRound(user);
    await answerRight(user, 3);

    // Untere Leiste.
    await user.click(screen.getByRole("link", { name: "Üben" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("Runde wirklich beenden?");
    expect(dialog).toHaveTextContent(
      "Deine Antworten bis hier sind gespeichert",
    );
    expect(screen.getByRole("button", { name: "Weiterüben" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Weiterüben" }));
    expect(window.location.pathname).toBe("/frei/german/lernwoerter");
    expect(screen.getByText("4 / 10")).toBeInTheDocument();

    // Logo: in der Leiste und, auf kleinen Bildschirmen, im Kopf der Seite.
    const logos = screen.getAllByRole("link", { name: "Zur Startseite" });
    expect(logos).toHaveLength(2);
    for (const logo of logos) {
      await user.click(logo);
      await screen.findByRole("alertdialog");
      await user.click(screen.getByRole("button", { name: "Weiterüben" }));
      expect(logo).toHaveFocus();
    }

    // Profil.
    await user.click(screen.getByRole("link", { name: "Profileinstellungen" }));
    await screen.findByRole("alertdialog");
    await user.click(screen.getByRole("button", { name: "Weiterüben" }));

    // Der Knopf der Übung selbst.
    await user.click(screen.getByRole("button", { name: "Übung beenden" }));
    await user.click(await screen.findByRole("button", { name: "Beenden" }));
    expect(
      await screen.findByRole("heading", { name: "Wortspeicher" }),
    ).toBeInTheDocument();
    // Nach dem Beenden wartet das Angebot in der Übersicht.
    expect(
      await screen.findByRole("button", { name: "Weitermachen (3 von 10)" }),
    ).toBeInTheDocument();
  });

  it("verlässt die Seite nach „Beenden“ über die Leiste und behält den Zwischenstand", async () => {
    const user = userEvent.setup();
    const { mount } = await prepare();
    mount();
    await startTenWordRound(user);
    await answerRight(user, 2);
    await waitFor(() => expect(savedSnapshot()?.done).toBe(2));

    await user.click(screen.getByRole("link", { name: "Üben" }));
    await user.click(await screen.findByRole("button", { name: "Beenden" }));
    await waitFor(() => expect(window.location.pathname).toBe("/ueben"));
    expect(savedSnapshot()?.done).toBe(2);
  });

  it("verwirft den Zwischenstand bei „Neu anfangen“", async () => {
    const user = userEvent.setup();
    const { mount } = await prepare();
    const first = mount();
    await startTenWordRound(user);
    await answerRight(user, 3);
    await waitFor(() => expect(savedSnapshot()?.done).toBe(3));
    first.unmount();

    mount();
    await user.click(
      await screen.findByRole("button", { name: "Neu anfangen" }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /Weitermachen/ })).toBeNull(),
    );
    expect(localStorage.getItem(ROUND_SNAPSHOT_KEYS.wortspeicher)).toBeNull();
  });

  it.each([
    ["kaputt", "{kaputt"],
    [
      "abgelaufen",
      JSON.stringify(
        buildRoundSnapshot({
          module: "wortspeicher",
          roundId: "alt",
          startedAt: "2026-01-01T08:00:00.000Z",
          now: new Date("2026-01-01T08:05:00.000Z"),
          done: 3,
          total: 10,
          state: {},
        }),
      ),
    ],
  ])("bietet bei einem %s Zwischenstand nichts an", async (_name, raw) => {
    const { mount } = await prepare();
    localStorage.setItem(ROUND_SNAPSHOT_KEYS.wortspeicher, raw);
    mount();
    await screen.findByRole("heading", { name: "Wortspeicher" });
    expect(screen.queryByRole("button", { name: /Weitermachen/ })).toBeNull();
  });
});
