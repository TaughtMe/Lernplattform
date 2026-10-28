import { describe, expect, it } from "vitest";
import {
  firstContactAreas,
  hasLearnedNothing,
  homeMainAction,
} from "./first-contact";
import { resolveStages, resolveVisibility } from "./release";

const fresh = { hasLearningState: false, planTotal: 0, className: null };

describe("hasLearnedNothing", () => {
  it("erkennt ein frisches Gerät", () => {
    expect(hasLearnedNothing(fresh)).toBe(true);
  });

  it("zählt jeden Lernstand, jede Portion und jede Klasse als Gelerntes", () => {
    expect(hasLearnedNothing({ ...fresh, hasLearningState: true })).toBe(false);
    expect(hasLearnedNothing({ ...fresh, planTotal: 1 })).toBe(false);
    expect(hasLearnedNothing({ ...fresh, className: "Klasse 7b" })).toBe(false);
  });

  it("hält ein Kind mit unlesbarem Lernstand nicht für neu", () => {
    expect(hasLearnedNothing({ ...fresh, hasLearningState: null })).toBe(false);
  });
});

describe("firstContactAreas", () => {
  const visibility = (overrides: string) =>
    resolveVisibility(resolveStages(overrides), false);

  it("bietet Wörter üben, Rechnen und Vokabeln an, nie die Tastenwelt", () => {
    const areas = firstContactAreas(visibility(""));
    expect(areas.map((entry) => entry.title)).toEqual([
      "Wörter üben",
      "Rechnen",
      "Vokabeln",
    ]);
    expect(areas.map((entry) => entry.href)).toEqual([
      "/frei/german/lernwoerter",
      "/frei/mathematics",
      "/lernbox",
    ]);
    expect(areas.some((entry) => entry.href.includes("typing"))).toBe(false);
  });

  it("zeigt nur Bereiche, die laut Freigaberegister sichtbar sind", () => {
    const areas = firstContactAreas(visibility("lernbox=aus,mathe=vorschau"));
    expect(areas.map((entry) => entry.title)).toEqual(["Wörter üben"]);
    expect(
      firstContactAreas(visibility("lernbox=aus,mathe=aus,wortspeicher=aus")),
    ).toEqual([]);
  });
});

describe("homeMainAction", () => {
  it("sagt „Loslegen“ statt „Weiterlernen“, wenn nichts fortzusetzen ist", () => {
    expect(
      homeMainAction({ firstContact: true, hasNextStep: false, planTotal: 0 }),
    ).toBe("Loslegen");
  });

  it("sagt „Weiterlernen“, solange es etwas fortzusetzen gibt", () => {
    expect(
      homeMainAction({ firstContact: false, hasNextStep: true, planTotal: 0 }),
    ).toBe("Weiterlernen");
    expect(
      homeMainAction({ firstContact: false, hasNextStep: false, planTotal: 3 }),
    ).toBe("Weiterlernen");
  });

  it("sagt „Frei üben“ an einem Tag ohne Plan und ohne Vorschlag", () => {
    expect(
      homeMainAction({ firstContact: false, hasNextStep: false, planTotal: 0 }),
    ).toBe("Frei üben");
  });
});
