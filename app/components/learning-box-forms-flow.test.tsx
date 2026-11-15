import "fake-indexeddb/auto";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import Dexie from "dexie";
import { learningBoxSnapshotSchema } from "../../src/domain/learning-box-snapshot";
import { resolveStages, resolveVisibility } from "../../src/domain/release";
import { parseRoundSnapshot } from "../../src/domain/round-snapshot";
import {
  PersonalLearningDatabase,
  createLearningBoxRepository,
} from "../../src/storage/personal-learning-events";
import { ROUND_SNAPSHOT_KEYS } from "../../src/storage/round-snapshot";
import { ReleaseProvider } from "../release/release-context";
import { RoundGuardProvider } from "../ui/round-guard";
import { StudentFrame } from "../views/shell/student-frame";
import { LearningBoxApp } from "./learning-box-app";

const PAIRS: Record<string, string> = {
  Haus: "house",
  Hund: "dog",
  Baum: "tree",
  Katze: "cat",
  Tisch: "table",
  Stuhl: "chair",
  Buch: "book",
  Auto: "car",
  Ball: "ball",
  Fisch: "fish",
};
const SLOW = { timeout: 4000 };
const databases: PersonalLearningDatabase[] = [];
const visible = resolveVisibility(
  resolveStages("lernbox-lernformen=frei"),
  false,
);

async function prepare() {
  const database = new PersonalLearningDatabase();
  databases.push(database);
  const repository = createLearningBoxRepository(database);
  const deck = await repository.createDeck({
    title: "Englisch 7b",
    frontLocale: "de-DE",
    backLocale: "en-US",
  });
  await repository.importCards(
    deck.id,
    Object.entries(PAIRS).map(([question, answer]) => ({ question, answer })),
  );
  window.history.pushState(null, "", `/lernbox?stapel=${deck.id}`);
  const mount = () =>
    render(
      <ReleaseProvider value={visible}>
        <RoundGuardProvider>
          <StudentFrame
            items={[
              { href: "/ueben", label: "Üben", icon: "pencil", active: true },
            ]}
            profileHref="/lernen/einstellungen"
          >
            <LearningBoxApp />
          </StudentFrame>
        </RoundGuardProvider>
      </ReleaseProvider>,
    );
  return { database, mount };
}

afterEach(async () => {
  vi.restoreAllMocks();
  localStorage.clear();
  window.history.pushState(null, "", "/");
  await Promise.all(
    databases.splice(0).map(async (database) => {
      database.close();
      await database.delete();
    }),
  );
});

async function startMode(
  user: ReturnType<typeof userEvent.setup>,
  mode: string,
) {
  const sheet = await screen.findByRole("dialog", { name: "Englisch 7b" });
  await user.click(within(sheet).getByRole("button", { name: mode }));
  await user.click(within(sheet).getByRole("button", { name: "Los geht's" }));
  window.history.replaceState(null, "", "/lernbox");
}

const question = () => screen.getByRole("heading", { level: 2 }).textContent!;

async function leave(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Runde beenden" }));
  await user.click(await screen.findByRole("button", { name: /^Beenden$/ }));
}

describe("LernBox: Lernformen und Zwischenstand", { timeout: 30_000 }, () => {
  it("lässt den „Weitermachen“-Zwischenstand einer älteren Runde bei Zuordnen und Test stehen", async () => {
    const user = userEvent.setup();
    const { mount } = await prepare();
    const first = mount();
    await startMode(user, "Mündlich");
    for (let step = 0; step < 2; step += 1) {
      const current = question();
      await user.click(screen.getByRole("button", { name: "Antwort zeigen" }));
      await user.click(screen.getByRole("button", { name: "Gewusst" }));
      await waitFor(() => expect(question()).not.toBe(current), SLOW);
    }
    const snapshot = () =>
      parseRoundSnapshot(localStorage.getItem(ROUND_SNAPSHOT_KEYS.lernbox), {
        module: "lernbox",
        now: new Date(),
        state: learningBoxSnapshotSchema,
      });
    await waitFor(() => expect(snapshot()?.done).toBe(2));
    const saved = localStorage.getItem(ROUND_SNAPSHOT_KEYS.lernbox);
    first.unmount();

    mount();
    const resume = { name: "Weitermachen (2 von 10)" };
    await screen.findByRole("button", resume);

    await user.click(screen.getByRole("button", { name: /Englisch 7b/ }));
    await startMode(user, "Zuordnen");
    await user.click(screen.getAllByRole("button", { pressed: false })[0]!);
    await leave(user);
    await screen.findByRole("button", resume);
    expect(localStorage.getItem(ROUND_SNAPSHOT_KEYS.lernbox)).toBe(saved);

    await user.click(screen.getByRole("button", { name: /Englisch 7b/ }));
    await startMode(user, "Test");
    await user.type(await screen.findByRole("textbox"), "x{Enter}");
    await leave(user);
    await screen.findByRole("button", resume);
    expect(localStorage.getItem(ROUND_SNAPSHOT_KEYS.lernbox)).toBe(saved);
  });

  it("wartet beim Abbruch auf eine laufende Schreibantwort, bevor die Karten neu geladen werden", async () => {
    const user = userEvent.setup();
    const { mount, database } = await prepare();
    // Das Lesen der Karte beim Antworten dauert: Der Abbruch kommt währenddessen.
    // `get` liegt auf dem gemeinsamen Table-Prototyp (nicht auf dem je Datenbank).
    let table = Object.getPrototypeOf(database.learningBoxCards) as {
      get: (this: { name: string }, ...args: unknown[]) => Promise<unknown>;
    };
    while (!Object.prototype.hasOwnProperty.call(table, "get"))
      table = Object.getPrototypeOf(table);
    const original = table.get;
    vi.spyOn(table, "get").mockImplementation(function (
      this: { name: string },
      ...args: unknown[]
    ) {
      const result = original.apply(this, args);
      if (this.name !== "learningBoxCards" || Dexie.currentTransaction)
        return result;
      return result.then(
        (value) =>
          new Promise((resolve) => setTimeout(() => resolve(value), 600)),
      );
    });
    mount();
    await startMode(user, "Test");
    // Die erste Frage ist eine Schreibfrage zu einer neuen, also fälligen Karte.
    const asked = question();
    await user.type(
      await screen.findByRole("textbox"),
      `${PAIRS[asked]!}{Enter}`,
    );
    await leave(user);
    await waitFor(
      () =>
        expect(
          screen.getByRole("img", { name: /Boxverteilung/ }),
        ).toHaveAccessibleName(
          "Boxverteilung: Box 1: 9, Box 2: 1, Box 3: 0, Box 4: 0, Box 5: 0",
        ),
      SLOW,
    );
  });
});
