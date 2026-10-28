import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RoundGuardProvider, useRoundGuard } from "./round-guard";

function Round({
  active = true,
  onLeave,
  resumable,
}: {
  active?: boolean;
  onLeave: () => void;
  resumable?: boolean;
}) {
  const requestLeave = useRoundGuard({
    active,
    onLeave,
    ...(resumable === undefined ? {} : { resumable }),
  });
  return (
    <button type="button" onClick={requestLeave}>
      Runde beenden
    </button>
  );
}

function renderGuarded(props: Parameters<typeof Round>[0]) {
  return render(
    <RoundGuardProvider>
      <nav>
        <a href="/ueben">Üben</a>
        <a href="/lernen" target="_blank">
          Lernen
        </a>
        <a href="#inhalt">Zum Inhalt</a>
      </nav>
      <Round {...props} />
    </RoundGuardProvider>,
  );
}

/** Klick auf eine Verknüpfung; `true`, wenn der Rundenschutz ihn nicht abgefangen hat. */
function clickReachesPage(element: Element, init?: MouseEventInit) {
  let reached = false;
  const probe = (event: Event) => {
    reached = true;
    // jsdom kann keine Seiten wechseln.
    event.preventDefault();
  };
  document.addEventListener("click", probe);
  fireEvent.click(element, init);
  document.removeEventListener("click", probe);
  return reached;
}

const marker = () =>
  (window.history.state as Record<string, unknown> | null)?.["lernraumRunde"];

beforeEach(() => {
  window.history.replaceState(null, "", "/frei/mathematics");
});

afterEach(async () => {
  vi.restoreAllMocks();
  // Das Aufräumen nimmt den Verlaufseintrag per `history.back()` zurück; das
  // Ereignis dazu darf nicht in den nächsten Test fallen.
  cleanup();
  await new Promise((resolve) => setTimeout(resolve, 30));
});

describe("useRoundGuard ohne Provider", () => {
  it("verlässt die Runde sofort", async () => {
    const onLeave = vi.fn();
    render(<Round onLeave={onLeave} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Runde beenden" }),
    );
    expect(onLeave).toHaveBeenCalledTimes(1);
  });
});

describe("Rundenschutz", () => {
  it("fragt bei einer Verknüpfung nach und bleibt auf „Weiterüben“ stehen", async () => {
    const onLeave = vi.fn();
    renderGuarded({ onLeave });
    const link = screen.getByRole("link", { name: "Üben" });
    await userEvent.click(link);

    const dialog = screen.getByRole("alertdialog", {
      name: "Runde wirklich beenden?",
    });
    expect(dialog).toHaveTextContent(
      "Deine Antworten bis hier sind gespeichert",
    );
    // Standard ist „Weiterüben“, der Fokus beginnt dort.
    expect(screen.getByRole("button", { name: "Weiterüben" })).toHaveFocus();
    expect(window.location.pathname).toBe("/frei/mathematics");

    await userEvent.click(screen.getByRole("button", { name: "Weiterüben" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    // Der Fokus geht zurück an die Verknüpfung.
    expect(link).toHaveFocus();
    expect(window.location.pathname).toBe("/frei/mathematics");
    expect(onLeave).not.toHaveBeenCalled();
  });

  it("wechselt nach „Beenden“ die Seite und räumt den Verlaufseintrag ab", async () => {
    renderGuarded({ onLeave: vi.fn() });
    expect(marker()).toBeDefined();
    const before = window.history.length;

    await userEvent.click(screen.getByRole("link", { name: "Üben" }));
    await userEvent.click(screen.getByRole("button", { name: "Beenden" }));

    await waitFor(() => expect(window.location.pathname).toBe("/ueben"));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    // Der Eintrag der Runde ist weg: höchstens der Eintrag der neuen Seite kam dazu.
    expect(window.history.length).toBeLessThanOrEqual(before + 1);
    expect(marker()).toBeUndefined();
  });

  it("antwortet auf Escape mit „Weiterüben“", async () => {
    const onLeave = vi.fn();
    renderGuarded({ onLeave });
    await userEvent.click(screen.getByRole("link", { name: "Üben" }));
    fireEvent(
      screen.getByRole("alertdialog"),
      new Event("cancel", { cancelable: true }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    expect(onLeave).not.toHaveBeenCalled();
  });

  it("lässt neue Tabs, Anker auf derselben Seite und Zielfenster in Ruhe", async () => {
    renderGuarded({ onLeave: vi.fn() });
    await userEvent.click(screen.getByRole("link", { name: "Zum Inhalt" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

    const blank = screen.getByRole("link", { name: "Lernen" });
    // Nicht abgefangen: Das Ereignis erreicht die Seite, der Browser darf es behandeln.
    expect(clickReachesPage(blank)).toBe(true);

    const link = screen.getByRole("link", { name: "Üben" });
    // Strg-Klick öffnet einen neuen Tab; die Runde bleibt unberührt.
    expect(clickReachesPage(link, { ctrlKey: true })).toBe(true);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("fragt auch beim eigenen Knopf des Moduls nach", async () => {
    const onLeave = vi.fn();
    renderGuarded({ onLeave });
    const button = screen.getByRole("button", { name: "Runde beenden" });
    await userEvent.click(button);
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(onLeave).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Weiterüben" }));
    expect(button).toHaveFocus();

    await userEvent.click(button);
    await userEvent.click(screen.getByRole("button", { name: "Beenden" }));
    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it("sagt bei einer Übung ohne Zwischenstand, dass sie neu anfängt", async () => {
    renderGuarded({ onLeave: vi.fn(), resumable: false });
    await userEvent.click(screen.getByRole("link", { name: "Üben" }));
    expect(screen.getByRole("alertdialog")).toHaveTextContent(
      "fängt dann wieder von vorn an",
    );
  });

  it("legt je Runde einen Verlaufseintrag an und nimmt ihn am Ende zurück", async () => {
    const view = renderGuarded({ onLeave: vi.fn() });
    expect(marker()).toBeDefined();
    view.rerender(
      <RoundGuardProvider>
        <Round active={false} onLeave={vi.fn()} />
      </RoundGuardProvider>,
    );
    await waitFor(() => expect(marker()).toBeUndefined());
    expect(window.location.pathname).toBe("/frei/mathematics");
  });

  it("fragt nach der Zurück-Geste nach und stellt den Eintrag bei „Weiterüben“ wieder her", async () => {
    const onLeave = vi.fn();
    renderGuarded({ onLeave });
    expect(marker()).toBeDefined();

    act(() => window.history.back());
    await screen.findByRole("alertdialog");
    expect(marker()).toBeUndefined();
    expect(window.location.pathname).toBe("/frei/mathematics");

    await userEvent.click(screen.getByRole("button", { name: "Weiterüben" }));
    expect(marker()).toBeDefined();
    expect(onLeave).not.toHaveBeenCalled();

    // Die nächste Zurück-Geste fragt wieder.
    act(() => window.history.back());
    await screen.findByRole("alertdialog");
  });

  it("verlässt die Runde nach der Zurück-Geste mit „Beenden“", async () => {
    const onLeave = vi.fn();
    renderGuarded({ onLeave });
    act(() => window.history.back());
    await screen.findByRole("alertdialog");
    await userEvent.click(screen.getByRole("button", { name: "Beenden" }));
    expect(onLeave).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("fragt nicht, solange keine Runde läuft", async () => {
    renderGuarded({ active: false, onLeave: vi.fn() });
    expect(marker()).toBeUndefined();
    act(() => window.history.back());
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});
