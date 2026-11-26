import { describe, expect, it } from "vitest";
import {
  exerciseCardHref,
  exerciseCardTitle,
  parseMathCardParams,
  parseStageParam,
} from "./exercise-card";

const params = (href: string) =>
  new URL(href, "https://lernraum.test").searchParams;

describe("Übungskarten (L25-4)", () => {
  it("baut für eine Wortbox Adresse und Titel ohne eigene Wörter", () => {
    const card = { kind: "wortbox", collectionId: "ck-tz", stage: 3 } as const;
    expect(exerciseCardHref(card)).toBe(
      "/frei/german/lernwoerter?sammlung=ck-tz&stufe=3",
    );
    expect(exerciseCardTitle(card)).toBe("ck und tz · Stufe 3");
    expect(parseStageParam(params(exerciseCardHref(card)).get("stufe"))).toBe(
      3,
    );
  });

  it("baut und liest eine Rechenkarte mit Rechenart und Zahlenraum", () => {
    const card = {
      kind: "kopfrechnen",
      operations: ["add", "subtract", "add"],
      max: 100,
    } as const;
    const href = exerciseCardHref(card);
    expect(href).toBe("/frei/mathematics?rechnen=plus,minus&bis=100");
    expect(exerciseCardTitle(card)).toBe("Plus und Minus bis 100");
    expect(parseMathCardParams(params(href))).toEqual({
      operations: ["add", "subtract"],
      max: 100,
    });
  });

  it("baut und liest eine Karte mit Mittelschul-Arten", () => {
    const card = {
      kind: "kopfrechnen",
      mathKinds: ["tens", "decimal"],
    } as const;
    const href = exerciseCardHref(card);
    expect(href).toBe("/frei/mathematics?arten=tens,decimal");
    expect(exerciseCardTitle(card)).toBe("Zehnereinmaleins · Komma und Geld");
    expect(parseMathCardParams(params(href))).toEqual({
      mathKinds: ["tens", "decimal"],
    });
  });

  it("ignoriert ungültige Werte", () => {
    expect(parseStageParam("7")).toBeUndefined();
    expect(parseStageParam(null)).toBeUndefined();
    expect(
      parseMathCardParams(params("/x?rechnen=hoch&bis=100")),
    ).toBeUndefined();
    expect(
      parseMathCardParams(params("/x?rechnen=plus&bis=50")),
    ).toBeUndefined();
    expect(parseMathCardParams(params("/x?arten=foo"))).toBeUndefined();
    expect(parseMathCardParams(params("/x"))).toBeUndefined();
  });
});
