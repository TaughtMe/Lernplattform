import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { LiveSession } from "../../src/integrations/laufdiktat/live-session";
import { LiveRunningDictationGame } from "./live-running-dictation-game";

const { ingestBundle, putLearningEvent } = vi.hoisted(() => ({
  ingestBundle: vi
    .fn()
    .mockResolvedValue({ deckId: "deck-1", added: 1, reused: 0 }),
  putLearningEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../src/storage/personal-learning-events", () => ({
  createLearningBoxRepository: () => ({ ingestBundle }),
  createPersonalLearningEventRepository: () => ({ put: putLearningEvent }),
}));

const session: LiveSession = {
  sessionId: "session-1",
  words: [{ id: "word-1", kind: "text", targetWord: "Schulweg" }],
  gameMode: "UEBUNG",
  stationMode: false,
  stationCount: 1,
  isTtsEnabled: false,
  uebungMaxAttempts: 3,
  uebungAssistanceEnabled: false,
  repeatWrongAnswers: false,
  vocabularyTransfer: "none",
  showStars: true,
  shuffleWords: false,
  strictTypingMode: false,
  stationShuffle: false,
  battleOptions: { ink: true, flicker: true },
};

describe("LiveRunningDictationGame", () => {
  it("runs an authorized room task natively through to completion", async () => {
    const user = userEvent.setup();
    const onProgress = vi.fn();
    render(
      <LiveRunningDictationGame
        code="4829"
        studentName="Mia"
        session={session}
        connectionWarning=""
        initialProgress={null}
        onProgress={onProgress}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Verstanden – jetzt schreiben" }),
    );
    const answer = screen.getByRole("textbox", { name: "Deine Antwort" });
    expect(answer).toHaveFocus();
    await user.type(answer, "Schulweg{Enter}");

    expect(screen.getByText("Richtig")).toBeVisible();
    await waitFor(() =>
      expect(screen.getByText("Geschafft, Mia!")).toBeVisible(),
    );
    expect(onProgress).toHaveBeenLastCalledWith(
      expect.objectContaining({ currentIndex: 1, finished: true, errors: 0 }),
    );
    expect(putLearningEvent).not.toHaveBeenCalled();
    expect(
      screen.getByRole("link", { name: "Zurück zur Startseite" }),
    ).toHaveAttribute("href", "/");
  });

  it("shows incorrect feedback as an error in classic Laufdiktat", async () => {
    const user = userEvent.setup();
    render(
      <LiveRunningDictationGame
        code="4829"
        studentName="Mia"
        session={{ ...session, gameMode: "LAUFDIKTAT" }}
        connectionWarning=""
        initialProgress={null}
        onProgress={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Verstanden – jetzt schreiben" }),
    );
    await user.type(
      screen.getByRole("textbox", { name: "Deine Antwort" }),
      "falsch{Enter}",
    );

    expect(screen.getByText("Nicht richtig")).toBeVisible();
    expect(screen.queryByText("Richtig")).not.toBeInTheDocument();
  });

  it("hides an assistance solution before requiring another recall", async () => {
    const user = userEvent.setup();
    render(
      <LiveRunningDictationGame
        code="4829"
        studentName="Mia"
        session={{
          ...session,
          uebungMaxAttempts: 1,
          uebungAssistanceEnabled: true,
        }}
        connectionWarning=""
        initialProgress={null}
        onProgress={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Verstanden – jetzt schreiben" }),
    );
    await user.type(
      screen.getByRole("textbox", { name: "Deine Antwort" }),
      "falsch{Enter}",
    );
    expect(screen.getByText(/Die Lösung ist:/)).toHaveTextContent("Schulweg");

    await user.click(
      screen.getByRole("button", {
        name: "Lösung verdecken und erneut abrufen",
      }),
    );
    expect(screen.queryByText(/Die Lösung ist:/)).not.toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Deine Antwort" }),
    ).toHaveFocus();
  });

  it("does not transfer vocabulary before the pilot expansion gate", async () => {
    const user = userEvent.setup();
    ingestBundle.mockClear();
    render(
      <LiveRunningDictationGame
        code="4829"
        studentName="Mia"
        session={{
          ...session,
          words: [
            {
              id: "house",
              kind: "vocabulary",
              prompt: "house",
              targetWord: "Haus",
            },
          ],
          vocabularyTransfer: "all",
        }}
        connectionWarning=""
        initialProgress={null}
        onProgress={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Verstanden – jetzt schreiben" }),
    );
    await user.type(
      screen.getByRole("textbox", { name: "Deine Antwort" }),
      "Haus{Enter}",
    );
    await waitFor(() =>
      expect(screen.getByText("Geschafft, Mia!")).toBeVisible(),
    );
    expect(ingestBundle).not.toHaveBeenCalled();
    expect(
      screen.queryByText("1 Vokabel wurde in deine LernBox übernommen."),
    ).not.toBeInTheDocument();
  });
});
