import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LEARNING_WORD_STAGES } from "../../../src/domain/learning-word";
import { StartSheet, type StartSheetStage } from "./start-sheet";

function setup(last: Partial<Record<number, StartSheetStage["last"]>>) {
  render(
    <StartSheet
      title="Meine Tiere"
      wordCount={100}
      stages={LEARNING_WORD_STAGES.map((stage) => ({
        stage,
        last: last[stage],
        recommended: false,
      }))}
      stage={1}
      roundSize="all"
      blockSize={1}
      onStage={() => undefined}
      onRoundSize={() => undefined}
      onBlockSize={() => undefined}
      onStart={() => undefined}
      onClose={() => undefined}
    />,
  );
  return screen.getByRole("dialog");
}

describe("StartSheet", () => {
  it("zeigt je Stufe den Box-Fortschritt statt „Zuletzt“", () => {
    const sheet = setup({ 2: { coverage: 20 } });
    const stage = within(sheet).getByRole("button", { name: /^Stufe 2:/ });
    expect(stage).toHaveTextContent("20 % der Box");
    expect(stage).not.toHaveTextContent("Zuletzt");
  });

  it("zeigt ohne Runde auf der Stufe den Leertext", () => {
    const sheet = setup({ 2: { coverage: 20 } });
    expect(
      within(sheet).getByRole("button", { name: /^Stufe 1:/ }),
    ).toHaveTextContent("Zuletzt –");
  });

  it("zeigt in anderen Boxen weiter das Ergebnis der letzten Runde", () => {
    const sheet = setup({ 3: { percent: 80 }, 4: { words: 5 } });
    expect(
      within(sheet).getByRole("button", { name: /^Stufe 3:/ }),
    ).toHaveTextContent("Zuletzt 80 %");
    expect(
      within(sheet).getByRole("button", { name: /^Stufe 4:/ }),
    ).toHaveTextContent("5 Wörter geübt");
  });
});
