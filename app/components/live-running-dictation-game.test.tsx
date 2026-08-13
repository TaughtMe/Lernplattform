import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { LiveSession } from "../../src/integrations/laufdiktat/live-session";
import { LiveRunningDictationGame } from "./live-running-dictation-game";

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
  showStars: true,
  shuffleWords: false,
  strictTypingMode: false,
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
  });
});
