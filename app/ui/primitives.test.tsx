import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { AnimalImage } from "./animal";
import {
  Button,
  ButtonLink,
  EmptyState,
  IconButton,
  ProgressBar,
  ProgressRing,
  Segmented,
} from "./primitives";
import { Sheet } from "./sheet";

describe("Lernraum-UI-Grundbausteine", () => {
  it("setzt Varianten als Klassen und bleibt ein normaler Button", async () => {
    const onClick = vi.fn();
    render(
      <Button variant="ghost" size="lg" block onClick={onClick}>
        Weiter
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Weiter" });
    expect(button).toHaveClass("ui-btn", "ui-btn--ghost", "ui-btn--lg");
    expect(button).toHaveAttribute("type", "button");
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("rendert Links im Button-Stil und benannte Icon-Knöpfe", () => {
    render(
      <>
        <ButtonLink href="/lernbox">LernBox</ButtonLink>
        <IconButton label="QR-Code scannen" tone="green">
          <span />
        </IconButton>
      </>,
    );
    expect(screen.getByRole("link", { name: "LernBox" })).toHaveClass(
      "ui-btn--primary",
    );
    expect(screen.getByRole("button", { name: "QR-Code scannen" })).toHaveClass(
      "ui-icon-btn--green",
    );
  });

  it("meldet den gewählten Wert im Segmentschalter", async () => {
    function Harness() {
      const [mode, setMode] = useState<"write" | "oral">("write");
      return (
        <Segmented
          label="Modus"
          value={mode}
          onChange={setMode}
          options={[
            { value: "write", label: "Schreiben" },
            { value: "oral", label: "Mündlich" },
          ]}
        />
      );
    }
    render(<Harness />);
    const oral = screen.getByRole("button", { name: "Mündlich" });
    expect(oral).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(oral);
    expect(oral).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("group", { name: "Modus" })).toBeInTheDocument();
  });

  it("begrenzt Fortschrittswerte und beschriftet sie", () => {
    const { container } = render(
      <>
        <ProgressBar value={30} max={24} label="Heute fällig" />
        <ProgressBar value={3} max={0} label="Leer" />
        <ProgressRing value={18} max={24} size={120} />
      </>,
    );
    const bar = screen.getByRole("progressbar", { name: "Heute fällig" });
    expect(bar).toHaveAttribute("aria-valuenow", "24");
    expect(bar.querySelector("span")).toHaveStyle({ width: "100%" });
    expect(
      screen.getByRole("progressbar", { name: "Leer" }).querySelector("span"),
    ).toHaveStyle({ width: "0%" });
    expect(container.querySelector("svg")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("zeigt Tiere mit Dateinamen und Alternativtext", () => {
    render(
      <>
        <AnimalImage animal="Chamäleon" size={40} label="Chamäleon" />
        <AnimalImage animal={null} size={40} />
      </>,
    );
    expect(screen.getByRole("img", { name: "Chamäleon" })).toHaveAttribute(
      "src",
      "/animals/chameleon.svg",
    );
  });

  it("öffnet und schließt das Blatt über den Schließen-Knopf", async () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <Sheet open title="Leistungsbrief" onClose={onClose}>
        <EmptyState title="Noch nichts">Später mehr.</EmptyState>
      </Sheet>,
    );
    expect(screen.getByText("Noch nichts")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Schließen" }));
    expect(onClose).toHaveBeenCalledOnce();
    rerender(
      <Sheet open={false} title="Leistungsbrief" onClose={onClose}>
        <p>Inhalt</p>
      </Sheet>,
    );
    expect(document.querySelector("dialog")?.hasAttribute("open")).toBeFalsy();
  });
});
