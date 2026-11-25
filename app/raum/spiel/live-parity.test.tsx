import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseLiveSession } from "../../../src/integrations/laufdiktat/live-session";
import { resetSpeechState, SPEAK_DELAY_MS } from "../../../src/speech/speaker";
import {
  revealWithTwoFingers,
  twoFingersDown,
  twoFingersUp,
} from "./hold-test-utils";
import { LiveRunningDictationGame } from "./live-game";
import { LiveStationGame } from "./station-game";

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
  window.localStorage.removeItem("lernraum:vorlesen-modell");
  vi.useRealTimers();
  vi.unstubAllGlobals();
  resetSpeechState();
});
const touch = revealWithTwoFingers;

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
      expect(screen.getByText(/Mit zwei Fingern an den Rändern/)).toBeVisible(),
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
    // Vorlesen über die Gerätestimme: Lernraum-Stimme aus (Entscheidung 82).
    window.localStorage.setItem("lernraum:vorlesen-modell", "0");
    vi.useFakeTimers();
    const speak = vi.fn();
    vi.stubGlobal(
      "SpeechSynthesisUtterance",
      class {
        constructor(public text: string) {}
        lang = "";
      },
    );
    // Gesprochen wird nur mit einer Stimme des Geräts (B-012).
    vi.stubGlobal("speechSynthesis", {
      speak,
      cancel: vi.fn(),
      getVoices: () => [
        {
          name: "Anna",
          lang: "de-DE",
          voiceURI: "anna",
          default: true,
          localService: true,
        },
      ],
    });
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
    twoFingersDown(stage);
    expect(screen.getByText("Haus")).toBeVisible();
    act(() => vi.advanceTimersByTime(4000));
    expect(screen.getByText("Haus")).toBeVisible();
    twoFingersUp(stage);
    expect(screen.queryByText("Haus")).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByText("Welche Nummer bist du?")).toBeVisible();
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "1" })),
    );
    fireEvent.click(screen.getByRole("button", { name: "Vorlesen" }));
    await act(async () => vi.advanceTimersByTimeAsync(SPEAK_DELAY_MS));
    expect(speak).toHaveBeenCalledOnce();
    expect(progress).toHaveBeenLastCalledWith(
      expect.objectContaining({ stationNumber: 1, peeks: 1 }),
    );
  });

  it("reads nothing aloud with only a network voice, says why and counts no peek", async () => {
    vi.useFakeTimers();
    const speak = vi.fn();
    vi.stubGlobal("SpeechSynthesisUtterance", class {});
    vi.stubGlobal("speechSynthesis", {
      speak,
      cancel: vi.fn(),
      getVoices: () => [
        {
          name: "Google Deutsch",
          lang: "de-DE",
          voiceURI: "cloud",
          default: true,
          localService: false,
        },
      ],
    });
    const notices: string[] = [];
    const listener = (event: Event) =>
      notices.push((event as CustomEvent<{ message: string }>).detail.message);
    window.addEventListener("lernraum-speech-notice", listener);
    const progress = vi.fn();
    render(
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
    fireEvent.click(screen.getByRole("button", { name: "Vorlesen" }));
    await act(async () => vi.advanceTimersByTimeAsync(2000));
    window.removeEventListener("lernraum-speech-notice", listener);
    expect(speak).not.toHaveBeenCalled();
    expect(notices).toEqual([
      "Auf diesem Gerät ist keine deutsche Stimme installiert.",
    ]);
    expect(progress).not.toHaveBeenCalledWith(
      expect.objectContaining({ peeks: 1 }),
    );
  });

  it("does not save station progress after a failed restoration", async () => {
    const user = userEvent.setup();
    const progress = vi.fn();
    const load = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ currentIndex: 1, peeks: 4, finished: false });
    const { container } = render(
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
    const stage = container.querySelector(".is-active-round")!;
    twoFingersDown(stage);
    expect(screen.queryByText("Haus")).not.toBeInTheDocument();
    twoFingersUp(stage);
    expect(progress).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Erneut laden" }));
    twoFingersDown(stage);
    expect(screen.getByText("Baum")).toBeVisible();
    expect(progress).toHaveBeenLastCalledWith(
      expect.objectContaining({ currentIndex: 1, peeks: 4, finished: true }),
    );
  });
});
