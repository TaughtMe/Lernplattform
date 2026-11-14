import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { announceSpeechNotice } from "../../src/speech/speaker";
import { SPEECH_NOTICE_MS, SpeechNoticeHost } from "./speech-notice";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const MESSAGE = "Auf diesem Gerät ist keine deutsche Stimme installiert.";

describe("SpeechNoticeHost", () => {
  it("zeigt den Hinweis der Sprachausgabe in einem Statusbereich", async () => {
    render(<SpeechNoticeHost />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    act(() => announceSpeechNotice(MESSAGE));
    expect(screen.getByRole("status")).toHaveTextContent(MESSAGE);
    await userEvent.click(screen.getByRole("button", { name: "OK" }));
    expect(screen.queryByText(MESSAGE)).not.toBeInTheDocument();
  });

  it("blendet den Hinweis nach einer Weile von selbst aus", () => {
    vi.useFakeTimers();
    render(<SpeechNoticeHost />);
    act(() => announceSpeechNotice(MESSAGE));
    act(() => vi.advanceTimersByTime(SPEECH_NOTICE_MS - 1));
    expect(screen.getByText(MESSAGE)).toBeVisible();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByText(MESSAGE)).not.toBeInTheDocument();
  });
});
