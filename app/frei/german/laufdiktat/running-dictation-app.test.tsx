import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LAUFDIKTAT_STARS_KEY } from "./stars-preference";
import { RunningDictationApp } from "./running-dictation-app";

vi.mock("../../../../src/storage/personal-learning-events", () => ({
  createLearningBoxRepository: () => ({ ingestBundle: vi.fn() }),
}));

afterEach(() => window.localStorage.clear());

/** Spielt eine Runde mit einem Satz bis zum Abschluss. */
async function playOneSentence(user: ReturnType<typeof userEvent.setup>) {
  const source = screen.getByRole("textbox");
  await user.clear(source);
  await user.type(source, "Haus.");
  const start = screen.getByRole("button", { name: "Laufdiktat starten" });
  await waitFor(() => expect(start).toBeEnabled());
  await user.click(start);
  await user.click(
    screen.getByRole("button", { name: "Verstanden – jetzt schreiben" }),
  );
  await user.type(screen.getByLabelText("Deine Antwort"), "Haus.");
  await user.click(screen.getByRole("button", { name: "Prüfen" }));
  await user.click(screen.getByRole("button", { name: "Runde abschließen" }));
}

describe("RunningDictationApp, Sterne am Ende", () => {
  it("zeigt die Sterne standardmäßig wie bisher", async () => {
    const user = userEvent.setup();
    render(<RunningDictationApp />);
    const toggle = await screen.findByRole("checkbox", {
      name: "Sterne am Ende zeigen",
    });
    expect(toggle).toBeChecked();
    await playOneSentence(user);
    expect(
      await screen.findByRole("img", { name: "5 von 5 Sternen" }),
    ).toBeInTheDocument();
  });

  it("lässt die Sterne weg, merkt die Wahl und zeigt trotzdem die Zahlen", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<RunningDictationApp />);
    await user.click(
      await screen.findByRole("checkbox", { name: "Sterne am Ende zeigen" }),
    );
    expect(window.localStorage.getItem(LAUFDIKTAT_STARS_KEY)).toBe("0");
    await playOneSentence(user);
    expect(await screen.findByText("Geschafft!")).toBeInTheDocument();
    expect(screen.getByText("Aufgaben")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /Sternen/ })).toBeNull();
    unmount();

    // Neues Öffnen auf demselben Gerät: Der Schalter bleibt aus.
    render(<RunningDictationApp />);
    expect(
      await screen.findByRole("checkbox", { name: "Sterne am Ende zeigen" }),
    ).not.toBeChecked();
  });
});
