import "fake-indexeddb/auto";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import type { DailyPlanItem } from "../../src/domain/daily-plan";
import type { LearningBoxCard } from "../../src/domain/learning-box";
import { localDayKey } from "../../src/domain/local-day";
import {
  PersonalLearningDatabase,
  createLearningBoxRepository,
} from "../../src/storage/personal-learning-events";
import { LearningBoxApp } from "./learning-box-app";

const DONE_NOTICE =
  "Dein Teil für heute ist geschafft. Du kannst frei weiterüben.";

const databases: PersonalLearningDatabase[] = [];

/**
 * Legt einen Stapel mit vier Karten an und speichert den Plan des heutigen
 * Tages. `items` bekommt die Karten nach Vorderseite („Haus“, „Hund“, „Baum“,
 * „Katze“) und liefert die Plan-Elemente.
 */
async function setup(options: {
  query?: string;
  items?: (card: (question: string) => LearningBoxCard) => DailyPlanItem[];
}) {
  const database = new PersonalLearningDatabase();
  databases.push(database);
  const repository = createLearningBoxRepository(database);
  const deck = await repository.createDeck({
    title: "Englisch 7b",
    frontLocale: "de-DE",
    backLocale: "en-US",
  });
  await repository.importCards(deck.id, [
    { question: "Haus", answer: "house" },
    { question: "Hund", answer: "dog" },
    { question: "Baum", answer: "tree" },
    { question: "Katze", answer: "cat" },
  ]);
  const cards = await repository.listAllCards();
  const card = (question: string) => {
    const found = cards.find((entry) => entry.question === question);
    if (!found) throw new Error(`Karte fehlt: ${question}`);
    return found;
  };
  const now = new Date();
  await database.dailyPlans.put({
    day: localDayKey(now),
    createdAt: new Date(now.getTime() - 60_000).toISOString(),
    size: 20,
    items: options.items?.(card) ?? [],
  });
  window.history.pushState(null, "", `/lernbox${options.query ?? ""}`);
  render(<LearningBoxApp />);
  return { database, repository, card };
}

function item(
  card: LearningBoxCard,
  direction: "forward" | "reverse",
): DailyPlanItem {
  return {
    key: `vocabulary:${card.id}:${direction}`,
    module: "vocabulary",
    kind: "new",
    objectIds: [card.id],
    direction,
  };
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

/** Fragt in einer mündlichen Runde alle Karten ab und liefert die Fragen. */
async function playOralRound(user: ReturnType<typeof userEvent.setup>) {
  const asked: string[] = [];
  for (;;) {
    const question =
      (await screen.findByRole("heading", { level: 2 })).textContent ?? "";
    if (question === "Gut gearbeitet") return asked;
    asked.push(question);
    await user.click(screen.getByRole("button", { name: "Antwort zeigen" }));
    await user.click(screen.getByRole("button", { name: "Gewusst" }));
    // Die Antwort wird erst gespeichert, dann erscheint die nächste Frage.
    await waitFor(
      () =>
        expect(screen.getByRole("heading", { level: 2 }).textContent).not.toBe(
          question,
        ),
      SLOW,
    );
  }
}

describe("LernBox: Heute dran aus der Tagesportion", () => {
  it("zeigt die offenen Plan-Elemente, nicht alle Karten, und öffnet ohne ?heute=1 nichts", async () => {
    await setup({
      items: (card) => [
        item(card("Haus"), "forward"),
        item(card("Baum"), "forward"),
        item(card("Baum"), "reverse"),
      ],
    });
    const heute = await screen.findByRole("region", { name: "Heute dran" });
    await waitFor(() =>
      expect(within(heute).getByText("3")).toBeInTheDocument(),
    );
    expect(within(heute).getByText("Vokabeln aus 1 Stapel")).toBeVisible();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    // Neue Karten sind nicht fällig: Der Stapel zeigt keine Fälligkeit.
    expect(screen.queryByText(/heute$/)).not.toBeInTheDocument();
  });

  it("öffnet mit ?heute=1 das Start-Fenster ohne Richtungswahl und übt jedes Element in seiner Richtung", async () => {
    const user = userEvent.setup();
    const { repository, card } = await setup({
      query: "?heute=1",
      items: (find) => [
        item(find("Haus"), "forward"),
        item(find("Hund"), "reverse"),
        item(find("Baum"), "forward"),
        item(find("Baum"), "reverse"),
      ],
    });
    const sheet = await screen.findByRole("dialog", { name: "Heute dran" });
    expect(
      within(sheet).getByText("4 Vokabeln aus allen Stapeln"),
    ).toBeVisible();
    expect(
      within(sheet).getByRole("button", { name: "Schreiben" }),
    ).toBeVisible();
    expect(
      within(sheet).queryByRole("group", { name: "Richtung" }),
    ).not.toBeInTheDocument();
    expect(
      within(sheet).queryByRole("button", { name: "Gemischt" }),
    ).not.toBeInTheDocument();

    await user.click(within(sheet).getByRole("button", { name: "Mündlich" }));
    await user.click(within(sheet).getByRole("button", { name: "Los geht's" }));
    // Vorwärts fragt die Vorderseite, rückwärts die Rückseite; „Katze“ fehlt.
    expect(await playOralRound(user)).toEqual(["Haus", "dog", "Baum", "tree"]);

    // Beide Richtungen von „Baum“ sind gespeichert (kein Überschreiben).
    const baum = (await repository.listAllCards()).find(
      (entry) => entry.id === card("Baum").id,
    )!;
    expect(baum.box).toBe(2);
    expect(baum.reverseBox).toBe(2);
    const katze = (await repository.listAllCards()).find(
      (entry) => entry.id === card("Katze").id,
    )!;
    expect([katze.interval, katze.reverseInterval]).toEqual([0, 0]);
    // „Hund“ wurde nur rückwärts geübt, vorwärts bleibt er neu.
    const hund = (await repository.listAllCards()).find(
      (entry) => entry.id === card("Hund").id,
    )!;
    expect(hund.interval).toBe(0);
    expect(hund.reverseInterval).toBeGreaterThan(0);

    // Nach der Runde stimmt „Heute dran“: nichts mehr offen.
    await user.click(screen.getByRole("button", { name: "Zur LernBox" }));
    const heute = await screen.findByRole("region", { name: "Heute dran" });
    await waitFor(
      () =>
        expect(
          within(heute).getByText("Heute ist alles geschafft"),
        ).toBeVisible(),
      SLOW,
    );
    expect(
      within(heute).getByRole("button", { name: "Jetzt üben" }),
    ).toBeDisabled();
  }, 20_000);

  it("startet die Portion auch über „Jetzt üben“", async () => {
    const user = userEvent.setup();
    await setup({
      items: (find) => [item(find("Hund"), "reverse")],
    });
    const heute = await screen.findByRole("region", { name: "Heute dran" });
    const start = within(heute).getByRole("button", { name: "Jetzt üben" });
    await waitFor(() => expect(start).toBeEnabled());
    await user.click(start);
    const sheet = await screen.findByRole("dialog", { name: "Heute dran" });
    await user.click(within(sheet).getByRole("button", { name: "Mündlich" }));
    await user.click(within(sheet).getByRole("button", { name: "Los geht's" }));
    expect(await playOralRound(user)).toEqual(["dog"]);
  }, 20_000);

  it("sagt mit ?heute=1, wenn nichts offen ist, und öffnet kein Start-Fenster", async () => {
    await setup({ query: "?heute=1", items: () => [] });
    expect(
      await screen.findByRole("status", {}, SLOW).then((node) => node),
    ).toHaveTextContent(DONE_NOTICE);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Jetzt üben" })).toBeDisabled();
  });
});
