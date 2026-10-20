import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DEMO_CLASSES } from "./demo";
import { TeacherFrame, type TeacherFrameProps } from "./teacher-frame";

// jsdom wertet keine Container-Queries aus: Mobil- und Desktop-Variante
// stehen beide im DOM; die Tests wählen deshalb gezielt.

const AREAS: TeacherFrameProps["areas"] = [
  {
    id: "inhalte",
    label: "Inhalte",
    icon: "content",
    href: "/lehrer",
    active: true,
  },
  {
    id: "raeume",
    label: "Räume",
    icon: "room",
    href: "/lehrer/live",
    active: false,
  },
];

function frame(overrides: Partial<TeacherFrameProps> = {}) {
  return (
    <TeacherFrame
      eyebrow="Klasse 7b"
      title="Inhalte"
      theme="light"
      classes={DEMO_CLASSES}
      areas={AREAS}
      areasLabel="Bereich"
      profile={{
        initials: "TB",
        name: "T. Bryson",
        sub: "Zur Startseite",
        href: "/lehrer/einstellungen",
      }}
      navOpen={false}
      {...overrides}
    >
      <p>Seiteninhalt</p>
    </TeacherFrame>
  );
}

describe("TeacherFrame", () => {
  it("markiert die aktive Klasse und den aktiven Bereich", () => {
    render(frame());
    const sidebar = screen.getAllByRole("navigation", {
      name: "Lehrerbereich",
    })[0]!;
    const active = within(sidebar).getByRole("link", { name: /Klasse 7b/ });
    expect(active).toHaveAttribute("aria-current", "true");
    expect(
      within(sidebar).getByRole("link", { name: /Klasse 9a/ }),
    ).not.toHaveAttribute("aria-current");
    expect(
      within(sidebar).getByRole("link", { name: "Inhalte" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      within(sidebar).getByRole("link", { name: "Räume" }),
    ).toHaveAttribute("href", "/lehrer/live");
  });

  it("zeigt „Nicht zugeordnet“ und „Verwalten“ nur mit den optionalen Angaben", () => {
    const { rerender } = render(frame());
    expect(screen.queryByText("Nicht zugeordnet")).not.toBeInTheDocument();
    expect(screen.queryByText("Verwalten")).not.toBeInTheDocument();

    rerender(
      frame({
        unassigned: {
          id: "ohne",
          name: "Nicht zugeordnet",
          sub: "Ohne Klasse",
          count: 3,
          href: "/lehrer?klasse=ohne",
          active: false,
        },
        manage: [
          {
            id: "klassen",
            label: "Klassen",
            icon: "profile",
            href: "/lehrer/klassen",
            active: false,
          },
        ],
      }),
    );
    expect(
      screen.getByRole("link", { name: /Nicht zugeordnet/ }),
    ).toHaveAttribute("href", "/lehrer?klasse=ohne");
    expect(screen.getByText("Verwalten")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Klassen" })).toBeInTheDocument();
  });

  it("zeigt ohne `areasLabel` die Leiste nach v2: Start oben, Klassen zuklappbar", async () => {
    render(
      frame({
        areas: [AREAS[0]!],
        areasLabel: undefined,
        manage: [
          {
            id: "einstellungen",
            label: "Einstellungen",
            icon: "gear",
            href: "/lehrer/einstellungen",
            active: false,
          },
        ],
      }),
    );
    const sidebar = screen.getAllByRole("navigation", {
      name: "Lehrerbereich",
    })[0]!;
    expect(within(sidebar).queryByText("Bereich")).not.toBeInTheDocument();
    const classes = within(sidebar).getByRole("button", { name: "Klassen" });
    expect(classes).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(classes);
    // Zugeklappt bleibt nur die gewählte Klasse.
    expect(
      within(sidebar).getByRole("link", { name: /Klasse 7b/ }),
    ).toBeInTheDocument();
    expect(
      within(sidebar).queryByRole("link", { name: /Klasse 9a/ }),
    ).not.toBeInTheDocument();
    expect(
      within(sidebar).queryByRole("link", { name: "Einstellungen" }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      within(sidebar).getByRole("button", { name: "Verwalten" }),
    );
    expect(
      within(sidebar).getByRole("link", { name: "Einstellungen" }),
    ).toBeInTheDocument();
  });

  it("öffnet die Schublade über den Menüknopf", async () => {
    const onNavOpen = vi.fn();
    render(frame({ onNavOpen }));
    await userEvent.click(
      screen.getByRole("button", { name: "Klassen und Bereiche" }),
    );
    expect(onNavOpen).toHaveBeenCalledTimes(1);
  });

  it("schließt die Schublade per Knopf, Escape, Hintergrund und Navigation", async () => {
    const onNavClose = vi.fn();
    render(
      frame({
        navOpen: true,
        addClass: { href: "/lehrer/klassen" },
        onNavClose,
      }),
    );
    const drawer = screen.getByRole("dialog", { name: "Klassen und Bereiche" });
    expect(drawer).toHaveAttribute("open");
    expect(
      within(drawer).getByRole("link", { name: "Klasse anlegen" }),
    ).toBeInTheDocument();

    await userEvent.click(
      within(drawer).getByRole("button", { name: "Leiste schließen" }),
    );
    expect(onNavClose).toHaveBeenCalledTimes(1);

    // Escape: der Browser meldet „cancel“, der Rahmen schließt kontrolliert.
    const cancel = new Event("cancel", { cancelable: true });
    fireEvent(drawer, cancel);
    expect(cancel.defaultPrevented).toBe(true);
    expect(onNavClose).toHaveBeenCalledTimes(2);

    // Klick auf den Hintergrund trifft den Dialog selbst.
    fireEvent.click(drawer);
    expect(onNavClose).toHaveBeenCalledTimes(3);

    await userEvent.click(within(drawer).getByRole("link", { name: "Räume" }));
    expect(onNavClose).toHaveBeenCalledTimes(4);
  });

  it("zeigt die Schublade nicht, solange sie zu ist", () => {
    render(frame());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("schaltet Hell und Dunkel", async () => {
    const onToggleTheme = vi.fn();
    render(frame({ onToggleTheme }));
    const [first] = screen.getAllByRole("button", { name: "Hell oder dunkel" });
    await userEvent.click(first!);
    expect(onToggleTheme).toHaveBeenCalledTimes(1);
  });
});

describe("TeacherFrame cloud slot", () => {
  it("shows the cloud symbol next to the theme switch and omits it otherwise", () => {
    const { rerender } = render(
      frame({ cloud: <button type="button">Cloud-Symbol</button> }),
    );
    expect(
      screen.getAllByRole("button", { name: "Cloud-Symbol" }).length,
    ).toBeGreaterThan(0);
    rerender(frame());
    expect(screen.queryByRole("button", { name: "Cloud-Symbol" })).toBeNull();
  });
});
