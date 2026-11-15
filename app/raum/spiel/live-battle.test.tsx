import "fake-indexeddb/auto";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseLiveSession } from "../../../src/integrations/laufdiktat/live-session";
import { revealWithTwoFingers } from "./hold-test-utils";
import { LiveRunningDictationGame } from "./live-game";

// Battle nach Genauigkeit, Absender ungenannt (Vision, Nachtrag nach Phase 2,
// Nr. 7). Störangriffe sind seit dem 15.11.2026 wieder standardmäßig an
// (Entscheidung 78); ohne aktivierte Störangriffe gibt es keine Ladeleiste.

function battleSession(battleOptions?: { ink: boolean; flicker: boolean }) {
  return parseLiveSession(
    {
      words: [
        { id: "1", kind: "text", targetWord: "Haus" },
        { id: "2", kind: "text", targetWord: "Baum" },
      ],
      gameMode: "BATTLE",
      ...(battleOptions ? { battleOptions } : {}),
    },
    "session",
    "seed",
  );
}

afterEach(() => {
  cleanup();
  // Der Spielstand liegt je Raum im Browser; jeder Test beginnt neu.
  localStorage.clear();
  sessionStorage.clear();
});

describe("Battle", () => {
  it("zeigt ohne Störangriffe weder Ladeleiste noch Aktionen", () => {
    const session = battleSession({ ink: false, flicker: false });
    render(
      <LiveRunningDictationGame
        code="1234"
        studentName="Mia"
        session={session}
        connectionWarning=""
        initialProgress={null}
        onProgress={vi.fn()}
      />,
    );
    expect(screen.queryByText(/Ladung ·/)).toBeNull();
    expect(
      screen.queryByRole("region", { name: "Battle-Aktionen" }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: /Tinte/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Flimmer/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Schild" })).toBeNull();
  });

  it("hat ohne Einstellung Tinte und Flimmern an", () => {
    const session = battleSession();
    expect(session.battleOptions).toEqual({ ink: true, flicker: true });
  });

  it("lädt beim ersten Versuch über die Richtig-Serie, nach einem Fehler nicht", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <LiveRunningDictationGame
        code="1234"
        studentName="Mia"
        session={battleSession({ ink: true, flicker: false })}
        connectionWarning=""
        initialProgress={null}
        onProgress={vi.fn()}
      />,
    );
    revealWithTwoFingers(container);
    const input = screen.getByRole("textbox", { name: "Deine Antwort" });
    await user.type(input, "Hause{Enter}");
    await user.clear(input);
    await user.type(input, "Haus{Enter}");
    // Richtig erst nach einem Fehler: keine Ladung.
    expect(await screen.findByText("Ladung · 0 %")).toBeInTheDocument();
  });

  it("lädt 20 % für eine richtige Antwort beim ersten Versuch", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <LiveRunningDictationGame
        code="1234"
        studentName="Mia"
        session={battleSession({ ink: true, flicker: false })}
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
    expect(await screen.findByText("Ladung · 20 %")).toBeInTheDocument();
  });

  it("nennt beim Angriff keinen Absender", async () => {
    vi.useFakeTimers();
    try {
      render(
        <LiveRunningDictationGame
          code="1234"
          studentName="Mia"
          session={battleSession({ ink: true, flicker: true })}
          connectionWarning=""
          initialProgress={null}
          onProgress={vi.fn()}
          incomingAttack={{ id: 1, type: "ink", from: "Fuchs" }}
        />,
      );
      await act(async () => vi.advanceTimersByTimeAsync(10));
      expect(screen.getByText("Ein Angriff! Tinte")).toBeInTheDocument();
      expect(document.body).not.toHaveTextContent("Fuchs");
    } finally {
      vi.useRealTimers();
    }
  });
});
