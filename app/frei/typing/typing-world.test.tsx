import "fake-indexeddb/auto";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { RoundGuardProvider } from "../../ui/round-guard";
import { StudentFrame } from "../../views/shell/student-frame";
import { TypingWorld } from "./typing-world";

function mount() {
  window.history.pushState(null, "", "/frei/typing");
  return render(
    <RoundGuardProvider>
      <StudentFrame
        items={[
          { href: "/ueben", label: "Üben", icon: "pencil", active: true },
        ]}
        profileHref="/lernen/einstellungen"
      >
        <TypingWorld />
      </StudentFrame>
    </RoundGuardProvider>,
  );
}

afterEach(() => localStorage.clear());

describe("Tastenwelt: Rundenschutz (C-001)", () => {
  it("lässt eine noch nicht begonnene Übung ohne Rückfrage verlassen", async () => {
    const user = userEvent.setup();
    mount();
    await user.click(
      await screen.findByRole("button", { name: /^Weiter mit Lektion/ }),
    );
    await user.click(
      await screen.findByRole("button", { name: "Zur Übersicht" }),
    );
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: /^Weiter mit Lektion/ }),
    ).toBeVisible();
  });

  it("fragt nach dem ersten Anschlag bei Leiste, Logo und Zurück-Pfeil nach und sagt, dass sie neu beginnt", async () => {
    const user = userEvent.setup();
    mount();
    await user.click(
      await screen.findByRole("button", { name: /^Weiter mit Lektion/ }),
    );
    const field = await screen.findByRole("textbox", { name: "Tippfeld" });
    await user.type(field, "a");

    await user.click(screen.getByRole("link", { name: "Üben" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("Runde wirklich beenden?");
    // Ohne Zwischenstand sagt der Text nicht, die Antworten seien gespeichert.
    expect(dialog).toHaveTextContent("fängt dann wieder von vorn an");
    expect(dialog).not.toHaveTextContent("gespeichert");
    expect(screen.getByRole("button", { name: "Weiterüben" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Weiterüben" }));
    expect(window.location.pathname).toBe("/frei/typing");

    await user.click(screen.getByRole("link", { name: "Zur Startseite" }));
    await screen.findByRole("alertdialog");
    await user.click(screen.getByRole("button", { name: "Weiterüben" }));

    await user.click(screen.getByRole("button", { name: "Zur Übersicht" }));
    await user.click(await screen.findByRole("button", { name: "Beenden" }));
    expect(
      await screen.findByRole("button", { name: /^Weiter mit Lektion/ }),
    ).toBeVisible();
  });
});
