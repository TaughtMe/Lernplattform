import "fake-indexeddb/auto";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { parseLiveSession } from "../../../src/integrations/laufdiktat/live-session";
import {
  fingerUp,
  keysDown,
  keysUp,
  twoFingersDown,
  twoFingersUp,
} from "./hold-test-utils";
import { LiveRunningDictationGame } from "./live-game";

vi.mock("../../../src/storage/personal-learning-events", () => ({
  createLearningBoxRepository: () => ({ ingestBundle: vi.fn() }),
  createPersonalLearningEventRepository: () => ({
    put: vi.fn().mockResolvedValue(undefined),
  }),
}));

const session = parseLiveSession(
  {
    words: [
      { id: "1", kind: "text", targetWord: "alle" },
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

function setup() {
  const onProgress = vi.fn();
  const view = render(
    <LiveRunningDictationGame
      code="1234"
      studentName="Mia"
      session={session}
      connectionWarning=""
      initialProgress={null}
      onProgress={onProgress}
    />,
  );
  const stage = view.container.querySelector("[data-game-surface]")!;
  return { ...view, stage };
}
const field = () => screen.getByRole("textbox", { name: "Deine Antwort" });

describe("hold to reveal in the running dictation", () => {
  it("has no button to reveal or hide the task", () => {
    const { stage } = setup();
    expect(screen.getByText(/Mit zwei Fingern an den Rändern/)).toBeVisible();
    expect(screen.queryByRole("button", { name: /Aufgabe zeigen/ })).toBeNull();
    twoFingersDown(stage);
    expect(screen.getByText("alle")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /Jetzt schreiben/ }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: /wieder verdecken/ }),
    ).toBeNull();
    expect(screen.queryByText(/Loslassen/)).toBeNull();
  });

  it("keeps the word while fingers move and a third finger comes and goes", () => {
    const { stage } = setup();
    twoFingersDown(stage);
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 40 });
    fireEvent.pointerMove(stage, { pointerId: 2, clientX: 300 });
    fireEvent.pointerDown(stage, { pointerId: 3, pointerType: "touch" });
    fingerUp(stage, 3);
    expect(screen.getByText("alle")).toBeVisible();
    fingerUp(stage, 1);
    expect(field()).toBeInTheDocument();
  });

  it("treats a cancelled contact like a lift", () => {
    const { stage } = setup();
    twoFingersDown(stage);
    fireEvent.pointerCancel(stage, { pointerId: 2, pointerType: "touch" });
    expect(field()).toBeInTheDocument();
  });

  it("does not reveal for the mouse", () => {
    const { stage } = setup();
    fireEvent.pointerDown(stage, { pointerId: 1, pointerType: "mouse" });
    fireEvent.pointerDown(stage, { pointerId: 2, pointerType: "mouse" });
    expect(screen.queryByText("alle")).toBeNull();
  });

  it("a tap on read aloud does not reveal", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("speechSynthesis", { speak: vi.fn(), cancel: vi.fn() });
    vi.stubGlobal("SpeechSynthesisUtterance", class {});
    setup();
    await user.click(screen.getByRole("button", { name: "Vorlesen" }));
    expect(screen.queryByText("alle")).toBeNull();
    vi.unstubAllGlobals();
  });

  it("reveals with A and L, writes without leftover letters, and counts one peek", async () => {
    const { container } = setup();
    act(() => keysDown());
    expect(screen.getByText("alle")).toBeVisible();
    // Eine Taste bleibt gedrückt: Wiederholung darf nichts tippen.
    act(() => {
      fireEvent.keyUp(window, { code: "KeyA", key: "a" });
    });
    const repeat = new KeyboardEvent("keydown", {
      code: "KeyL",
      key: "l",
      repeat: true,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(repeat);
    expect(repeat.defaultPrevented).toBe(true);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 80));
    });
    expect(field()).not.toHaveFocus();
    act(() => {
      fireEvent.keyUp(window, { code: "KeyL", key: "l" });
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 80));
    });
    expect(field()).toHaveFocus();
    expect(field()).toHaveValue("");
    expect(container.textContent).toContain("Spicker 0");
  });

  it("does not reveal while typing words like alle in the answer field", async () => {
    const user = userEvent.setup();
    const { stage } = setup();
    twoFingersDown(stage);
    twoFingersUp(stage);
    await user.type(field(), "alle");
    expect(field()).toHaveValue("alle");
    expect(screen.queryByText("Spicker 1")).toBeNull();
  });

  it("Escape leaves the field, keeps the answer, and A + L shows again", async () => {
    const user = userEvent.setup();
    const { stage } = setup();
    twoFingersDown(stage);
    twoFingersUp(stage);
    await user.type(field(), "Ha");
    await user.keyboard("{Escape}");
    expect(screen.getByText(/Mit zwei Fingern an den Rändern/)).toBeVisible();
    act(() => keysDown());
    expect(screen.getByText("alle")).toBeVisible();
    act(() => keysUp());
    expect(field()).toHaveValue("Ha");
    expect(screen.getByText("Spicker 1")).toBeVisible();
  });

  it("hides the word when the window loses focus", () => {
    setup();
    act(() => keysDown());
    expect(screen.getByText("alle")).toBeVisible();
    act(() => {
      fireEvent.blur(window);
    });
    expect(field()).toBeInTheDocument();
  });
});

describe("math tasks must be memorised", () => {
  function renderMath(showTaskAfterErrors: boolean) {
    const mathSession = parseLiveSession(
      {
        words: [{ id: "m", kind: "math", prompt: "7 · 8", targetWord: "56" }],
        gameMode: "UEBUNG",
        stationCount: 1,
        uebungMaxAttempts: 5,
        showTaskAfterErrors,
      },
      "session",
      "seed",
    );
    const view = render(
      <LiveRunningDictationGame
        code="1234"
        studentName="Mia"
        session={mathSession}
        connectionWarning=""
        initialProgress={null}
        onProgress={vi.fn()}
      />,
    );
    const stage = view.container.querySelector("[data-game-surface]")!;
    twoFingersDown(stage);
    expect(view.container.textContent).toContain("7");
    twoFingersUp(stage);
    return view;
  }

  it("does not show the task in the answer screen at first", () => {
    const { container } = renderMath(true);
    expect(field()).toBeInTheDocument();
    expect(container.textContent).not.toContain("7 · 8");
    expect(container.textContent).not.toContain("56");
  });

  it("shows the task again after two wrong answers when the teacher allows it", async () => {
    const user = userEvent.setup();
    const { container } = renderMath(true);
    await user.type(field(), "1{Enter}");
    expect(container.textContent).not.toContain("7 · 8");
    await user.type(field(), "2{Enter}");
    expect(container.textContent).toContain("7 · 8");
  });

  it("keeps the task hidden when the teacher turned the option off", async () => {
    const user = userEvent.setup();
    const { container } = renderMath(false);
    await user.type(field(), "1{Enter}");
    await user.type(field(), "2{Enter}");
    await user.type(field(), "3{Enter}");
    expect(container.textContent).not.toContain("7 · 8");
  });
});
