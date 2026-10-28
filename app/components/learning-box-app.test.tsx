import "fake-indexeddb/auto";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import type { DailyPlanItem } from "../../src/domain/daily-plan";
import type { LearningBoxCard } from "../../src/domain/learning-box";
import { learningEventV1Schema } from "../../src/domain/learning-bundle";
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
  /** Alle Plan-Elemente sind heute schon beantwortet. */
  doneToday?: boolean;
  /** Ändert den Lernstand der Karten, bevor die Seite rendert. */
  prepare?: (
    database: PersonalLearningDatabase,
    cards: LearningBoxCard[],
  ) => Promise<void>;
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
  await options.prepare?.(database, cards);
  const now = new Date();
  const items = options.items?.(card) ?? [];
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
  window.history.pushState(null, "", `/lernbox${options.query ?? ""}`);
  render(<LearningBoxApp />);
  return { database, repository, card };
}

/** Ein heute nach dem Plan beantwortetes Element: Es gilt als erledigt. */
function answeredToday(objectId: string, occurredAt: string) {
  return learningEventV1Schema.parse({
    id: `erledigt-${objectId}`,
    learningObjectId: objectId,
    occurredAt,
    source: "lesson",
    learningArea: "vocabulary",
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
  // Der Zwischenstand einer abgebrochenen Runde bleibt im localStorage liegen.
  localStorage.clear();
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
    // Neue Karten sind nicht fällig: Der Stapel zeigt keine Fälligkeit, er heißt
    // „neu“ und nie „erledigt“, solange Karten in „Heute dran“ stehen (C-008).
    expect(screen.queryByText(/heute$/)).not.toBeInTheDocument();
    expect(screen.getByText("4 neu")).toBeVisible();
    expect(screen.queryByText("erledigt")).not.toBeInTheDocument();
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

    // Die Selbsteinschätzung nennt ihre Grenze (D-010), das Schreiben nicht.
    const limit = "Mündlich zählt bis Box 3. Danach musst du schreiben.";
    expect(within(sheet).queryByText(limit)).not.toBeInTheDocument();
    await user.click(within(sheet).getByRole("button", { name: "Mündlich" }));
    expect(within(sheet).getByText(limit)).toBeVisible();
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
    // Die Portion ist heute schon erledigt.
    await setup({
      query: "?heute=1",
      items: (find) => [item(find("Haus"), "forward")],
      doneToday: true,
    });
    expect(
      await screen.findByRole("status", {}, SLOW).then((node) => node),
    ).toHaveTextContent(DONE_NOTICE);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Jetzt üben" })).toBeDisabled();
  });
});

describe("LernBox: Schonfrist und Rückstufung nach Zeit", () => {
  const DAY = 24 * 60 * 60 * 1000;

  /** „Haus“: Box 4, 30 Tage überfällig; „Hund“: Box 4, 5 Tage überfällig. */
  async function agedSetup(query = "") {
    return setup({
      query,
      prepare: async (database, cards) => {
        const aged = (question: string, overdueDays: number) => {
          const found = cards.find((entry) => entry.question === question)!;
          return {
            ...found,
            box: 4 as const,
            level: 4 as const,
            interval: 14,
            nextReview: Date.now() - overdueDays * DAY,
            lastReviewed: Date.now() - (overdueDays + 14) * DAY,
          };
        };
        await database.learningBoxCards.bulkPut([
          aged("Haus", 30),
          aged("Hund", 5),
        ]);
      },
    });
  }

  it("zählt nach wirksamer Box und nennt die lange nicht geübten Karten", async () => {
    await agedSetup();
    const chart = await screen.findByRole("region", {
      name: "Verteilung auf die Boxen",
    });
    // Haus fällt von Box 4 auf Box 2; Hund bleibt in Box 4; zwei neue in Box 1.
    await waitFor(() =>
      expect(
        within(chart).getByRole("button", { name: /^Box 2: 1 Vokabel/ }),
      ).toBeInTheDocument(),
    );
    expect(
      within(chart).getByRole("button", { name: /^Box 4: 1 Vokabel/ }),
    ).toBeInTheDocument();
    expect(within(chart).getByText(/^1 lange nicht geübt/)).toBeVisible();
  });

  it("zeigt in der Kartenliste die wirksame Box und die Kennzeichnung einmal", async () => {
    const user = userEvent.setup();
    await agedSetup();
    await user.click(await screen.findByRole("button", { name: "Bearbeiten" }));
    const row = (await screen.findByText("Haus")).closest("tr")!;
    expect(within(row).getByText(/Box 2/)).toBeInTheDocument();
    expect(within(row).getByText("lange nicht geübt")).toBeVisible();
    const other = screen.getByText("Hund").closest("tr")!;
    expect(within(other).getByText(/Box 4/)).toBeInTheDocument();
    expect(within(other).queryByText("lange nicht geübt")).toBeNull();
    expect(screen.getAllByText("lange nicht geübt")).toHaveLength(1);
  });
});
