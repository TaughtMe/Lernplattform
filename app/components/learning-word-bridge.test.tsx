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
  await user.type(await screen.findByLabelText("Deine Lösung"), "Ball{Enter}");
  await screen.findByRole("heading", { name: "Geschafft!" }, { timeout: 4000 });
}

describe("Wortspeicher ↔ Textbox", () => {
  it("öffnet mit ?woerter= das Blatt mit den Wörtern aus der Textbox", async () => {
    open("?woerter=Ball,Stra%C3%9Fe,ball", "textbox=frei");
    const sheet = await screen.findByRole("dialog", {
      name: "Wörter aus der Textbox",
    });
    expect(
      within(sheet).getByRole("list", { name: "Wörter aus der Textbox" }),
    ).toHaveTextContent("BallStraße");
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
    open("?woerter=Ball", "textbox=frei");
    await practiceOneWord();
    expect(
      screen.getByRole("link", { name: "Mit einem Text weiterüben" }),
    ).toHaveAttribute("href", "/frei/german/textbox?woerter=Ball");
  });

  it("zeigt die Aktion nicht, solange die Textbox in der Vorschau ist", async () => {
    open("?woerter=Ball", "textbox=vorschau");
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
