import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { TeacherLiveRoom } from "./teacher-live-room";

describe("TeacherLiveRoom", () => {
  it("previews valid tasks for every supported content type", async () => {
    const user = userEvent.setup();
    render(<TeacherLiveRoom liveRoomConfig={null} />);
    expect(screen.getByText("2 Aufgaben")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Vokabeln" }));
    expect(screen.getByText("3 Aufgaben")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Kopfrechnen" }));
    expect(screen.getByText("4 Aufgaben")).toBeVisible();
  });

  it("does not pretend to open an unconfigured live lobby", async () => {
    const user = userEvent.setup();
    render(<TeacherLiveRoom liveRoomConfig={null} />);
    await user.click(screen.getByRole("button", { name: "Lobby öffnen" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Live-Räume sind lokal noch nicht konfiguriert",
    );
    expect(screen.queryByText("Lobby geöffnet")).not.toBeInTheDocument();
  });
});
