import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { LiveSession } from "../../src/integrations/laufdiktat/live-session";
import { LiveRunningDictationGame } from "./live-running-dictation-game";

// Ersetzt den Button-Klick aus der alten Oberfläche: das Original-Laufdiktat
// deckt die Aufgabe per Zwei-Finger-Rand-Geste auf, die hier simuliert wird.
function revealWithTwoFingers(container: HTMLElement) {
  const stage = container.querySelector(".live-game-page") as HTMLElement;
  fireEvent.touchStart(stage, { touches: [{}, {}] });
  fireEvent.touchEnd(stage, { touches: [] });
}

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
  it("keeps failed delivery visible after completion and offers retry", async () => {
    const onRetry = vi.fn();
    const props = {
      code: "4829",
      studentName: "Mia",
      session,
      connectionWarning: "Verbindung unterbrochen",
      initialProgress: {
        currentIndex: 0,
        peeks: 0,
        attempts: 1,
        errors: 0,
        finished: true,
      },
      onProgress: vi.fn(),
      onRetryProgress: onRetry,
    };
    const { rerender } = render(
      <LiveRunningDictationGame {...props} deliveryStatus="error" />,
    );
    expect(screen.getByText(/konnte nicht gesendet werden/)).toBeVisible();
    expect(screen.getByText("Verbindung unterbrochen")).toBeVisible();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Erneut senden" }));
    expect(onRetry).toHaveBeenCalledOnce();
    rerender(<LiveRunningDictationGame {...props} deliveryStatus="saving" />);
    expect(screen.getByText(/wird an die Lehrkraft gesendet/)).toBeVisible();
    rerender(<LiveRunningDictationGame {...props} deliveryStatus="saved" />);
    expect(screen.getByText(/wurde an diese Unterrichtsrunde/)).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Erneut senden" }),
    ).not.toBeInTheDocument();
  });

  it("preserves restored word errors when the round completes", async () => {
    const onProgress = vi.fn();
    render(
      <LiveRunningDictationGame
        code="4829"
        studentName="Mia"
        session={session}
        connectionWarning=""
        initialProgress={{
          currentIndex: 0,
          peeks: 1,
          attempts: 2,
          errors: 1,
          finished: false,
          durationMs: 5000,
          wordErrors: { old: 1 },
        }}
        onProgress={onProgress}
      />,
    );
    const user = userEvent.setup();
    revealWithTwoFingers(document.body);
    await user.type(
      screen.getByRole("textbox", { name: "Deine Antwort" }),
      "Schulweg{Enter}",
    );
    await waitFor(() =>
      expect(onProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          currentIndex: 0,
          finished: true,
          errors: 1,
          wordErrors: { old: 1 },
        }),
      ),
    );
    expect(onProgress.mock.lastCall?.[0].durationMs).toBeGreaterThanOrEqual(
      5000,
    );
  });
  it("runs an authorized room task natively through to completion", async () => {
    const user = userEvent.setup();
    const onProgress = vi.fn();
    const { container } = render(
      <LiveRunningDictationGame
        code="4829"
        studentName="Mia"
        session={session}
        connectionWarning=""
        initialProgress={null}
        onProgress={onProgress}
      />,
    );

    revealWithTwoFingers(container);
    const answer = screen.getByRole("textbox", { name: "Deine Antwort" });
    await waitFor(() => expect(answer).toHaveFocus());
    await user.type(answer, "Schulweg{Enter}");

    expect(screen.getByText("Richtig")).toBeVisible();
    await waitFor(() =>
      expect(screen.getByText("Geschafft, Mia!")).toBeVisible(),
    );
    expect(onProgress).toHaveBeenLastCalledWith(
      expect.objectContaining({ currentIndex: 0, finished: true, errors: 0 }),
    );
    expect(putLearningEvent).not.toHaveBeenCalled();
    expect(
      screen.getByRole("link", { name: "Zurück zur Startseite" }),
    ).toHaveAttribute("href", "/");
  });

  it("shows incorrect feedback as an error in classic Laufdiktat", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <LiveRunningDictationGame
        code="4829"
        studentName="Mia"
        session={{ ...session, gameMode: "LAUFDIKTAT" }}
        connectionWarning=""
        initialProgress={null}
        onProgress={vi.fn()}
      />,
    );

    revealWithTwoFingers(container);
    await user.type(
      screen.getByRole("textbox", { name: "Deine Antwort" }),
      "falsch{Enter}",
    );

    expect(
      screen.getByText("Noch nicht richtig. Versuche es erneut."),
    ).toBeVisible();
    expect(screen.queryByText("Geschafft, Mia!")).not.toBeInTheDocument();
    await user.type(
      screen.getByRole("textbox", { name: "Deine Antwort" }),
      "Schulweg{Enter}",
    );
    await waitFor(() =>
      expect(screen.getByText("Geschafft, Mia!")).toBeVisible(),
    );
  });

  it("keeps the copy template visible and preserves corrections", async () => {
    const user = userEvent.setup();
    const { container } = render(
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

    revealWithTwoFingers(container);
    await user.type(
      screen.getByRole("textbox", { name: "Deine Antwort" }),
      "falsch{Enter}",
    );
    expect(screen.getByLabelText("Lösung: Schulweg")).toBeVisible();
    const input = screen.getByRole("textbox", { name: "Deine Antwort" });
    await user.type(input, "Schux{Enter}");
    expect(input).toHaveValue("Schux");
    expect(
      screen.getByLabelText("Lösung: Schulweg").querySelectorAll(".is-copied"),
    ).toHaveLength(4);
    await waitFor(() =>
      expect(
        screen.getByRole("textbox", { name: "Deine Antwort" }),
      ).toHaveFocus(),
    );
  });

  it("does not transfer vocabulary before the pilot expansion gate", async () => {
    const user = userEvent.setup();
    ingestBundle.mockClear();
    const { container } = render(
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

    revealWithTwoFingers(container);
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
