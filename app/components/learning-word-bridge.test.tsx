import "fake-indexeddb/auto";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { resolveStages, resolveVisibility } from "../../src/domain/release";
import {
  PersonalLearningDatabase,
  createLearningWordProgressRepository,
  createWordBoxRepository,
  createWordRoundRepository,
} from "../../src/storage/personal-learning-events";
import { ReleaseProvider } from "../release/release-context";
import { LearningWordApp } from "./learning-word-app";

const databases: PersonalLearningDatabase[] = [];

function open(query: string, stages: string | undefined) {
  const database = new PersonalLearningDatabase(
    `bridge-${crypto.randomUUID()}`,
  );
  databases.push(database);
  window.history.pushState(null, "", `/frei/german/lernwoerter${query}`);
  render(
    <ReleaseProvider value={resolveVisibility(resolveStages(stages), false)}>
      <LearningWordApp
        repositories={{
          boxes: createWordBoxRepository(database),
          rounds: createWordRoundRepository(database),
          progress: createLearningWordProgressRepository(database),
        }}
      />
    </ReleaseProvider>,
  );
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

async function practiceOneWord() {
  const user = userEvent.setup();
  const sheet = await screen.findByRole("dialog", {
    name: "Wörter aus der Textbox",
  });
  await user.click(within(sheet).getByRole("button", { name: "Jetzt üben" }));
  const start = await screen.findByRole("dialog", { name: "Aus der Textbox" });
  await user.click(within(start).getByRole("button", { name: "Starten" }));
  await user.type(await screen.findByLabelText("Deine Lösung"), "Quarz{Enter}");
  await screen.findByRole("heading", { name: "Geschafft!" }, { timeout: 4000 });
}

describe("Wortspeicher ↔ Textbox", () => {
  it("öffnet mit ?woerter= das Blatt mit den Wörtern aus der Textbox", async () => {
    open("?woerter=Quarz,Stra%C3%9Fe,ball", "textbox=frei");
    const sheet = await screen.findByRole("dialog", {
      name: "Wörter aus der Textbox",
    });
    expect(
      within(sheet).getByRole("list", { name: "Wörter aus der Textbox" }),
    ).toHaveTextContent("QuarzStraße");
  });

  it("wählt mit ?sammlung= die Wortbox vor", async () => {
    open("?sammlung=silent-h", undefined);
    expect(
      await screen.findByRole("dialog", { name: "Dehnungs-h" }),
    ).toBeInTheDocument();
  });

  it("ignoriert ungültige Parameter", async () => {
    open("?woerter=<b>&sammlung=gibt-es-nicht", undefined);
    expect(
      await screen.findByRole("heading", { name: "Wortspeicher" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("zeigt am Ende „Mit einem Text weiterüben“, wenn die Textbox sichtbar ist", async () => {
    open("?woerter=Quarz", "textbox=frei");
    await practiceOneWord();
    expect(
      screen.getByRole("link", { name: "Mit einem Text weiterüben" }),
    ).toHaveAttribute("href", "/frei/german/textbox?woerter=Quarz");
  });

  it("zeigt die Aktion nicht, solange die Textbox in der Vorschau ist", async () => {
    open("?woerter=Quarz", "textbox=vorschau");
    await practiceOneWord();
    expect(
      screen.queryByRole("link", { name: "Mit einem Text weiterüben" }),
    ).not.toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByRole("link", { name: "Andere Übung wählen" }),
      ).toBeInTheDocument(),
    );
  });
});

describe("Wortauftrag der Lehrkraft (?auftrag=)", () => {
  it("öffnet das Blatt „Wörter aus dem Auftrag“ und speichert noch nichts", async () => {
    open("?woerter=Quarz,Ball&auftrag=Gruppe%20A", undefined);
    const sheet = await screen.findByRole("dialog", {
      name: "Wörter aus dem Auftrag",
    });
    expect(
      within(sheet).getByRole("list", { name: "Wörter aus dem Auftrag" }),
    ).toHaveTextContent("QuarzBall");
    expect(sheet).toHaveTextContent("2 Wörter aus deinem Auftrag");
    expect(await databases[0]?.wordBoxes.count()).toBe(0);
  });

  it("belegt den Namen der Wortbox mit dem Titel vor; gespeichert wird erst nach Bestätigung", async () => {
    const user = userEvent.setup();
    open("?woerter=Quarz,Ball&auftrag=Gruppe%20A", undefined);
    const sheet = await screen.findByRole("dialog", {
      name: "Wörter aus dem Auftrag",
    });
    await user.click(
      within(sheet).getByRole("button", { name: "In eine Wortbox speichern" }),
    );
    expect(within(sheet).getByLabelText("Name der neuen Wortbox")).toHaveValue(
      "Gruppe A",
    );
    expect(await databases[0]?.wordBoxes.count()).toBe(0);
    await user.click(within(sheet).getByRole("button", { name: "Speichern" }));
    await within(sheet).findByText(/Die Wörter liegen jetzt in der Wortbox/);
    const boxes = await databases[0]?.wordBoxes.toArray();
    expect(boxes?.map((box) => box.title)).toEqual(["Gruppe A"]);
  });

  it("übt die Auftragswörter unter dem Namen des Auftrags", async () => {
    const user = userEvent.setup();
    open("?woerter=Quarz&auftrag=Gruppe%20A", undefined);
    const sheet = await screen.findByRole("dialog", {
      name: "Wörter aus dem Auftrag",
    });
    await user.click(within(sheet).getByRole("button", { name: "Jetzt üben" }));
    expect(
      await screen.findByRole("dialog", { name: "Gruppe A" }),
    ).toBeInTheDocument();
  });

  it("ignoriert einen ungültigen Titel und nimmt den Standardnamen", async () => {
    const user = userEvent.setup();
    open("?woerter=Quarz&auftrag=%3Cb%3E", undefined);
    const sheet = await screen.findByRole("dialog", {
      name: "Wörter aus der Textbox",
    });
    await user.click(
      within(sheet).getByRole("button", { name: "In eine Wortbox speichern" }),
    );
    expect(within(sheet).getByLabelText("Name der neuen Wortbox")).toHaveValue(
      "Aus der Textbox",
    );
  });

  it("zeigt ohne gültige Wörter kein Blatt", async () => {
    open("?woerter=%3Cb%3E&auftrag=Gruppe%20A", undefined);
    expect(
      await screen.findByRole("heading", { name: "Wortspeicher" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
