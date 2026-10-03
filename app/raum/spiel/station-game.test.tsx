import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { LiveSession } from "../../../src/integrations/laufdiktat/live-session";
import { twoFingersDown, twoFingersUp } from "./hold-test-utils";
import { LiveStationGame } from "./station-game";

const session: LiveSession = {
  sessionId: "station-session",
  words: [
    { id: "one", targetWord: "Schulweg", kind: "text" },
    { id: "two", targetWord: "Pausenhof", kind: "text" },
  ],
  gameMode: "UEBUNG",
  stationMode: true,
  stationCount: 4,
  isTtsEnabled: false,
  uebungMaxAttempts: 3,
  uebungAssistanceEnabled: false,
  repeatWrongAnswers: false,
  vocabularyTransfer: "none",
  showStars: false,
  shuffleWords: false,
  strictTypingMode: false,
  stationShuffle: false,
  battleOptions: { ink: true, flicker: true },
};

describe("LiveStationGame", () => {
  it("restores a station and reports its secure station identity", async () => {
    const user = userEvent.setup();
    const onProgress = vi.fn();
    const onLoadProgress = vi.fn().mockResolvedValue(null);
    const { container } = render(
      <LiveStationGame
        code="4829"
        session={session}
        connectionWarning=""
        onProgress={onProgress}
        onLoadProgress={onLoadProgress}
      />,
    );

    await user.click(screen.getByRole("button", { name: "3" }));
    expect(onLoadProgress).toHaveBeenCalledWith("station-3");
    const stage = container.querySelector("[data-game-surface]")!;
    twoFingersDown(stage);
    expect(screen.getByText("Schulweg")).toBeVisible();
    expect(onProgress).toHaveBeenLastCalledWith(
      expect.objectContaining({ stationNumber: 3, currentIndex: 0 }),
    );
    twoFingersUp(stage);
    await user.click(screen.getByRole("button", { name: "Nächste Aufgabe" }));
    expect(screen.getByText(/Nummer 3 · Aufgabe 2 \//)).toBeVisible();
  });
});
