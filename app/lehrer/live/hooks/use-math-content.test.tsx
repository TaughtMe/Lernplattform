// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import type { TeacherContentMode } from "../../../../src/integrations/laufdiktat/teacher-session";
import { initialGameSettings, type GameSettings } from "./use-game-settings";
import { useMathContent } from "./use-math-content";

function setup(
  math: string,
  overrides: Partial<GameSettings> = {},
  contentMode: TeacherContentMode = "math",
) {
  return renderHook(() => {
    const [sources, setSources] = useState<Record<TeacherContentMode, string>>({
      text: "",
      vocabulary: "",
      math,
    });
    const [error, setError] = useState("");
    const content = useMathContent({
      mathSource: sources.math,
      contentMode,
      settings: { ...initialGameSettings(), ...overrides },
      setSources,
      setError,
    });
    return { ...content, sources, error };
  });
}

describe("useMathContent", () => {
  it("zerlegt die Aufgaben in Zeilen und baut nur im Mathe-Modus Wörter", () => {
    const math = setup("1 + 2\n3 + 4");
    expect(math.result.current.mathLines).toEqual(["1 + 2", "3 + 4"]);
    expect(math.result.current.mathWords).toHaveLength(2);
    const text = setup("1 + 2", {}, "text");
    expect(text.result.current.mathWords).toEqual([]);
  });

  it("setzt beim Bearbeiten Entwurf und Zeile, und übernimmt sie mit Leerzeichen", () => {
    const math = setup("1 + 2\n3 + 4");
    act(() => math.result.current.startEditMathRow(1));
    expect(math.result.current.mathEditIndex).toBe(1);
    expect(math.result.current.mathDraft).toBe("3 + 4");
    act(() => math.result.current.setMathDraft("6+4-2"));
    expect(math.result.current.mathDraftResult).toBe(8);
    act(() => math.result.current.commitMathEdit(false));
    expect(math.result.current.sources.math).toBe("1 + 2\n6 + 4 − 2");
    expect(math.result.current.mathEditIndex).toBeNull();
    expect(math.result.current.mathDraft).toBe("");
  });

  it("hängt eine Zeile an und bleibt auf Wunsch im Bearbeiten", () => {
    const math = setup("1 + 2");
    act(() => math.result.current.startAppendMathLine());
    expect(math.result.current.mathEditIndex).toBe(1);
    act(() => math.result.current.setMathDraft("5 + 5"));
    act(() => math.result.current.commitMathEdit(true));
    expect(math.result.current.sources.math).toBe("1 + 2\n5 + 5");
    expect(math.result.current.mathEditIndex).toBe(2);
  });

  it("entfernt eine geleerte Zeile samt Lücke", () => {
    const math = setup("1 + 2\n3 + 4\n5 + 6");
    act(() => math.result.current.setMathLineGap(0, 1));
    act(() => math.result.current.setMathLineGap(1, 2));
    act(() => math.result.current.setMathLineGap(2, 0));
    act(() => math.result.current.startEditMathRow(1));
    act(() => math.result.current.setMathDraft(""));
    act(() => math.result.current.commitMathEdit(false));
    expect(math.result.current.sources.math).toBe("1 + 2\n5 + 6");
    expect(math.result.current.mathGaps).toEqual([1, 0]);
  });

  it("löscht eine Zeile samt Lücke und beendet das Bearbeiten", () => {
    const math = setup("1 + 2\n3 + 4");
    act(() => math.result.current.setMathLineGap(0, 2));
    act(() => math.result.current.setMathLineGap(1, 1));
    act(() => math.result.current.startEditMathRow(0));
    act(() => math.result.current.deleteMathLine(0));
    expect(math.result.current.sources.math).toBe("3 + 4");
    expect(math.result.current.mathGaps).toEqual([1]);
    expect(math.result.current.mathEditIndex).toBeNull();
  });

  it("bricht das Bearbeiten ab und verwirft den Entwurf", () => {
    const math = setup("1 + 2");
    act(() => math.result.current.startEditMathRow(0));
    act(() => math.result.current.cancelMathEdit());
    expect(math.result.current.mathDraft).toBe("");
    expect(math.result.current.mathEditIndex).toBeNull();
  });

  it("erzeugt Aufgaben nach den Regeln und löscht die Lücken", () => {
    const math = setup("", { mathCount: 4, mathMin: 1, mathMax: 9 });
    act(() => math.result.current.setMathLineGap(0, 1));
    act(() => math.result.current.generateMathTasks());
    expect(math.result.current.mathLines).toHaveLength(4);
    expect(math.result.current.mathGaps).toEqual([]);
    expect(math.result.current.error).toBe("");
  });

  it("meldet unlösbare Regeln beim Erzeugen und Würfeln", () => {
    const rules = {
      mathMin: 5,
      mathMax: 5,
      mathOps: ["-" as const],
      mathExcludeZeroResult: true,
    };
    const math = setup("1 + 2", rules);
    act(() => math.result.current.generateMathTasks());
    const message =
      "Keine passenden Aufgaben. Bitte ändere den Zahlenraum oder die Regeln.";
    expect(math.result.current.error).toBe(message);
    expect(math.result.current.sources.math).toBe("1 + 2");
    const reroll = setup("1 + 2", rules);
    act(() => reroll.result.current.rerollMathLine(0));
    expect(reroll.result.current.error).toBe(message);
    expect(reroll.result.current.sources.math).toBe("1 + 2");
  });

  it("würfelt eine einzelne Zeile neu", () => {
    const math = setup("1 + 2\n3 + 4", { mathMin: 1, mathMax: 9 });
    act(() => math.result.current.rerollMathLine(1));
    expect(math.result.current.mathLines).toHaveLength(2);
    expect(math.result.current.mathLines[0]).toBe("1 + 2");
  });
});
