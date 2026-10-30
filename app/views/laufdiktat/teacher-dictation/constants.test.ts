import { describe, expect, it } from "vitest";
import { ALL_MODES } from "../../../lehrer/live/lib/modes";
import { MODES } from "./constants";

// Das Battle hat keine echten Gewinner und keine Rangliste (Befund D-012): Die
// Texte versprechen weder einen Sieg noch Tempo. Es zählt, die Runde genau und
// gemeinsam zu Ende zu bringen.
const COMPETITION = /gewinn|sieg|erster|zuerst fertig|schnellst|rangliste/i;

describe("Battle-Texte", () => {
  it("versprechen weder Sieger noch Tempo (Editor)", () => {
    const battle = MODES.find((mode) => mode.id === "BATTLE")!;
    for (const text of [battle.title, battle.sub, ...battle.flow]) {
      expect(text).not.toMatch(COMPETITION);
    }
    expect(battle.flow).toContain("Gemeinsam die Runde abschließen");
  });

  it("versprechen weder Sieger noch Tempo (Raumwahl)", () => {
    const battle = ALL_MODES.find((mode) => mode.id === "BATTLE")!;
    for (const text of [
      battle.title,
      battle.text,
      battle.short,
      ...battle.steps,
    ]) {
      expect(text).not.toMatch(COMPETITION);
    }
  });
});
