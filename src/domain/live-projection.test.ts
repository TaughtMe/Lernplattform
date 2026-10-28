import { describe, expect, it } from "vitest";
import { summarizeLiveProjection } from "./live-projection";

describe("summarizeLiveProjection", () => {
  it("nennt nur Zahlen für den ganzen Raum", () => {
    const summary = summarizeLiveProjection({
      active: 12,
      finished: 12,
      overall: 63.4,
    });
    expect(summary).toEqual({
      finished: 12,
      total: 24,
      overall: 63,
      label: "12 von 24 fertig",
    });
    // Keine Namen, Fehlerzahlen oder Hilfe-Hinweise im Ergebnis.
    expect(Object.keys(summary).sort()).toEqual([
      "finished",
      "label",
      "overall",
      "total",
    ]);
  });

  it("sagt, wenn noch niemand mitspielt", () => {
    expect(
      summarizeLiveProjection({ active: 0, finished: 0, overall: 0 }).label,
    ).toBe("Noch niemand in der Runde");
  });

  it("begrenzt ungültige Zahlen", () => {
    expect(
      summarizeLiveProjection({
        active: -3,
        finished: Number.NaN,
        overall: 180,
      }),
    ).toMatchObject({ finished: 0, total: 0, overall: 100 });
    expect(
      summarizeLiveProjection({ active: 0, finished: 5, overall: -4 }),
    ).toMatchObject({ total: 5, overall: 0, label: "5 von 5 fertig" });
  });
});
