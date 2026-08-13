import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { RoomCodeForm } from "./room-code-form";

describe("RoomCodeForm", () => {
  it("offers camera scanning next to manual entry", () => {
    render(<RoomCodeForm />);

    expect(
      screen.getByRole("button", { name: "QR-Code mit Kamera scannen" }),
    ).toBeVisible();
  });

  it("explains an invalid room code accessibly", async () => {
    const user = userEvent.setup();
    render(<RoomCodeForm />);

    await user.type(screen.getByRole("textbox", { name: "Raumcode" }), "12");
    await user.click(screen.getByRole("button", { name: "Beitreten" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Bitte gib den vierstelligen Raumcode ein.",
    );
    expect(screen.getByRole("textbox", { name: "Raumcode" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("clears the error when the learner corrects the input", async () => {
    const user = userEvent.setup();
    render(<RoomCodeForm />);

    const input = screen.getByRole("textbox", { name: "Raumcode" });
    await user.type(input, "12");
    await user.click(screen.getByRole("button", { name: "Beitreten" }));
    await user.type(input, "3");

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "false");
  });
});
