import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { LiveRoomJoin } from "./live-room-join";

describe("LiveRoomJoin", () => {
  it("prefills the room code and uses an icon-only camera action", () => {
    render(<LiveRoomJoin initialCode="4829" liveRoomConfig={null} />);

    expect(screen.getByRole("textbox", { name: "Ziffer 1" })).toHaveValue("4");
    expect(screen.getByRole("textbox", { name: "Ziffer 4" })).toHaveValue("9");
    expect(
      screen.getByRole("button", { name: "QR-Code mit Kamera scannen" }),
    ).toBeVisible();
    expect(screen.queryByText("Kamera")).not.toBeInTheDocument();
  });

  it("does not pretend that an unconfigured live room was joined", async () => {
    const user = userEvent.setup();
    render(<LiveRoomJoin initialCode="4829" liveRoomConfig={null} />);

    await user.type(
      screen.getByRole("textbox", { name: "Name oder Pseudonym" }),
      "Mia",
    );
    await user.click(screen.getByRole("button", { name: "Beitreten" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "noch nicht mit dem Laufdiktat-Raumdienst verbunden",
    );
    expect(screen.queryByText(/Du bist dabei/)).not.toBeInTheDocument();
  });
});
