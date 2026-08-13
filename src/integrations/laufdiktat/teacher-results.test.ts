import { describe, expect, it } from "vitest";
import type { LiveRoomStudent } from "./room-api";
import { aggregateWordErrors, buildTeacherResultCsv } from "./teacher-results";

const students: LiveRoomStudent[] = [
  {
    studentName: "Mia",
    stationNumber: null,
    appVersion: "lernraum-0.1.0",
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
    appVersion: "lernraum-0.1.0",
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
});
