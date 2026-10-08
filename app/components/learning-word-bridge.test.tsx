import "fake-indexeddb/auto";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { resolveStages, resolveVisibility } from "../../src/domain/release";
import { ReleaseProvider } from "../release/release-context";
import { LearningWordApp } from "./learning-word-app";

function open(query: string, stages: string | undefined) {
  window.history.pushState(null, "", `/frei/german/lernwoerter${query}`);
  render(
    <ReleaseProvider value={resolveVisibility(resolveStages(stages), false)}>
      <LearningWordApp />
    </ReleaseProvider>,
  );
}

afterEach(() => window.history.pushState(null, "", "/"));

async function practiceOneWord() {
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", { name: "Stufe ausprobieren" }),
  );
  await user.type(await screen.findByLabelText("Deine Lösung"), "Ball{Enter}");
  await screen.findByText("Merkstrecke abgeschlossen", {}, { timeout: 3000 });
}

describe("Wortspeicher ↔ Textbox", () => {
  it("füllt mit ?woerter= die eigene Liste vor", async () => {
    open("?woerter=Ball,Stra%C3%9Fe,ball", "textbox=frei");
    const list = await screen.findByRole("textbox", {
      name: /Deine Lernwörter/,
    });
    expect(list).toHaveValue("Ball\nStraße");
    expect(screen.getByText("2 Wörter ausgewählt")).toBeInTheDocument();
  });

  it("wählt mit ?sammlung= eine Sammlung vor", async () => {
    open("?sammlung=silent-h", undefined);
    expect(
      await screen.findByRole("button", { name: /Dehnungs-h/, pressed: true }),
    ).toBeInTheDocument();
  });

  it("ignoriert ungültige Parameter und nutzt die Beispielwörter", async () => {
    open("?woerter=<b>&sammlung=gibt-es-nicht", undefined);
    const list = await screen.findByRole("textbox", {
      name: /Deine Lernwörter/,
    });
    expect((list as HTMLTextAreaElement).value).toContain("Schulweg");
  });

  it("zeigt am Ende „Mit einem Text weiterüben“, wenn die Textbox sichtbar ist", async () => {
    open("?woerter=Ball", "textbox=frei");
    await practiceOneWord();
    const link = screen.getByRole("link", {
      name: "Mit einem Text weiterüben",
    });
    expect(link).toHaveAttribute("href", "/frei/german/textbox?woerter=Ball");
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
