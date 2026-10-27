import { describe, expect, it } from "vitest";
import type { LiveWord } from "./live-session";
import type { LiveRoomParticipant, LiveRoomStudent } from "./room-api";
import {
  aggregateWordErrors,
  buildTeacherResultCsv,
  csvParticipantLabel,
  escapeCsv,
  mathTasksByErrorKey,
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

describe("Fehlerart (Vermutung) im CSV-Export", () => {
  const words = [
    { id: "m1", kind: "math", prompt: "7 · 8 = _", targetWord: "56" },
    { id: "m2", prompt: "12 + 9 = _", targetWord: "21" },
    { id: "m3", kind: "math", prompt: "-3 + 5 = _", targetWord: "2" },
    { id: "m4", kind: "math", prompt: "6 + 6 = _", targetWord: "zwölf" },
    { id: "v1", kind: "vocabulary", prompt: "Haus", targetWord: "house" },
    { id: "t1", targetWord: "Schule" },
  ] as LiveWord[];
  const mathStudent = (
    overrides: Partial<LiveRoomStudent> = {},
  ): LiveRoomStudent => ({
    ...students[0]!,
    studentName: "p1",
    wordErrors: { "7 · 8 = _": 2, "12 + 9 = _": 1, Haus: 1 },
    firstWrongAnswers: { "7 · 8 = _": "65", "12 + 9 = _": "210" },
    ...overrides,
  });
  const header = "Name;Aufgabe;Fehlversuche;Fehlerart (Vermutung)";

  it("übersetzt Aufgabentexte zurück in Aufgaben, nicht lesbare Lösungen fehlen", () => {
    const tasks = mathTasksByErrorKey(words);
    expect([...tasks.keys()]).toEqual([
      "7 · 8 = _",
      "12 + 9 = _",
      "-3 + 5 = _",
    ]);
    expect(tasks.get("7 · 8 = _")).toMatchObject({
      operation: "multiply",
      answer: 56,
    });
  });

  it("hängt je Kind und Aufgabe eine Zeile mit der Fehlerart an", () => {
    const csv = buildTeacherResultCsv(
      ["p1"],
      [mathStudent()],
      6,
      () => "Fuchs",
      words,
    );
    expect(csv).toContain(
      `\n\n${header}\nFuchs;7 · 8 = _;2;Zahlendreher\nFuchs;12 + 9 = _;1;Stellenwert`,
    );
    // Vokabeln und Text bekommen keine Zeile in diesem Abschnitt.
    expect(csv).not.toContain("Fuchs;Haus");
  });

  it("lässt die Fehlerart leer bei unbekannter, fehlender oder unlesbarer Antwort", () => {
    const csv = buildTeacherResultCsv(
      ["p1"],
      [
        mathStudent({
          wordErrors: { "7 · 8 = _": 1, "12 + 9 = _": 1, "-3 + 5 = _": 1 },
          firstWrongAnswers: { "7 · 8 = _": "31", "-3 + 5 = _": "abc" },
        }),
      ],
      6,
      () => "Fuchs",
      words,
    );
    expect(csv).toContain("Fuchs;7 · 8 = _;1;\n");
    expect(csv).toContain("Fuchs;12 + 9 = _;1;\n");
    expect(csv).toMatch(/Fuchs;'-3 \+ 5 = _;1;$/);
  });

  it("entschärft Formelpräfixe in der Aufgabe auch im neuen Abschnitt", () => {
    const csv = buildTeacherResultCsv(
      ["p1"],
      [
        mathStudent({
          wordErrors: { "-3 + 5 = _": 1 },
          firstWrongAnswers: { "-3 + 5 = _": "-2" },
        }),
      ],
      6,
      () => "=HYPERLINK(x)",
      words,
    );
    expect(csv).toContain("'=HYPERLINK(x);'-3 + 5 = _;1;Vorzeichen");
    expect(csv).not.toMatch(/(^|\n)[=+\-@]/);
  });

  it("schreibt ohne Mathe-Fehler oder ohne Aufgaben keinen Abschnitt", () => {
    expect(
      buildTeacherResultCsv(["Mia", "Noah"], students, 3, undefined, words),
    ).not.toContain(header);
    expect(
      buildTeacherResultCsv(["p1"], [mathStudent()], 6, undefined),
    ).not.toContain(header);
  });

  it("lässt Kinder älterer Clients ohne erste Antwort mit leerer Fehlerart", () => {
    const legacy = mathStudent();
    delete legacy.firstWrongAnswers;
    const csv = buildTeacherResultCsv(["p1"], [legacy], 6, () => "Hase", words);
    expect(csv).toContain("Hase;7 · 8 = _;2;\n");
  });
});
