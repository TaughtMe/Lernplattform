import "fake-indexeddb/auto";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PersonalLearningDatabase,
  createLearningWordProgressRepository,
  createWordRoundRepository,
} from "../../src/storage/personal-learning-events";
import { progressRecord, roundRecord } from "./word-store-fixtures";
import { WordStoreWorksheet } from "./word-store-worksheet";

const databases: PersonalLearningDatabase[] = [];

async function setup(
  rounds: ReturnType<typeof roundRecord>[],
  progress: ReturnType<typeof progressRecord>[] = [],
) {
  const database = new PersonalLearningDatabase(
    `wsheet-${crypto.randomUUID()}`,
  );
  databases.push(database);
  const roundRepository = createWordRoundRepository(database);
  for (const round of rounds) await roundRepository.save(round);
  for (const entry of progress) await database.learningWordProgress.put(entry);
  render(
    <WordStoreWorksheet
      repositories={{
        rounds: roundRepository,
        progress: createLearningWordProgressRepository(database),
      }}
    />,
  );
  await screen.findByRole("heading", { name: "Laufzettel Wortspeicher" });
  return { database };
}

afterEach(async () => {
  vi.restoreAllMocks();
  window.localStorage.clear();
  window.sessionStorage.clear();
  await Promise.all(
    databases.splice(0).map(async (database) => {
      database.close();
      await database.delete();
    }),
  );
});

const NOTICE =
  "Dieser Laufzettel wurde auf deinem Gerät erstellt. Er ist eine Übersicht und kein Prüfungsnachweis.";

describe("WordStoreWorksheet", () => {
  it("zeigt Wortbox, Bestwert je Stufe, Runden und letztes Datum", async () => {
    await setup(
      [
        roundRecord("a", { stage: 1, percent: 60, day: 1 }),
        roundRecord("b", { stage: 1, percent: 90, day: 3 }),
        roundRecord("c", { stage: 6, percent: 75, day: 2 }),
        roundRecord("d", {
          boxId: "eigen-00000000-0000-4000-8000-000000000001",
          boxTitle: "Meine Tiere",
          stage: 2,
          percent: 100,
          day: 4,
        }),
      ],
      [
        progressRecord("Sonne", { box: 3, attempts: 4 }),
        progressRecord("Mond", { box: 1, attempts: 2 }),
      ],
    );
    const table = screen.getByRole("table");
    for (let stage = 1; stage <= 6; stage += 1) {
      expect(
        within(table).getByRole("columnheader", {
          name: `Bestwert Stufe ${stage}`,
        }),
      ).toBeInTheDocument();
    }
    for (const name of ["Wortbox", "Runden", "Zuletzt geübt"]) {
      expect(
        within(table).getByRole("columnheader", { name }),
      ).toBeInTheDocument();
    }
    const first = within(table).getByRole("row", {
      name: /^Doppelkonsonanten/,
    });
    expect(first).toHaveTextContent("90 %");
    expect(first).not.toHaveTextContent("60 %");
    expect(first).toHaveTextContent("75 %");
    expect(first).toHaveTextContent("03.10.2026");
    expect(first).toHaveTextContent("–");
    const second = within(table).getByRole("row", { name: /^Meine Tiere/ });
    expect(second).toHaveTextContent("100 %");
    expect(within(table).getAllByRole("row")).toHaveLength(3);
    const stats = screen.getByRole(
      "group",
      { name: "Kennzahlen" },
      { hidden: true },
    );
    expect(stats).toHaveTextContent("Trainierte Wörter2");
    expect(stats).toHaveTextContent("Sichere Wörter1");
    expect(stats).toHaveTextContent("Wiederholungen6");
    expect(stats).toHaveTextContent("Abgeschlossene Runden4");
  });

  it("zeigt den Hinweis „kein Prüfungsnachweis“ im Druckbereich", async () => {
    await setup([roundRecord("a")]);
    const notice = screen.getByRole("note");
    expect(notice).toHaveTextContent(NOTICE);
    expect(notice.closest('[class*="noPrint"]')).toBeNull();
    expect(notice.closest(".ui-print-hidden")).toBeNull();
  });

  it("speichert das Namensfeld nirgends", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const { database } = await setup([roundRecord("a")]);
    const before = JSON.stringify([
      await database.wordRounds.toArray(),
      await database.learningEvents.toArray(),
    ]);
    await userEvent
      .setup()
      .type(
        screen.getByRole("textbox", { name: /Name oder Kennung/ }),
        "Mia M.",
      );
    expect(screen.getByTestId("worksheet-name")).toHaveTextContent("Mia M.");
    expect(setItem).not.toHaveBeenCalled();
    expect(window.localStorage).toHaveLength(0);
    expect(window.sessionStorage).toHaveLength(0);
    expect(document.cookie).toBe("");
    const after = JSON.stringify([
      await database.wordRounds.toArray(),
      await database.learningEvents.toArray(),
    ]);
    expect(after).toBe(before);
    expect(after).not.toContain("Mia");
  });

  it("druckt über die Schaltfläche", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    await setup([roundRecord("a")]);
    await userEvent.click(
      screen.getByRole("button", { name: "Drucken oder als PDF sichern" }),
    );
    expect(print).toHaveBeenCalledOnce();
  });

  it("zeigt ohne Runde einen leeren Zustand und trotzdem den Hinweis", async () => {
    await setup([]);
    expect(
      screen.getByText("Noch keine Wortspeicher-Runde abgeschlossen"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent(NOTICE);
  });

  it("zeigt bei unlesbarem Speicher eine Meldung statt Daten", async () => {
    const database = new PersonalLearningDatabase(
      `wsheet-${crypto.randomUUID()}`,
    );
    databases.push(database);
    await database.wordRounds.put({ id: "kaputt" } as never);
    render(
      <WordStoreWorksheet
        repositories={{
          rounds: createWordRoundRepository(database),
          progress: createLearningWordProgressRepository(database),
        }}
      />,
    );
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("nicht verfügbar"),
    );
  });
});
