import "fake-indexeddb/auto";
import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { resolveStages, resolveVisibility } from "../../src/domain/release";
import {
  PersonalLearningDatabase,
  createLearningWordProgressRepository,
  createWordRoundRepository,
} from "../../src/storage/personal-learning-events";
import { ReleaseProvider } from "../release/release-context";
import { progressRecord, roundRecord } from "./word-store-fixtures";
import { WordStoreProgressSection } from "./word-store-progress-section";

const databases: PersonalLearningDatabase[] = [];

async function setup(
  rounds: ReturnType<typeof roundRecord>[],
  progress: ReturnType<typeof progressRecord>[],
  stages = "wortspeicher=frei",
) {
  const database = new PersonalLearningDatabase(`wprog-${crypto.randomUUID()}`);
  databases.push(database);
  const roundRepository = createWordRoundRepository(database);
  for (const round of rounds) await roundRepository.save(round);
  for (const entry of progress) await database.learningWordProgress.put(entry);
  return render(
    <ReleaseProvider value={resolveVisibility(resolveStages(stages), false)}>
      <WordStoreProgressSection
        repositories={{
          rounds: roundRepository,
          progress: createLearningWordProgressRepository(database),
        }}
      />
    </ReleaseProvider>,
  );
}

afterEach(async () => {
  await Promise.all(
    databases.splice(0).map(async (database) => {
      database.close();
      await database.delete();
    }),
  );
});

describe("WordStoreProgressSection", () => {
  it("zeigt ohne Daten einen leeren Zustand mit Link zum Wortspeicher", async () => {
    await setup([], []);
    expect(
      await screen.findByText("Noch keine Wörter geübt"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Zum Wortspeicher" }),
    ).toHaveAttribute("href", "/frei/german/lernwoerter");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("zeigt Kennzahlen, Verteilung, Diagramm und die Wörter mit den meisten Fehlern", async () => {
    await setup(
      [
        roundRecord("a", { percent: 50, day: 1 }),
        roundRecord("b", { percent: 80, day: 2 }),
      ],
      [
        progressRecord("Sonne", {
          stage: 2,
          box: 3,
          attempts: 5,
          incorrectAttempts: 3,
        }),
        progressRecord("Mond", {
          stage: 6,
          box: 1,
          attempts: 2,
          incorrectAttempts: 1,
        }),
        progressRecord("Stern", { stage: 6, box: 4, attempts: 3 }),
      ],
    );
    const section = await screen.findByRole("region", { name: "Wortspeicher" });
    const stats = section.querySelector(".ui-stats")!;
    expect(stats).toHaveTextContent("3Trainierte Wörter");
    expect(stats).toHaveTextContent("2Sichere Wörter");
    expect(stats).toHaveTextContent("10Wiederholungen");
    expect(stats).toHaveTextContent("2Abgeschlossene Runden");

    const byStage = within(section).getByRole("list", {
      name: "Wörter nach Merkstufe",
    });
    expect(within(byStage).getAllByRole("listitem")).toHaveLength(6);
    expect(
      within(byStage).getByRole("progressbar", {
        name: "Merkstufe 6: 2 Wörter",
      }),
    ).toBeInTheDocument();

    expect(
      within(section).getByRole("img", {
        name: /2 Werte, von 50 Prozent auf 80 Prozent gestiegen/,
      }),
    ).toBeInTheDocument();

    const errors = within(section).getByRole("list", {
      name: "Wörter mit den meisten Fehlern",
    });
    expect(
      within(errors)
        .getAllByRole("listitem")
        .map((li) => li.textContent),
    ).toEqual(["Sonne: 3 Fehler", "Mond: 1 Fehler"]);
    expect(
      within(section).getByRole("link", { name: "Diese Wörter üben" }),
    ).toHaveAttribute("href", expect.stringContaining("woerter=Sonne,Mond"));
    expect(
      within(section).getByRole("link", { name: /Laufzettel/ }),
    ).toHaveAttribute("href", "/frei/german/lernwoerter/laufzettel");
  });

  it("begrenzt die Fehlerliste auf fünf Wörter", async () => {
    await setup(
      [roundRecord("a")],
      ["a", "b", "c", "d", "e", "f"].map((word, i) =>
        progressRecord(word, { incorrectAttempts: i + 1 }),
      ),
    );
    const errors = await screen.findByRole("list", {
      name: "Wörter mit den meisten Fehlern",
    });
    expect(within(errors).getAllByRole("listitem")).toHaveLength(5);
  });

  it("zeigt nichts, solange der Bereich nicht sichtbar ist", async () => {
    const { container } = await setup(
      [roundRecord("a")],
      [progressRecord("Sonne")],
      "wortspeicher=aus",
    );
    expect(container).toBeEmptyDOMElement();
  });
});
