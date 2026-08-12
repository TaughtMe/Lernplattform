import "fake-indexeddb/auto";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { FirstLearningRound } from "./first-learning-round";

describe("FirstLearningRound", () => {
  it("switches learning mode and direction", async () => {
    const user = userEvent.setup();
    render(<FirstLearningRound />);

    const flashcards = screen.getByRole("button", { name: /Karteikarten/ });
    const reverse = screen.getByRole("button", { name: "Deutsch → Englisch" });
    await waitFor(() => expect(flashcards).toBeEnabled());
    await user.click(flashcards);
    await user.click(reverse);

    expect(flashcards).toHaveAttribute("aria-pressed", "true");
    expect(reverse).toHaveAttribute("aria-pressed", "true");
  });
});
