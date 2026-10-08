import "fake-indexeddb/auto";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TEXTBOX_TEXTS } from "../../src/domain/textbox-library";
import {
  PersonalLearningDatabase,
  createTextboxRepository,
} from "../../src/storage/personal-learning-events";
import { completedSession } from "./textbox-fixtures";
import { TextboxWorksheet } from "./textbox-worksheet";

const databases: PersonalLearningDatabase[] = [];

async function setup(sessions: ReturnType<typeof completedSession>[]) {
  const database = new PersonalLearningDatabase(`sheet-${crypto.randomUUID()}`);
  databases.push(database);
  const repository = createTextboxRepository(database);
  for (const session of sessions) await repository.complete(session);
  render(<TextboxWorksheet repository={repository} />);
  await screen.findByRole("heading", { name: "Laufzettel Textbox" });
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

describe("TextboxWorksheet", () => {
  it("zeigt alle Spalten mit Bestwert, Übungen und letztem Datum", async () => {
    await setup([
      completedSession("a", 0, 90, 1),
      completedSession("b", 0, 60, 3),
      completedSession("c", 6, 75, 2),
    ]);
    const table = screen.getByRole("table");
    for (const name of [
      "Text",
      "Schwierigkeit",
      "Schwerpunkt",
      "Letzte Übung",
      "Übungen (Wiederholungen)",
      "Bestwert",
    ]) {
      expect(
        within(table).getByRole("columnheader", { name }),
      ).toBeInTheDocument();
    }
    const first = within(table).getByRole("row", {
      name: new RegExp(TEXTBOX_TEXTS[0]!.title),
    });
    expect(first).toHaveTextContent("Leicht");
    expect(first).toHaveTextContent("Doppelkonsonanten");
    expect(first).toHaveTextContent("03.10.2026");
    expect(first).toHaveTextContent("2");
    expect(first).toHaveTextContent("90 %");
    expect(first).not.toHaveTextContent("60 %");
    expect(within(table).getAllByRole("row")).toHaveLength(3);
  });

  it("zeigt den Hinweis „kein Prüfungsnachweis“ und lässt ihn im Ausdruck stehen", async () => {
    await setup([completedSession("a", 0, 90, 1)]);
    const notice = screen.getByRole("note");
    expect(notice).toHaveTextContent(NOTICE);
    // Der Hinweis sitzt nicht in einem Bereich, der im Ausdruck ausgeblendet wird.
    expect(notice.closest('[class*="noPrint"]')).toBeNull();
    expect(notice.closest(".ui-print-hidden")).toBeNull();
  });

  it("speichert das Namensfeld nirgends", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const { database } = await setup([completedSession("a", 0, 90, 1)]);
    const before = JSON.stringify([
      await database.textboxSessions.toArray(),
      await database.learningEvents.toArray(),
    ]);
    const user = userEvent.setup();
    await user.type(
      screen.getByRole("textbox", { name: /Name oder Kennung/ }),
      "Mia M.",
    );
    expect(screen.getByTestId("worksheet-name")).toHaveTextContent("Mia M.");
    expect(setItem).not.toHaveBeenCalled();
    expect(window.localStorage).toHaveLength(0);
    expect(window.sessionStorage).toHaveLength(0);
    expect(document.cookie).toBe("");
    const after = JSON.stringify([
      await database.textboxSessions.toArray(),
      await database.learningEvents.toArray(),
    ]);
    expect(after).toBe(before);
    expect(
      JSON.stringify(await database.textboxSessions.toArray()),
    ).not.toContain("Mia");
  });

  it("druckt über die Schaltfläche", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    await setup([completedSession("a", 0, 90, 1)]);
    await userEvent.click(
      screen.getByRole("button", { name: "Drucken oder als PDF sichern" }),
    );
    expect(print).toHaveBeenCalledOnce();
  });

  it("zeigt ohne abgeschlossene Übung einen leeren Zustand und trotzdem den Hinweis", async () => {
    await setup([]);
    expect(
      screen.getByText("Noch keine Textbox-Übung abgeschlossen"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent(NOTICE);
  });

  it("zeigt, wenn der Speicher nicht lesbar ist, eine Meldung statt Daten", async () => {
    const database = new PersonalLearningDatabase(
      `sheet-${crypto.randomUUID()}`,
    );
    databases.push(database);
    const repository = createTextboxRepository(database);
    await database.textboxSessions.put({
      ...completedSession("x", 0, 50, 1),
      updatedAt: "kaputt",
    });
    render(<TextboxWorksheet repository={repository} />);
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("nicht verfügbar"),
    );
  });
});
