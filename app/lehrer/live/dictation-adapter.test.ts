import { describe, expect, it } from "vitest";
import { buildRunningDictationSections } from "../../../src/domain/running-dictation-sections";
import type { LiveRoomStudent } from "../../../src/integrations/laufdiktat/room-api";
import { liveOverview, splitConfigFor, splitModeOf } from "./dictation-adapter";

const text = "Der Hund bellt.\nDie Katze schläft.";

describe("dictation-adapter", () => {
  it("bildet Satz, Zeile und Wort auf die Trenn-Konfiguration ab", () => {
    for (const mode of ["satz", "zeile", "wort"] as const) {
      expect(splitModeOf(splitConfigFor(mode))).toBe(mode);
    }
    const count = (mode: "satz" | "zeile" | "wort") =>
      buildRunningDictationSections(text, splitConfigFor(mode)).length;
    expect(count("satz")).toBe(2);
    expect(count("zeile")).toBe(2);
    expect(count("wort")).toBe(6);
    expect(
      buildRunningDictationSections(
        "Eins zwei. Drei vier.",
        splitConfigFor("zeile"),
      ),
    ).toHaveLength(1);
  });

  it("fasst Fortschritt, Stationen und häufige Fehler zusammen", () => {
    const student = (
      name: string,
      patch: Partial<LiveRoomStudent>,
    ): LiveRoomStudent =>
      ({
        studentName: name,
        stationNumber: null,
        appVersion: null,
        currentIndex: 0,
        finished: false,
        errors: 0,
        wordErrors: {},
        ...patch,
      }) as LiveRoomStudent;
    const overview = liveOverview({
      students: [
        student("a", { currentIndex: 2, errors: 1, wordErrors: { Hund: 1 } }),
        student("b", { finished: true, currentIndex: 4 }),
      ],
      connectedNames: ["a", "b"],
      total: 4,
      stationMode: false,
      stationCount: 3,
      labelFor: (name) => name.toUpperCase(),
      animalFor: () => "Fuchs",
    });
    expect(overview).toMatchObject({ active: 1, finished: 1, overall: 75 });
    expect(overview.students[0]).toMatchObject({
      name: "A",
      progress: 2,
      total: 4,
      mistakes: 1,
    });
    expect(overview.mistakes).toEqual([{ word: "Hund", count: 1 }]);
    expect(overview.stations.map((s) => s.state)).toEqual([
      "idle",
      "idle",
      "idle",
    ]);
  });
});
