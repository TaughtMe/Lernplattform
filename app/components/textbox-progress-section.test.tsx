import "fake-indexeddb/auto";
import { render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { resolveStages, resolveVisibility } from "../../src/domain/release";
import {
  PersonalLearningDatabase,
  createTextboxRepository,
} from "../../src/storage/personal-learning-events";
import { ReleaseProvider } from "../release/release-context";
import { completedSession } from "./textbox-fixtures";
import { TextboxProgressSection } from "./textbox-progress-section";

const databases: PersonalLearningDatabase[] = [];

async function setup(
  sessions: ReturnType<typeof completedSession>[],
  stages = "textbox=frei",
) {
  const database = new PersonalLearningDatabase(`prog-${crypto.randomUUID()}`);
  databases.push(database);
  const repository = createTextboxRepository(database);
  for (const session of sessions) await repository.complete(session);
  return render(
    <ReleaseProvider value={resolveVisibility(resolveStages(stages), false)}>
      <TextboxProgressSection repository={repository} />
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

describe("TextboxProgressSection", () => {
  it("zeigt ohne abgeschlossene Übung einen leeren Zustand", async () => {
    await setup([]);
    expect(
      await screen.findByText("Noch keine Textbox-Übung abgeschlossen"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Zur Textbox" })).toHaveAttribute(
      "href",
      "/frei/german/textbox",
    );
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("fasst Übungen, Verteilung, Diagramm und Fehlerschwerpunkte zusammen", async () => {
    await setup([
      completedSession("a", 0, 80, 1, 2), // doppelkonsonanten, leicht
      completedSession("b", 1, 90, 2, 1), // dehnungs-h, leicht
      completedSession("c", 0, 70, 3, 3),
    ]);
    await screen.findByText("Abgeschlossene Übungen");
    const section = screen
      .getByRole("heading", { name: "Textbox" })
      .closest("section")!;
    expect(section).toHaveTextContent("2Geübte Texte");
    expect(section).toHaveTextContent("3Abgeschlossene Übungen");
    expect(
      within(section).getByRole("img", {
        name: /Dein Ergebnis in Durchgang 4, alle Übungen: 3 Werte/,
      }),
    ).toBeInTheDocument();
    const byDifficulty = within(section).getByRole("list", {
      name: "Übungen nach Schwierigkeit",
    });
    expect(byDifficulty).toHaveTextContent("Leicht: 3");
    expect(byDifficulty).toHaveTextContent("Schwer: 0");
    const bySchwerpunkt = within(section).getByRole("list", {
      name: "Übungen nach Schwerpunkt",
    });
    expect(bySchwerpunkt).toHaveTextContent("Doppelkonsonanten: 2");
    const errors = within(section).getByRole("list", {
      name: "Schwerpunkte mit den meisten Fehlern",
    });
    expect(errors.firstElementChild).toHaveTextContent(
      "Doppelkonsonanten: 5 von 20 Wörtern",
    );
    expect(
      within(errors).getByRole("link", {
        name: "Doppelkonsonanten im Wortspeicher üben",
      }),
    ).toHaveAttribute(
      "href",
      "/frei/german/lernwoerter?sammlung=double-consonants",
    );
    expect(
      within(section).getByRole("link", {
        name: "Laufzettel ansehen und drucken",
      }),
    ).toHaveAttribute("href", "/frei/german/textbox/laufzettel");
  });

  it("bleibt unsichtbar, solange der Bereich nicht freigegeben ist", async () => {
    const { container } = await setup(
      [completedSession("a", 0, 80, 1)],
      "textbox=vorschau",
    );
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });
});
