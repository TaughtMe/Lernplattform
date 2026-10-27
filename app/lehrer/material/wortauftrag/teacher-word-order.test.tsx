import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  parseOrderTitleParam,
  parseWordsParam,
} from "../../../../src/domain/practice-bridge";
import { TeacherWordOrder } from "./teacher-word-order";

vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({
    value,
    "aria-label": ariaLabel,
  }: {
    value: string;
    "aria-label"?: string;
  }) => <svg aria-label={ariaLabel} data-qr-value={value} role="img" />,
}));

const print = vi.fn();
const writeText = vi.fn<(text: string) => Promise<void>>();

beforeEach(() => {
  print.mockReset();
  writeText.mockReset().mockResolvedValue(undefined);
  vi.stubGlobal("print", print);
});

/** user-event ersetzt die Zwischenablage beim Einrichten; danach gilt die eigene. */
function setupUser() {
  const user = userEvent.setup();
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  return user;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Das Wortfeld und der Titel des n-ten Auftrags (ab 1). */
function fields(n: number) {
  const card = screen.getByRole("region", { name: `Auftrag ${n}` });
  return {
    card,
    title: within(card).getByLabelText(/^Titel/),
    words: within(card).getByLabelText("Wörter"),
  };
}

describe("TeacherWordOrder", () => {
  it("zeigt ohne Eingabe weder Hinweis noch Code", () => {
    render(<TeacherWordOrder />);
    expect(screen.getByRole("heading", { name: "Wortauftrag" })).toBeVisible();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("Erkannte Wörter: 0 Wörter")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Kärtchen drucken" }),
    ).toBeDisabled();
  });

  it("zeigt die erkannten Wörter und baut Code und Link", async () => {
    const user = setupUser();
    render(<TeacherWordOrder />);
    const { card, title, words } = fields(1);
    await user.type(title, "Gruppe A");
    await user.type(words, "Ball, Fuß{Enter}Straße; ball");

    expect(
      within(card).getByRole("list", { name: /^Erkannte Wörter/ }),
    ).toHaveTextContent("BallFußStraße");
    expect(within(card).getByText(/1 Eintrag wurde ausgelassen/)).toBeVisible();

    const qr = within(card).getByRole("img", { name: "QR-Code für Gruppe A" });
    const link = qr.getAttribute("data-qr-value") ?? "";
    const url = new URL(link);
    expect(url.origin).toBe(window.location.origin);
    expect(url.pathname).toBe("/frei/german");
    expect(parseWordsParam(url.searchParams.get("woerter"))).toEqual([
      "Ball",
      "Fuß",
      "Straße",
    ]);
    expect(parseOrderTitleParam(url.searchParams.get("auftrag"))).toBe(
      "Gruppe A",
    );
    // Außer Wörtern und Titel steht nichts im Link.
    expect([...url.searchParams.keys()]).toEqual(["woerter", "auftrag"]);
    expect(within(card).getByLabelText("Link")).toHaveValue(link);
  });

  it("meldet zu viele Wörter und zu lange Listen verständlich, ohne Code", async () => {
    const user = setupUser();
    render(<TeacherWordOrder />);
    const { card, words } = fields(1);
    const fifty = Array.from(
      { length: 50 },
      (_, i) => `${"w".repeat(28)}${String(i).padStart(2, "0")}`,
    ).join(", ");
    await user.click(words);
    await user.paste(fifty);
    expect(within(card).getByRole("status")).toHaveTextContent(
      /zu dicht.*zwei Aufträge/,
    );
    expect(within(card).queryByRole("img")).not.toBeInTheDocument();

    await user.clear(words);
    await user.click(words);
    await user.paste(
      Array.from({ length: 51 }, (_, i) => `wort${i}`).join(", "),
    );
    expect(within(card).getByRole("status")).toHaveTextContent(
      "Ein Auftrag hat höchstens 50 Wörter.",
    );
    expect(within(card).queryByRole("img")).not.toBeInTheDocument();
  });

  it("kopiert den Link und meldet es", async () => {
    const user = setupUser();
    render(<TeacherWordOrder />);
    const { card, words } = fields(1);
    await user.type(words, "Ball");
    await user.click(
      within(card).getByRole("button", { name: "Link kopieren" }),
    );
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("/frei/german?woerter=Ball&auftrag="),
    );
    expect(
      await within(card).findByText("Der Link ist kopiert."),
    ).toBeVisible();
  });

  it("sagt, wenn das Kopieren nicht klappt", async () => {
    writeText.mockRejectedValue(new Error("nicht erlaubt"));
    const user = setupUser();
    render(<TeacherWordOrder />);
    const { card, words } = fields(1);
    await user.type(words, "Ball");
    await user.click(
      within(card).getByRole("button", { name: "Link kopieren" }),
    );
    expect(
      await within(card).findByText(/Kopieren hat nicht geklappt/),
    ).toBeVisible();
  });

  it("verwaltet mehrere Aufträge nebeneinander", async () => {
    const user = setupUser();
    render(<TeacherWordOrder />);
    await user.type(fields(1).title, "Gruppe A");
    await user.type(fields(1).words, "Ball");
    await user.click(
      screen.getByRole("button", { name: "Weiteren Auftrag hinzufügen" }),
    );
    await user.type(fields(2).title, "Gruppe B");
    await user.type(fields(2).words, "Haus");

    expect(
      screen.getByRole("img", { name: "QR-Code für Gruppe A" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "QR-Code für Gruppe B" }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Auftrag 1 entfernen" }),
    );
    expect(
      screen.queryByRole("img", { name: "QR-Code für Gruppe A" }),
    ).toBeNull();
    // Der letzte Auftrag lässt sich nicht entfernen.
    expect(screen.queryByRole("button", { name: /entfernen/ })).toBeNull();
  });

  it("begrenzt die Zahl der Aufträge", async () => {
    const user = setupUser();
    render(<TeacherWordOrder />);
    const add = screen.getByRole("button", {
      name: "Weiteren Auftrag hinzufügen",
    });
    for (let i = 0; i < 7; i += 1) await user.click(add);
    expect(screen.getAllByRole("region")).toHaveLength(8);
    expect(add).toBeDisabled();
  });

  it("druckt alle Kärtchen, nicht nur das erste", async () => {
    const user = setupUser();
    render(<TeacherWordOrder />);
    await user.type(fields(1).title, "Gruppe A");
    await user.type(fields(1).words, "Ball");
    await user.click(
      screen.getByRole("button", { name: "Weiteren Auftrag hinzufügen" }),
    );
    await user.type(fields(2).title, "Gruppe B");
    await user.type(fields(2).words, "Haus, Maus");
    // Ein dritter Auftrag ohne Wörter kommt nicht aufs Blatt.
    await user.click(
      screen.getByRole("button", { name: "Weiteren Auftrag hinzufügen" }),
    );

    await user.click(screen.getByRole("button", { name: "Kärtchen drucken" }));
    expect(
      screen.getByRole("heading", { name: "Kärtchen drucken" }),
    ).toBeVisible();
    expect(screen.getAllByRole("figure")).toHaveLength(2);
    expect(screen.getByText("Gruppe A")).toBeVisible();
    expect(screen.getByText("Gruppe B")).toBeVisible();
    expect(screen.getByText("2 Wörter. Scanne den Code.")).toBeVisible();

    await user.selectOptions(screen.getByLabelText("Kärtchen je Auftrag"), "4");
    expect(screen.getAllByRole("figure")).toHaveLength(8);

    await user.click(
      screen.getByRole("button", { name: "Drucken oder als PDF speichern" }),
    );
    expect(print).toHaveBeenCalledTimes(1);

    // Bedienelemente sind im Druck ausgeblendet.
    const bar = screen.getByRole("button", {
      name: "Drucken oder als PDF speichern",
    }).parentElement?.parentElement;
    expect(bar).toHaveClass("ui-print-hidden");

    await user.click(
      screen.getByRole("button", { name: "Zurück zu den Aufträgen" }),
    );
    expect(fields(1).words).toHaveValue("Ball");
  });

  it("legt nichts im Browserspeicher ab", async () => {
    const user = setupUser();
    window.localStorage.clear();
    render(<TeacherWordOrder />);
    await user.type(fields(1).title, "Gruppe A");
    await user.type(fields(1).words, "Ball, Haus");
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });
});
