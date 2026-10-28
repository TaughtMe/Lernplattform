import "fake-indexeddb/auto";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { learningBoxSnapshotSchema } from "../../src/domain/learning-box-snapshot";
import { parseRoundSnapshot } from "../../src/domain/round-snapshot";
import {
  PersonalLearningDatabase,
  createLearningBoxRepository,
} from "../../src/storage/personal-learning-events";
import { ROUND_SNAPSHOT_KEYS } from "../../src/storage/round-snapshot";
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

type User = ReturnType<typeof userEvent.setup>;

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
  // ?stapel= öffnet das Startfenster des Stapels.
  window.history.pushState(null, "", `/lernbox?stapel=${deck.id}`);
  const mount = () =>
    render(
      <RoundGuardProvider>
        <StudentFrame
          items={[
            { href: "/ueben", label: "Üben", icon: "pencil", active: true },
          ]}
          profileHref="/lernen/einstellungen"
        >
          <LearningBoxApp />
        </StudentFrame>
      </RoundGuardProvider>,
    );
  return { database, mount };
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

async function startRound(user: User, mode: "Mündlich" | "Schreiben") {
  const sheet = await screen.findByRole("dialog", { name: "Englisch 7b" });
  await user.click(within(sheet).getByRole("button", { name: mode }));
  await user.click(within(sheet).getByRole("button", { name: "Los geht's" }));
  // Beim Neuladen soll die Adresse das Startfenster nicht noch einmal öffnen.
  window.history.replaceState(null, "", "/lernbox");
}

const question = () => screen.getByRole("heading", { level: 2 }).textContent;

/** Fragt `count` Karten mündlich ab und liefert die Fragen. */
async function playOral(user: User, count: number) {
  const asked: string[] = [];
  for (let step = 0; step < count; step += 1) {
    const current = (await screen.findByRole("heading", { level: 2 }))
      .textContent!;
    asked.push(current);
    await user.click(screen.getByRole("button", { name: "Antwort zeigen" }));
    await user.click(screen.getByRole("button", { name: "Gewusst" }));
    await waitFor(() => expect(question()).not.toBe(current), SLOW);
  }
  return asked;
}

function savedSnapshot() {
  return parseRoundSnapshot(localStorage.getItem(ROUND_SNAPSHOT_KEYS.lernbox), {
    module: "lernbox",
    now: new Date(),
    state: learningBoxSnapshotSchema,
  });
}

describe("LernBox: Runde fortsetzen (C-001)", { timeout: 30_000 }, () => {
  it("bietet nach drei Antworten und Neuladen „Weitermachen (3 von 10)“ an und zählt nichts doppelt", async () => {
    const user = userEvent.setup();
    const { mount, database } = await prepare();
    const first = mount();
    await startRound(user, "Mündlich");
    const before = await playOral(user, 3);
    await waitFor(() => expect(savedSnapshot()?.done).toBe(3));

    first.unmount();
    mount();
    const resume = await screen.findByRole("button", {
      name: "Weitermachen (3 von 10)",
    });
    await user.click(resume);

    // Weiter mit der vierten Karte; die ersten drei kommen nicht noch einmal.
    const after = await playOral(user, 6);
    expect(new Set([...before, ...after]).size).toBe(9);
    // Die letzte Karte zeigt den Abschluss mit der Zählung der ganzen Runde.
    const last = (await screen.findByRole("heading", { level: 2 }))
      .textContent!;
    expect(Object.keys(PAIRS)).toContain(last);
    expect(new Set([...before, ...after, last]).size).toBe(10);
    await user.click(screen.getByRole("button", { name: "Antwort zeigen" }));
    await user.click(screen.getByRole("button", { name: "Gewusst" }));
    expect(
      await screen.findByText("10 gewusst · 0 noch zu üben", {}, SLOW),
    ).toBeInTheDocument();
    // Zehn Antworten, zehn Ereignisse: keine doppelt gespeichert.
    expect(await database.learningEvents.count()).toBe(10);
    // Abgeschlossen: Der Zwischenstand ist weg.
    expect(localStorage.getItem(ROUND_SNAPSHOT_KEYS.lernbox)).toBeNull();
  });

  it("zählt eine beantwortete Karte mit stehender Rückmeldung als erledigt und fragt sie nicht noch einmal", async () => {
    const user = userEvent.setup();
    const { mount, database } = await prepare();
    const first = mount();
    await startRound(user, "Schreiben");
    const asked = question()!;
    await user.type(
      await screen.findByRole("textbox"),
      `${PAIRS[asked]!}{Enter}`,
    );
    await screen.findByRole("button", { name: /weiter/i });
    await waitFor(() => expect(savedSnapshot()?.done).toBe(1));

    first.unmount();
    mount();
    await user.click(
      await screen.findByRole("button", { name: "Weitermachen (1 von 10)" }),
    );
    expect(question()).not.toBe(asked);
    expect(await database.learningEvents.count()).toBe(1);
  });

  it("fragt bei einem Tipp auf die Leiste und beim Knopf der Runde nach", async () => {
    const user = userEvent.setup();
    const { mount } = await prepare();
    mount();
    await startRound(user, "Mündlich");
    await playOral(user, 3);

    await user.click(screen.getByRole("link", { name: "Üben" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("Runde wirklich beenden?");
    expect(screen.getByRole("button", { name: "Weiterüben" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Weiterüben" }));
    expect(window.location.pathname).toBe("/lernbox");

    await user.click(screen.getByRole("button", { name: "Runde beenden" }));
    await user.click(await screen.findByRole("button", { name: "Beenden" }));
    expect(
      await screen.findByRole("button", { name: "Weitermachen (3 von 10)" }),
    ).toBeInTheDocument();
  });

  it("verwirft den Zwischenstand bei „Neu anfangen“", async () => {
    const user = userEvent.setup();
    const { mount } = await prepare();
    const first = mount();
    await startRound(user, "Mündlich");
    await playOral(user, 2);
    await waitFor(() => expect(savedSnapshot()?.done).toBe(2));
    first.unmount();

    mount();
    await user.click(
      await screen.findByRole("button", { name: "Neu anfangen" }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /Weitermachen/ })).toBeNull(),
    );
    expect(localStorage.getItem(ROUND_SNAPSHOT_KEYS.lernbox)).toBeNull();
  });

  it("bietet bei einem kaputten Zwischenstand nichts an", async () => {
    const { mount } = await prepare();
    localStorage.setItem(ROUND_SNAPSHOT_KEYS.lernbox, "{kaputt");
    mount();
    await screen.findByRole("heading", { name: "LernBox" });
    expect(screen.queryByRole("button", { name: /Weitermachen/ })).toBeNull();
  });
});
