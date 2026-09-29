import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RoomCodeEntry } from "./room-code-entry";

describe("RoomCodeEntry", () => {
  it("offers camera scanning next to manual entry", () => {
    render(<RoomCodeEntry onCode={vi.fn()} />);

    const cameraButton = screen.getByRole("button", {
      name: "QR-Code mit Kamera scannen",
    });
    expect(cameraButton).toBeVisible();
    expect(cameraButton.querySelector("svg")).toBeInTheDocument();
  });

  it("opens the room after the fourth digit", async () => {
    const user = userEvent.setup();
    const onCode = vi.fn();
    render(<RoomCodeEntry onCode={onCode} />);

    await user.type(screen.getByRole("textbox", { name: "Ziffer 1" }), "4829");
    expect(onCode).toHaveBeenCalledWith("4829");
  });

  it("explains an incomplete code accessibly and clears the error", async () => {
    const user = userEvent.setup();
    render(<RoomCodeEntry onCode={vi.fn()} />);

    const firstDigit = screen.getByRole("textbox", { name: "Ziffer 1" });
    await user.type(firstDigit, "12{Enter}");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Bitte gib den vierstelligen Raumcode ein.",
    );
    expect(firstDigit).toHaveAttribute("aria-invalid", "true");

    await user.type(screen.getByRole("textbox", { name: "Ziffer 3" }), "3");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(firstDigit).toHaveAttribute("aria-invalid", "false");
  });
});
