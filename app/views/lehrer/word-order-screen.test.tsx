import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  buildWordOrderLink,
  ORDER_LINK_MAX_LENGTH,
  ORDER_TITLE_MAX,
} from "../../../src/domain/practice-bridge";
import { WordOrderScreen, type WordOrderView } from "./word-order-screen";

const noop = vi.fn();

function screenWith(orders: WordOrderView[], sheetOpen = false) {
  return (
    <WordOrderScreen
      orders={orders}
      titleMax={ORDER_TITLE_MAX}
      maxOrders={8}
      copy={undefined}
      sheetOpen={sheetOpen}
      copies={1}
      copiesOptions={[1, 2]}
      onTitle={noop}
      onText={noop}
      onAdd={noop}
      onRemove={noop}
      onCopy={noop}
      onOpenSheet={noop}
      onCloseSheet={noop}
      onCopies={noop}
      onPrint={noop}
    />
  );
}

const order = (patch: Partial<WordOrderView> = {}): WordOrderView => ({
  id: "a",
  titleInput: "",
  textInput: "",
  words: [],
  ignored: 0,
  ...patch,
});

describe("WordOrderScreen", () => {
  it("zeigt den Hinweis zu Namen und Speicherung", () => {
    render(screenWith([order()]));
    expect(screen.getByText(/keine Namen/)).toBeVisible();
    expect(screen.getByText(/nicht erhalten/)).toBeVisible();
  });

  it("zeigt einen Auftrag mit Problem ohne Code", () => {
    render(
      screenWith([order({ problem: "Schreibe mindestens ein Wort auf." })]),
    );
    expect(screen.getByRole("status")).toBeDefined();
    expect(screen.getByText("Schreibe mindestens ein Wort auf.")).toBeVisible();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("lässt die Druckansicht ohne fertige Aufträge leer", () => {
    render(screenWith([order()], true));
    expect(screen.queryByRole("figure")).not.toBeInTheDocument();
  });
});

describe("Auftrags-QR", () => {
  it("bleibt auch an der Längengrenze bei höchstens 85 Modulen je Kante", async () => {
    // Echte Bibliothek, nicht die Attrappe der Container-Tests.
    const { QRCodeSVG } = await import("qrcode.react");
    const { renderToStaticMarkup } = await import("react-dom/server");
    // Wörter mit Umlauten (je 6 Zeichen je Umlaut in der Adresse) bis zur Grenze.
    const words: string[] = [];
    let link = "";
    for (let i = 0; i < 50; i += 1) {
      const next = [...words, `Äpfel${String(i).padStart(2, "0")}Ü`];
      const built = buildWordOrderLink(
        { title: "Gruppe A", text: next.join(",") },
        "https://lernraum.example",
      );
      if (!built.ok) break;
      words.push(next.at(-1) ?? "");
      link = built.url;
    }
    expect(link.length).toBeGreaterThan(ORDER_LINK_MAX_LENGTH - 40);
    expect(link.length).toBeLessThanOrEqual(ORDER_LINK_MAX_LENGTH);
    const markup = renderToStaticMarkup(<QRCodeSVG value={link} level="M" />);
    const modules = Number(/viewBox="0 0 (\d+) /.exec(markup)?.[1]);
    expect(modules).toBeLessThanOrEqual(85);
  });
});
