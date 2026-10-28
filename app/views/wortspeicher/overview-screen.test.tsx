import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OverviewScreen, type WordBoxTile } from "./overview-screen";

function setup(headline: WordBoxTile["headline"]) {
  render(
    <OverviewScreen
      tiles={[
        {
          id: "eigen-1",
          title: "Meine Tiere",
          kind: "eigen",
          examples: ["Hund", "Katze"],
          total: 100,
          secure: 4,
          headline,
        },
      ]}
      dueCount={0}
      ready
      onStart={() => undefined}
      onMenu={() => undefined}
      onCreate={() => undefined}
      onMixed={() => undefined}
    />,
  );
  return screen.getByRole("button", { name: /^Meine Tiere/ });
}

describe("OverviewScreen", () => {
  it("zeigt Stufe und Box-Fortschritt der zuletzt geübten Stufe", () => {
    const tile = setup({
      stage: 3,
      practicedWords: 10,
      coverage: { mastered: 10, total: 100, percent: 10 },
    });
    expect(tile).toHaveTextContent(
      "Stufe 3 · 10 % der Box (10 von 100 Wörtern)",
    );
    expect(tile).not.toHaveTextContent("Zuletzt");
  });

  it("nennt bei einem einzigen Wort den Singular", () => {
    const tile = setup({
      stage: 1,
      practicedWords: 1,
      coverage: { mastered: 1, total: 1, percent: 100 },
    });
    expect(tile).toHaveTextContent("Stufe 1 · 100 % der Box (1 von 1 Wort)");
  });

  it("zeigt ohne Box-Fortschritt „n Wörter geübt“", () => {
    const tile = setup({ stage: 2, practicedWords: 8 });
    expect(tile).toHaveTextContent("Stufe 2 · 8 Wörter geübt");
    expect(tile).not.toHaveTextContent("%");
  });

  it("zeigt ohne Runde „Noch nicht geübt“", () => {
    expect(setup(undefined)).toHaveTextContent("Noch nicht geübt");
  });

  it("nennt einen leeren Tag „noch nichts geplant“ und nicht „nichts fällig“ (C-008)", () => {
    setup(undefined);
    expect(
      screen.getByText(/Heute ist noch nichts geplant\./),
    ).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("nichts fällig");
    expect(
      screen.getByRole("button", { name: "Gemischt trainieren" }),
    ).toBeDisabled();
  });
});
