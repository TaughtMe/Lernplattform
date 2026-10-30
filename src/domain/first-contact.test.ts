import { describe, expect, it } from "vitest";
import { hasLearnedNothing, homeMainAction } from "./first-contact";

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
