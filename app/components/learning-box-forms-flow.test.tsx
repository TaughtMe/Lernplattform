import "fake-indexeddb/auto";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
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
  ...modes: string[]
) {
  const sheet = await screen.findByRole("dialog", { name: "Englisch 7b" });
  for (const mode of modes)
    await user.click(within(sheet).getByRole("button", { name: mode }));
  await user.click(within(sheet).getByRole("button", { name: "Los geht's" }));
  window.history.replaceState(null, "", "/lernbox");
}

const question = () => screen.getByRole("heading", { level: 2 }).textContent!;

async function leave(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Runde beenden" }));
  await user.click(await screen.findByRole("button", { name: /^Beenden$/ }));
}

describe(
  "LernBox: Zuordnen, Fragearten und Zwischenstand",
  { timeout: 30_000 },
  () => {
    it("lässt den „Weitermachen“-Zwischenstand einer älteren Runde bei Zuordnen und gemischten Runden stehen", async () => {
      const user = userEvent.setup();
      const { mount } = await prepare();
      const first = mount();
      await startMode(user, "Mündlich");
      for (let step = 0; step < 2; step += 1) {
        const current = question();
        await user.click(
          screen.getByRole("button", { name: "Antwort zeigen" }),
        );
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
      // Auswahl allein ist eine gemischte Runde: Sie hat keinen eigenen Zwischenstand.
      await startMode(user, "Auswahl");
      await user.click((await screen.findAllByRole("radio"))[0]!);
      await leave(user);
      await screen.findByRole("button", resume);
      expect(localStorage.getItem(ROUND_SNAPSHOT_KEYS.lernbox)).toBe(saved);
    });

    it("wechselt Karte für Karte zwischen Schreiben und Auswahl und lässt nur Schreiben die Box ändern", async () => {
      const user = userEvent.setup();
      const { mount, database } = await prepare();
      mount();
      await startMode(user, "Schreiben", "Auswahl");
      let written = 0;
      let chosen = 0;
      for (let step = 0; step < Object.keys(PAIRS).length; step += 1) {
        const asked = question();
        const answer = PAIRS[asked]!;
        if (screen.queryAllByRole("radio").length > 0) {
          chosen += 1;
          await user.click(screen.getByRole("radio", { name: answer }));
          await user.click(screen.getByRole("button", { name: /^Prüfen/ }));
          expect(await screen.findByRole("status")).toHaveTextContent(
            "Gewusst",
          );
          expect(screen.getByRole("status")).toHaveTextContent(
            "Box 1 bleibt · nur geübt",
          );
        } else {
          written += 1;
          await user.type(screen.getByLabelText("Deine Antwort"), answer);
          await user.click(screen.getByRole("button", { name: /^Prüfen/ }));
          expect(await screen.findByRole("status")).toHaveTextContent(
            "Box 1 → Box 2",
          );
        }
        // Gemischte Runden haben kein „Weitermachen“.
        expect(localStorage.getItem(ROUND_SNAPSHOT_KEYS.lernbox)).toBeNull();
        await user.click(screen.getByRole("button", { name: "Weiter" }));
      }
      // Die Arten verteilen sich gleichmäßig.
      expect([written, chosen]).toEqual([5, 5]);
      expect(await screen.findByText("Gut gearbeitet")).toBeVisible();
      await user.click(screen.getByRole("button", { name: "Zur LernBox" }));
      await waitFor(
        () =>
          expect(
            screen.getByRole("img", { name: /Boxverteilung/ }),
          ).toHaveAccessibleName(
            "Boxverteilung: Box 1: 5, Box 2: 5, Box 3: 0, Box 4: 0, Box 5: 0",
          ),
        SLOW,
      );
      // Nur die Schreibantworten haben ein Lernereignis.
      expect(await database.learningEvents.count()).toBe(5);
    });

    it("zeigt bei einer falschen Auswahlantwort die Lösung und ändert nichts", async () => {
      const user = userEvent.setup();
      const { mount, database } = await prepare();
      mount();
      await startMode(user, "Auswahl");
      const asked = question();
      const wrong = screen
        .getAllByRole("radio")
        .find((radio) => (radio as HTMLInputElement).value !== PAIRS[asked])!;
      await user.click(wrong);
      await user.click(screen.getByRole("button", { name: /^Prüfen/ }));
      const status = await screen.findByRole("status");
      expect(status).toHaveTextContent("Nicht gewusst");
      expect(status).toHaveTextContent(PAIRS[asked]!);
      expect(await database.learningEvents.count()).toBe(0);
      expect(
        (await database.learningBoxCards.toArray()).every(
          (entry) => entry.box === 1,
        ),
      ).toBe(true);
    });
  },
);
