import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseLiveSession } from "../../src/integrations/laufdiktat/live-session";
import { LiveRunningDictationGame } from "./live-running-dictation-game";
import { LiveStationGame } from "./live-station-game";

const session = parseLiveSession(
  {
    words: [
      { id: "1", kind: "text", targetWord: "Haus" },
      { id: "2", kind: "text", targetWord: "Baum" },
    ],
    gameMode: "UEBUNG",
    stationCount: 2,
    isTtsEnabled: true,
    uebungMaxAttempts: 3,
  },
  "session",
  "seed",
);
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
function touch(container: HTMLElement) {
  const stage = container.querySelector(".is-active-round")!;
  fireEvent.touchStart(stage, { touches: [{}, {}] });
  fireEvent.touchEnd(stage, { touches: [] });
}

describe("original Laufdiktat workflows", () => {
  it("reveals progressive hints, enters copy mode, and resets help for the next word", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <LiveRunningDictationGame
        code="1234"
        studentName="Mia"
        session={session}
        connectionWarning=""
        initialProgress={null}
        onProgress={vi.fn()}
      />,
    );
    touch(container);
    const input = screen.getByRole("textbox", { name: "Deine Antwort" });
    await user.type(input, "x{Enter}");
    const firstHint = screen.getByLabelText("Buchstabenhilfe").textContent!;
    expect(firstHint).toContain("_");
    await user.type(input, "x{Enter}");
    expect(
      screen.getByLabelText("Buchstabenhilfe").textContent!.split("_").length,
    ).toBeLessThan(firstHint.split("_").length);
    await user.type(input, "x{Enter}");
    expect(screen.getByLabelText("Lösung: Haus")).toBeVisible();
    await user.type(input, "Haus{Enter}");
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Aufgabe zeigen" }),
      ).toBeVisible(),
    );
    touch(container);
    expect(screen.queryByLabelText("Buchstabenhilfe")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Lösung: Haus")).not.toBeInTheDocument();
  });

  it("lets a pupil peek directly while writing without losing the answer", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <LiveRunningDictationGame
        code="1234"
        studentName="Mia"
        session={session}
        connectionWarning=""
        initialProgress={null}
        onProgress={vi.fn()}
      />,
    );
    touch(container);
    await user.type(
      screen.getByRole("textbox", { name: "Deine Antwort" }),
      "Ha",
    );
    touch(container);
    expect(screen.getByRole("textbox", { name: "Deine Antwort" })).toHaveValue(
      "Ha",
    );
    expect(screen.getByText("Spicker 1")).toBeVisible();
  });

  it("returns stations after three seconds, retains seen words, and supports reading aloud", async () => {
    vi.useFakeTimers();
    const speak = vi.fn();
    vi.stubGlobal(
      "SpeechSynthesisUtterance",
      class {
        constructor(public text: string) {}
        lang = "";
      },
    );
    vi.stubGlobal("speechSynthesis", { speak, cancel: vi.fn() });
    const progress = vi.fn();
    const { container } = render(
      <LiveStationGame
        code="1234"
        session={session}
        connectionWarning=""
        onProgress={progress}
        onLoadProgress={async () => null}
      />,
    );
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "1" })),
    );
    const stage = container.querySelector(".is-active-round")!;
    fireEvent.touchStart(stage, { touches: [{}, {}] });
    expect(screen.getByText("Haus")).toBeVisible();
    act(() => vi.advanceTimersByTime(4000));
    expect(screen.getByText("Haus")).toBeVisible();
    fireEvent.touchEnd(stage, { touches: [] });
    expect(screen.queryByText("Haus")).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByText("Wähle deine Nummer")).toBeVisible();
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "1" })),
    );
    fireEvent.click(screen.getByRole("button", { name: "Vorlesen" }));
    expect(speak).toHaveBeenCalledOnce();
    expect(progress).toHaveBeenLastCalledWith(
      expect.objectContaining({ stationNumber: 1, peeks: 1 }),
    );
  });

  it("does not save station progress after a failed restoration", async () => {
    const user = userEvent.setup();
    const progress = vi.fn();
    const load = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ currentIndex: 1, peeks: 4, finished: false });
    render(
      <LiveStationGame
        code="1234"
        session={session}
        connectionWarning=""
        onProgress={progress}
        onLoadProgress={load}
      />,
    );
    await user.click(screen.getByRole("button", { name: "1" }));
    expect(screen.getByRole("alert")).toHaveTextContent("nicht geladen");
    expect(
      screen.getByRole("button", { name: "Aufgabe zeigen" }),
    ).toBeDisabled();
    expect(progress).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Erneut laden" }));
    await user.click(screen.getByRole("button", { name: "Aufgabe zeigen" }));
    expect(screen.getByText("Baum")).toBeVisible();
    expect(progress).toHaveBeenLastCalledWith(
      expect.objectContaining({ currentIndex: 1, peeks: 4, finished: true }),
    );
  });
});
