import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { buildVocabularyCatalog } from "../../../src/domain/vocabulary-catalog";
import {
  VocabularyPicker,
  type VocabularyPickerProps,
} from "./vocabulary-picker";

const catalog = buildVocabularyCatalog([
  {
    id: "u3",
    revision: 1,
    title: "Unit 3 · Food",
    source: "apple;Apfel;Food\nbread;Brot;Food\nhouse;Haus|Heim",
    promptLocale: "en-GB",
    answerLocale: "de-DE",
    createdAt: "2026-09-01T10:00:00.000Z",
    updatedAt: "2026-10-01T10:00:00.000Z",
  },
  {
    id: "u2",
    revision: 1,
    title: "Unit 2",
    source: "cat;Katze\ndog;Hund",
    promptLocale: "en",
    answerLocale: "de",
    createdAt: "2026-09-01T10:00:00.000Z",
    updatedAt: "2026-09-02T10:00:00.000Z",
  },
]);

const props = (
  extra: Partial<VocabularyPickerProps> = {},
): VocabularyPickerProps => ({
  open: true,
  packages: catalog,
  hiddenByLanguage: 0,
  query: "",
  allClasses: false,
  className: "7b",
  selected: new Set(),
  expanded: new Set(["u3", "u2"]),
  ...extra,
});

/** Hält die Auswahl wie der Hook, damit Zwischenzustände sichtbar werden. */
function Harness({ onConfirm }: { onConfirm?: () => void }) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  return (
    <VocabularyPicker
      {...props({ selected })}
      onToggle={(keys, checked) =>
        setSelected((current) => {
          const next = new Set(current);
          for (const key of keys)
            if (checked) next.add(key);
            else next.delete(key);
          return next;
        })
      }
      onClear={() => setSelected(new Set())}
      {...(onConfirm ? { onConfirm } : {})}
    />
  );
}

describe("VocabularyPicker", () => {
  it("zeigt Pakete als Überschriften mit Anzahl und Sprache, darunter die Tags", () => {
    render(<VocabularyPicker {...props()} />);
    expect(
      screen.getByRole("heading", { level: 3, name: /Unit 3 · Food/ }),
    ).toHaveTextContent("3 Vokabeln · Englisch → Deutsch");
    expect(screen.getByRole("heading", { name: "Food" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Ohne Tag" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: "house → Haus | Heim" }),
    ).toBeInTheDocument();
    // Ein Paket ganz ohne Tags hat keine zweite Ebene.
    const plain = screen
      .getByRole("heading", { level: 3, name: /Unit 2/ })
      .closest("li")!;
    expect(within(plain).queryByRole("heading", { level: 4 })).toBeNull();
  });

  it("klappt Pakete mit aria-expanded und aria-controls", async () => {
    const onExpand = vi.fn();
    render(
      <VocabularyPicker
        {...props({ expanded: new Set(["u3"]) })}
        onExpand={onExpand}
      />,
    );
    const open = screen.getByRole("button", { name: /Unit 3/ });
    const closed = screen.getByRole("button", { name: /Unit 2/ });
    expect(open).toHaveAttribute("aria-expanded", "true");
    expect(closed).toHaveAttribute("aria-expanded", "false");
    expect(
      document.getElementById(closed.getAttribute("aria-controls")!),
    ).toHaveAttribute("hidden");
    await userEvent.click(closed);
    expect(onExpand).toHaveBeenCalledWith("u2", true);
  });

  it("setzt den Zwischenzustand und wählt über „alle“ Tag und Paket", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const all = screen.getByRole("checkbox", {
      name: "Alle Vokabeln aus Unit 3 · Food auswählen",
    });
    const food = screen.getByRole("checkbox", {
      name: "Alle Vokabeln mit Tag Food aus Unit 3 · Food auswählen",
    });
    await user.click(screen.getByRole("checkbox", { name: "apple → Apfel" }));
    expect(all).toHaveProperty("indeterminate", true);
    expect(food).toHaveProperty("indeterminate", true);
    expect(screen.getByRole("status")).toHaveTextContent("1 ausgewählt");

    await user.click(food);
    expect(food).toBeChecked();
    expect(food).toHaveProperty("indeterminate", false);
    expect(all).toHaveProperty("indeterminate", true);
    expect(screen.getByRole("status")).toHaveTextContent("2 ausgewählt");

    await user.click(all);
    expect(all).toBeChecked();
    expect(screen.getByRole("status")).toHaveTextContent("3 ausgewählt");
    await user.click(all);
    expect(screen.getByRole("status")).toHaveTextContent("0 ausgewählt");
  });

  it("meldet bei „alle“ nur die sichtbaren Treffer", async () => {
    const onToggle = vi.fn();
    const visible = catalog.map((entry) =>
      entry.id === "u3"
        ? {
            ...entry,
            groups: [
              { ...entry.groups[0]!, pairs: [entry.groups[0]!.pairs[0]!] },
            ],
          }
        : entry,
    );
    render(
      <VocabularyPicker
        {...props({ packages: visible, query: "apfel" })}
        onToggle={onToggle}
      />,
    );
    await userEvent.click(
      screen.getByRole("checkbox", {
        name: "Alle Vokabeln aus Unit 3 · Food auswählen",
      }),
    );
    expect(onToggle).toHaveBeenCalledWith(["u3:0"], true);
  });

  it("deaktiviert „Übernehmen“ bei 0 und löst es sonst aus", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<Harness onConfirm={onConfirm} />);
    const confirm = screen.getByRole("button", { name: "Übernehmen" });
    expect(confirm).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Auswahl leeren" }),
    ).toBeDisabled();
    await user.click(screen.getByRole("checkbox", { name: "dog → Hund" }));
    expect(confirm).toBeEnabled();
    await user.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Auswahl leeren" }));
    expect(screen.getByRole("status")).toHaveTextContent("0 ausgewählt");
  });

  it("nennt ausgeblendete Pakete anderer Sprachen", () => {
    const { rerender } = render(
      <VocabularyPicker {...props({ hiddenByLanguage: 3 })} />,
    );
    expect(
      screen.getByText("3 Pakete in anderen Sprachen ausgeblendet"),
    ).toBeInTheDocument();
    rerender(<VocabularyPicker {...props({ hiddenByLanguage: 1 })} />);
    expect(
      screen.getByText("1 Paket in anderen Sprachen ausgeblendet"),
    ).toBeInTheDocument();
  });

  it("zeigt die Leerzustände", () => {
    const { rerender } = render(
      <VocabularyPicker {...props({ packages: [], query: "xyz" })} />,
    );
    expect(
      screen.getByText("Keine Vokabel passt zur Suche."),
    ).toBeInTheDocument();
    rerender(<VocabularyPicker {...props({ packages: [] })} />);
    expect(
      screen.getByText(
        "Für Klasse 7b liegen keine Vokabelpakete ab. „Alle Klassen“ zeigt alle.",
      ),
    ).toBeInTheDocument();
    rerender(
      <VocabularyPicker {...props({ packages: [], allClasses: true })} />,
    );
    expect(
      screen.getByText("Keine Vokabelpakete vorhanden."),
    ).toBeInTheDocument();
  });

  it("meldet Suche, Klassenschalter und Schließen", async () => {
    const onQuery = vi.fn();
    const onAllClasses = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <VocabularyPicker
        {...props()}
        onQuery={onQuery}
        onAllClasses={onAllClasses}
        onClose={onClose}
      />,
    );
    await user.type(
      screen.getByRole("searchbox", { name: "Vokabeln durchsuchen" }),
      "a",
    );
    expect(onQuery).toHaveBeenCalledWith("a");
    await user.click(screen.getByRole("checkbox", { name: "Alle Klassen" }));
    expect(onAllClasses).toHaveBeenCalledWith(true);
    await user.click(screen.getByRole("button", { name: "Schließen" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("rendert nichts, solange er geschlossen ist", () => {
    render(<VocabularyPicker {...props({ open: false })} />);
    expect(screen.queryByRole("heading", { name: /Unit 3/ })).toBeNull();
  });
});
