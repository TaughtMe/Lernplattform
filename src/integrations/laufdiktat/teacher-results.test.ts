import { describe, expect, it } from "vitest";
import type { LiveRoomParticipant, LiveRoomStudent } from "./room-api";
import {
  aggregateWordErrors,
  buildTeacherResultCsv,
  csvParticipantLabel,
  resultNamesFor,
} from "./teacher-results";

const students: LiveRoomStudent[] = [
  {
    studentName: "Mia",
    stationNumber: null,
    appVersion: "lernraum-0.2.0",
    currentIndex: 3,
    peeks: 1,
    attempts: 4,
    errors: 1,
    finished: true,
    wordErrors: { Schule: 1 },
  },
  {
    studentName: "Noah",
    stationNumber: null,
    appVersion: "lernraum-0.2.0",
    currentIndex: 1,
    peeks: 0,
    attempts: 2,
    errors: 2,
    finished: false,
    wordErrors: { Schule: 1, "Haus;Hof": 1 },
  },
];

describe("teacher result export", () => {
  it("aggregates word errors across participants", () => {
    expect(aggregateWordErrors(students)).toEqual([
      ["Schule", 2],
      ["Haus;Hof", 1],
    ]);
  });

  it("exports progress and safely escapes spreadsheet delimiters", () => {
    const csv = buildTeacherResultCsv(["Mia", "Noah"], students, 3);
    expect(csv).toContain("Mia;Fertig;100;1;4;1");
    expect(csv).toContain('"Haus;Hof";1');
  });

  it("uses animal labels instead of anonymous server keys", () => {
    const csv = buildTeacherResultCsv(["Mia"], students, 3, (name) =>
      name === "Mia" ? "Fuchs 2" : name,
    );
    expect(csv).toContain("Fuchs 2;Fertig;100");
    expect(csv).not.toContain("Mia;");
  });
});

describe("Ergebnisliste für den CSV-Export", () => {
  it("nimmt außerhalb von Stationen alle Namen", () => {
    expect(resultNamesFor("UEBUNG", students, ["Mia", "Zoe"])).toEqual([
      "Mia",
      "Zoe",
    ]);
  });

  it("sortiert im Stationsmodus nach Station und lässt Stationslose weg", () => {
    const withStations = [
      { ...students[0]!, studentName: "B", stationNumber: 3 },
      { ...students[0]!, studentName: "A", stationNumber: 1 },
      { ...students[0]!, studentName: "C", stationNumber: null },
    ];
    expect(resultNamesFor("STATION", withStations, ["X"])).toEqual(["A", "B"]);
  });

  it("beschriftet Tiere mit Nummer ab 2 und anonyme Schlüssel ohne Tier", () => {
    const participants: LiveRoomParticipant[] = [
      {
        studentName: "p1",
        animalToken: "Fuchs",
        animalNumber: 1,
        lastSeenAt: null,
      },
      {
        studentName: "p2",
        animalToken: "Fuchs",
        animalNumber: 2,
        lastSeenAt: null,
      },
    ] as LiveRoomParticipant[];
    expect(csvParticipantLabel("p1", participants)).toBe("Fuchs");
    expect(csvParticipantLabel("p2", participants)).toBe("Fuchs 2");
    expect(csvParticipantLabel("participant-9", participants)).toBe(
      "Ohne Tier",
    );
    expect(csvParticipantLabel("Mia", participants)).toBe("Mia");
  });
});
