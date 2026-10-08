import { describe, expect, it } from "vitest";
import {
  areaForPath,
  fallbackRoute,
  isPathVisible,
  isStageVisible,
  parseReleaseConfig,
  resolveStages,
  resolveVisibility,
} from "./release";

describe("Freigaberegister", () => {
  it("ordnet Routen dem genauesten Bereich zu", () => {
    expect(areaForPath("/")).toBe("start");
    expect(areaForPath("/raum")).toBe("raum");
    expect(areaForPath("/raum/")).toBe("raum");
    expect(areaForPath("/lehrer/live")).toBe("lehrer-live");
    expect(areaForPath("/lehrer/klassen")).toBe("lehrer");
    expect(areaForPath("/lehrer/haeuser")).toBe("motivation");
    expect(areaForPath("/frei/german/laufdiktat")).toBe("laufdiktat-frei");
    expect(areaForPath("/frei/german/lernwoerter")).toBe("wortspeicher");
    // Das längste Präfix gewinnt: die Textbox ist ein eigener Bereich.
    expect(areaForPath("/frei/german/textbox")).toBe("textbox");
    expect(areaForPath("/frei/german/textbox/laufzettel")).toBe("textbox");
    expect(areaForPath("/frei/german/textboxen")).toBe("wortspeicher");
    expect(areaForPath("/frei/mathematics")).toBe("mathe");
    expect(areaForPath("/frei/typing")).toBe("tastenwelt");
    expect(areaForPath("/frei/sonstiges")).toBe("lernen");
    expect(areaForPath("/lernbox")).toBe("lernbox");
    expect(areaForPath("/lernboxen")).toBeNull();
    expect(areaForPath("/entwicklung/ui")).toBeNull();
  });

  it("nutzt Schulbetrieb-Standards und übernimmt gültige Abweichungen", () => {
    const defaults = resolveStages(undefined);
    expect(defaults.raum).toBe("frei");
    expect(defaults.lernbox).toBe("frei");
    expect(defaults.lernen).toBe("frei");
    expect(defaults.lehrer).toBe("frei");
    expect(defaults.textbox).toBe("frei");
    expect(defaults.wortspeicher).toBe("frei");
    expect(defaults.motivation).toBe("aus");
    expect(defaults.duell).toBe("aus");

    const custom = resolveStages(" lernbox = vorschau ,duell=vorschau");
    expect(custom.lernbox).toBe("vorschau");
    expect(custom.duell).toBe("vorschau");
    expect(custom.raum).toBe("frei");
  });

  it("meldet unbekannte Bereiche und Stufen, statt sie zu übernehmen", () => {
    const { overrides, rejected } = parseReleaseConfig(
      "lernbox=offen,unbekannt=frei,haus,,tastenwelt=aus",
    );
    expect(overrides).toEqual({ tastenwelt: "aus" });
    expect(rejected).toEqual(["lernbox=offen", "unbekannt=frei", "haus"]);
  });

  it("zeigt Vorschau-Bereiche nur mit eingeschalteter Vorschau", () => {
    expect(isStageVisible("frei", false)).toBe(true);
    expect(isStageVisible("vorschau", false)).toBe(false);
    expect(isStageVisible("vorschau", true)).toBe(true);
    expect(isStageVisible("aus", true)).toBe(false);

    const stages = resolveStages("lernbox=vorschau");
    const school = resolveVisibility(stages, false);
    const preview = resolveVisibility(stages, true);
    expect(isPathVisible("/raum?code=1234".split("?")[0]!, school)).toBe(true);
    expect(isPathVisible("/lernbox", school)).toBe(false);
    expect(isPathVisible("/lernbox", preview)).toBe(true);
    expect(isPathVisible("/duell", preview)).toBe(false);
    expect(isPathVisible("/entwicklung/ui", school)).toBe(true);
  });

  it("gibt die Textbox frei und lässt sie per Freigabe zurück in die Vorschau", () => {
    const school = resolveVisibility(resolveStages(undefined), false);
    expect(isPathVisible("/frei/german/textbox", school)).toBe(true);
    expect(isPathVisible("/frei/german/lernwoerter", school)).toBe(true);
    const held = resolveStages("textbox=vorschau");
    expect(
      isPathVisible("/frei/german/textbox", resolveVisibility(held, false)),
    ).toBe(false);
    expect(
      isPathVisible("/frei/german/textbox", resolveVisibility(held, true)),
    ).toBe(true);
  });

  it("leitet Lehrkräfte zum Live-Raum und alle anderen zum Start", () => {
    expect(fallbackRoute("/lehrer/klassen/")).toBe("/lehrer/live");
    expect(fallbackRoute("/lernbox")).toBe("/");
  });
});
