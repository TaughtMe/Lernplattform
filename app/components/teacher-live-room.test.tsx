import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { TeacherLiveRoom } from "./teacher-live-room";

describe("TeacherLiveRoom", () => {
  it("focuses the pilot content builder on text", () => {
    render(<TeacherLiveRoom liveRoomConfig={null} />);
    expect(screen.getByText("2 Aufgaben")).toBeVisible();
    expect(screen.getByRole("button", { name: "Text" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Vokabeln" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Kopfrechnen" })).toBeNull();
  });

  it("does not pretend to open an unconfigured live lobby", async () => {
    const user = userEvent.setup();
    render(<TeacherLiveRoom liveRoomConfig={null} />);
    await user.click(
      screen.getByRole("button", { name: "Weiter zu den Einstellungen" }),
    );
    await user.click(screen.getByRole("button", { name: "Lobby öffnen" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Live-Räume sind lokal noch nicht konfiguriert",
    );
    expect(screen.queryByText("Lobby geöffnet")).not.toBeInTheDocument();
  });

  it("offers only classic Laufdiktat and requires a teacher gate", async () => {
    const user = userEvent.setup();
    render(<TeacherLiveRoom liveRoomConfig={null} />);
    await user.click(
      screen.getByRole("button", { name: "Weiter zu den Einstellungen" }),
    );
    expect(screen.getByRole("button", { name: /Laufdiktat/ })).toBeVisible();
    expect(screen.getByLabelText("Lehrkraftfreigabe")).toHaveAttribute(
      "type",
      "password",
    );
    expect(screen.queryByRole("button", { name: /Battle/ })).toBeNull();
  });
});
