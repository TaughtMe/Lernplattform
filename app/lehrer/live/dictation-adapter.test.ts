import { describe, expect, it } from "vitest";
import { buildRunningDictationSections } from "../../../src/domain/running-dictation-sections";
import type { LiveRoomStudent } from "../../../src/integrations/laufdiktat/room-api";
import {
  liveOverview,
  nextErrorBase,
  splitConfigFor,
  splitModeOf,
  strugglingNames,
} from "./dictation-adapter";

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
      statusFor: (name) => (name === "b" ? "practice" : "online"),
    });
    expect(overview).toMatchObject({ active: 1, finished: 1, overall: 75 });
    expect(overview.students.map((entry) => entry.status)).toEqual([
      "online",
      "practice",
    ]);
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

describe("Schüler, die bei einer Aufgabe hängen", () => {
  const student = (over: Partial<LiveRoomStudent> = {}): LiveRoomStudent => ({
    studentName: "Mia",
    stationNumber: null,
    appVersion: null,
    currentIndex: 1,
    peeks: 0,
    attempts: 0,
    errors: 0,
    finished: false,
    ...over,
  });

  it("markiert nach 2 neuen Fehlern bei derselben Aufgabe", () => {
    let base = nextErrorBase({}, [student({ errors: 3 })]);
    expect(strugglingNames(base, [student({ errors: 3 })]).size).toBe(0);
    expect(strugglingNames(base, [student({ errors: 4 })]).size).toBe(0);
    expect(strugglingNames(base, [student({ errors: 5 })]).has("Mia")).toBe(
      true,
    );
    // Neue Aufgabe: Zählung beginnt neu.
    base = nextErrorBase(base, [student({ currentIndex: 2, errors: 5 })]);
    expect(
      strugglingNames(base, [student({ currentIndex: 2, errors: 5 })]).size,
    ).toBe(0);
  });

  it("zählt bei der ersten Aufgabe auch Fehler vor dem ersten Abruf", () => {
    const first = student({ currentIndex: 0, errors: 2 });
    const base = nextErrorBase({}, [first]);
    expect(strugglingNames(base, [first]).has("Mia")).toBe(true);
  });

  it("ignoriert Fertige und liefert ohne Änderung denselben Stand", () => {
    const base = nextErrorBase({}, [student()]);
    expect(nextErrorBase(base, [student()])).toBe(base);
    expect(
      strugglingNames(base, [student({ errors: 9, finished: true })]).size,
    ).toBe(0);
  });

  it("gibt die Markierung an die Schülerliste weiter", () => {
    const overview = liveOverview({
      students: [student()],
      connectedNames: ["Mia"],
      total: 5,
      stationMode: false,
      stationCount: 1,
      labelFor: (name) => name,
      animalFor: () => null,
      struggling: new Set(["Mia"]),
    });
    expect(overview.students[0]?.struggling).toBe(true);
  });
});
