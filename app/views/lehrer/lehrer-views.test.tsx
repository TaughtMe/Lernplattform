import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MODES } from "../laufdiktat/teacher-dictation-screen";
import { ClassAssignDialog } from "./class-assign-dialog";
import { ContentLibraryScreen } from "./content-library-screen";
import { DEMO_CLASSES, DEMO_COUNT, DEMO_ITEMS } from "./demo";
import { StartSheet } from "./start-sheet";
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

describe("ContentLibraryScreen", () => {
  it("meldet Art, Anlegen, Öffnen und Bearbeiten", async () => {
    const handlers = {
      onKind: vi.fn(),
      onCreate: vi.fn(),
      onOpen: vi.fn(),
      onEdit: vi.fn(),
    };
    render(
      <ContentLibraryScreen
        kind="text"
        items={DEMO_ITEMS}
        countLabel={DEMO_COUNT}
        {...handlers}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /^Mathe/ }));
    expect(handlers.onKind).toHaveBeenCalledWith("math");
    expect(screen.getByRole("button", { name: /^Text/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await userEvent.click(screen.getByRole("button", { name: "Weiter" }));
    expect(handlers.onCreate).toHaveBeenCalledWith("text");

    await userEvent.click(
      screen.getByRole("button", {
        name: "Present Perfect · Unit 3 bearbeiten",
      }),
    );
    expect(handlers.onEdit).toHaveBeenCalledWith("present-perfect");
    const openPerfect = screen.getAllByRole("button", {
      name: "Present Perfect · Unit 3 öffnen",
    });
    // Eine Zeile je Ansicht: mobil die ganze Zeile, am Desktop der Knopf „Öffnen“.
    expect(openPerfect).toHaveLength(2);
    await userEvent.click(openPerfect[1]!);
    expect(handlers.onOpen).toHaveBeenCalledWith("present-perfect");
    // Mobile Zeile: die ganze Zeile öffnet.
    await userEvent.click(
      screen.getAllByRole("button", {
        name: "Halbschriftliche Division öffnen",
      })[0]!,
    );
    expect(handlers.onOpen).toHaveBeenCalledWith("division");

    expect(
      screen.queryByRole("button", { name: "Raum öffnen" }),
    ).not.toBeInTheDocument();
  });

  it("zeigt „Zuordnen“ nur mit onAssign", async () => {
    const onAssign = vi.fn();
    const { rerender } = render(
      <ContentLibraryScreen
        kind="text"
        items={DEMO_ITEMS}
        countLabel={DEMO_COUNT}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /zuordnen/ }),
    ).not.toBeInTheDocument();

    rerender(
      <ContentLibraryScreen
        kind="text"
        items={DEMO_ITEMS}
        countLabel={DEMO_COUNT}
        onAssign={onAssign}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", {
        name: "Der Sonnenaufgang (Lesetext) zuordnen",
      }),
    );
    expect(onAssign).toHaveBeenCalledWith("sonnenaufgang");
  });

  it("zeigt bei leerer Ablage einen Hinweis statt einer leeren Liste", () => {
    render(
      <ContentLibraryScreen kind="text" items={[]} countLabel="0 Inhalte" />,
    );
    expect(
      screen.getByText("Hier ist noch nichts abgelegt."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("nennt die Klasse im Panel, wenn sie bekannt ist", () => {
    render(
      <ContentLibraryScreen
        kind="math"
        items={DEMO_ITEMS}
        countLabel={DEMO_COUNT}
        createFor="Klasse 7b"
      />,
    );
    expect(screen.getByText("Mathe anlegen für Klasse 7b")).toBeInTheDocument();
  });
});

describe("StartSheet", () => {
  const sheet = (
    props: Partial<React.ComponentProps<typeof StartSheet>> = {},
  ) => (
    <StartSheet
      open
      title="Present Perfect · Unit 3"
      classLabel="Zugeordnet zu Klassen 7b, 9a"
      roomFor="Klasse 7b"
      classAction="ändern"
      modes={MODES}
      mode="LAUFDIKTAT"
      note="Der Raumcode erscheint in der Lobby · Code gilt 90 Minuten"
      {...props}
    />
  );

  it("zeigt die vier Modi und startet im gewählten Modus", async () => {
    const onMode = vi.fn();
    const onStart = vi.fn();
    const onAllOptions = vi.fn();
    const onClasses = vi.fn();
    render(sheet({ onMode, onStart, onAllOptions, onClasses }));
    const dialog = screen.getByRole("dialog", { name: "Raum öffnen" });
    for (const mode of ["Laufdiktat", "Freie Übung", "Battle", "Stationen"]) {
      expect(
        within(dialog).getByRole("button", { name: new RegExp(`^${mode}`) }),
      ).toBeInTheDocument();
    }
    await userEvent.click(
      within(dialog).getByRole("button", { name: /^Battle/ }),
    );
    expect(onMode).toHaveBeenCalledWith("BATTLE");
    await userEvent.click(
      within(dialog).getByRole("button", {
        name: "Jetzt starten · Laufdiktat",
      }),
    );
    expect(onStart).toHaveBeenCalledTimes(1);
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Alle Optionen" }),
    );
    expect(onAllOptions).toHaveBeenCalledTimes(1);
    await userEvent.click(
      within(dialog).getByRole("button", { name: /ändern/ }),
    );
    expect(onClasses).toHaveBeenCalledTimes(1);
  });

  it("schließt per Escape und Knopf", async () => {
    const onClose = vi.fn();
    render(sheet({ onClose }));
    const dialog = screen.getByRole("dialog", { name: "Raum öffnen" });
    const cancel = new Event("cancel", { cancelable: true });
    fireEvent(dialog, cancel);
    expect(cancel.defaultPrevented).toBe(true);
    await userEvent.click(screen.getByRole("button", { name: "Schließen" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("verweist auf den offenen Raum, statt zu starten", () => {
    render(sheet({ roomOpen: { href: "/lehrer/live" } }));
    expect(screen.getByText("Es ist schon ein Raum offen")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Zum offenen Raum" }),
    ).toHaveAttribute("href", "/lehrer/live");
    expect(
      screen.queryByRole("button", { name: /Jetzt starten/ }),
    ).not.toBeInTheDocument();
  });

  it("ist zu, solange open falsch ist", () => {
    render(sheet({ open: false }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("ClassAssignDialog", () => {
  const classes = [
    { id: "a", name: "Klasse 7b", sub: "Englisch", checked: true },
    { id: "b", name: "Klasse 9a", sub: "Französisch", checked: false },
  ];

  it("zeigt alle Klassen als Häkchen und meldet Änderungen und Speichern", async () => {
    const onToggle = vi.fn();
    const onSave = vi.fn();
    render(
      <ClassAssignDialog
        open
        title="Present Perfect · Unit 3"
        classes={classes}
        note="Ohne Häkchen steht der Inhalt unter „Nicht zugeordnet“."
        onToggle={onToggle}
        onSave={onSave}
      />,
    );
    expect(screen.getByRole("checkbox", { name: /Klasse 7b/ })).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: /Klasse 9a/ }),
    ).not.toBeChecked();
    await userEvent.click(screen.getByRole("checkbox", { name: /Klasse 9a/ }));
    expect(onToggle).toHaveBeenCalledWith("b");
    await userEvent.click(screen.getByRole("button", { name: "Speichern" }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("bricht per Knopf und Escape ab und erklärt eine leere Liste", async () => {
    const onClose = vi.fn();
    render(
      <ClassAssignDialog
        open
        title="Titel"
        classes={[]}
        note="Hinweis"
        onClose={onClose}
      />,
    );
    expect(screen.getByText("Es gibt noch keine Klasse.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Abbrechen" }));
    fireEvent(
      screen.getByRole("dialog"),
      new Event("cancel", { cancelable: true }),
    );
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
