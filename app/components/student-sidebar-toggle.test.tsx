import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { StudentSidebarToggle } from "./student-sidebar-toggle";

describe("StudentSidebarToggle", () => {
  it("announces whether the shared navigation is expanded", async () => {
    const user = userEvent.setup();
    render(<StudentSidebarToggle />);

    const toggle = screen.getByRole("button", {
      name: "Seitenleiste einklappen",
    });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveAttribute("aria-controls", "student-sidebar");

    await user.click(toggle);

    expect(
      screen.getByRole("button", { name: "Seitenleiste ausklappen" }),
    ).toHaveAttribute("aria-expanded", "false");
  });
});
