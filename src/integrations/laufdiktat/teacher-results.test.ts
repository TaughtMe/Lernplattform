import { describe, expect, it } from "vitest";
import type { LiveRoomParticipant, LiveRoomStudent } from "./room-api";
import {
  aggregateWordErrors,
  buildTeacherResultCsv,
  csvParticipantLabel,
  escapeCsv,
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

describe("escapeCsv (CSV-Injection, OWASP)", () => {
  it.each(["=1+1", "+49 170", "-2+3", "@SUM(1;2)", "\tText", "\rText"])(
    "stellt einem Formelpräfix in %j ein Hochkomma voran",
    (value) => {
      const cell = escapeCsv(value);
      const raw = cell.startsWith('"') ? cell.slice(1, -1) : cell;
      expect(raw.startsWith("'")).toBe(true);
      expect(raw.slice(1)).toBe(value);
    },
  );

  it("quotet zusätzlich Trenner, Anführungszeichen und Zeilenumbrüche", () => {
    expect(escapeCsv('=HYPERLINK("https://example.invalid/";"Hilfe")')).toBe(
      '"\'=HYPERLINK(""https://example.invalid/"";""Hilfe"")"',
    );
    expect(escapeCsv("a;b")).toBe('"a;b"');
    expect(escapeCsv("a\nb")).toBe('"a\nb"');
    expect(escapeCsv("a\rb")).toBe('"a\rb"');
    expect(escapeCsv('sag "hallo"')).toBe('"sag ""hallo"""');
  });

  it("lässt gewöhnliche Zellen, Zahlen und leere Werte unverändert", () => {
    expect(escapeCsv("Fuchs 2")).toBe("Fuchs 2");
    expect(escapeCsv("a-b")).toBe("a-b");
    expect(escapeCsv("a=b")).toBe("a=b");
    expect(escapeCsv(42)).toBe("42");
    expect(escapeCsv(null)).toBe("");
    expect(escapeCsv(undefined)).toBe("");
  });

  it("entschärft Namen und Fehlerwörter in der fertigen Datei", () => {
    const evil: LiveRoomStudent[] = [
      { ...students[0]!, studentName: "=cmd", wordErrors: { "@SUM(1;2)": 2 } },
    ];
    const csv = buildTeacherResultCsv(["=cmd"], evil, 3);
    expect(csv).toContain("'=cmd;Fertig;");
    expect(csv).toContain('"\'@SUM(1;2)";2');
    expect(csv.split("\n").every((line) => !/^[=+\-@]/.test(line))).toBe(true);
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
