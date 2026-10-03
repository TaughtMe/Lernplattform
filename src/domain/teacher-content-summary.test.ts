import { describe, expect, it } from "vitest";
import {
  teacherContentPackageSchema,
  type TeacherContentPackage,
} from "./teacher-content-library";
import {
  activeClassIdsOf,
  contentKindOf,
  describeContent,
  filterByClass,
  isUnassigned,
  shortDate,
  sortForLibrary,
  suggestTitle,
  UNASSIGNED,
} from "./teacher-content-summary";

const CLASS_A = "123e4567-e89b-42d3-a456-426614174001";
const CLASS_B = "123e4567-e89b-42d3-a456-426614174002";
const ARCHIVED = "123e4567-e89b-42d3-a456-426614174003";

const base: TeacherContentPackage = {
  id: "p1",
  revision: 1,
  title: "Present Perfect",
  source: "go;gehen\nsee;sehen",
  promptLocale: "en",
  answerLocale: "de",
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-02T10:00:00.000Z",
};

describe("Inhaltsart und Schema", () => {
  it("liest ein Altpaket ohne Art als Vokabeln", () => {
    expect(contentKindOf(teacherContentPackageSchema.parse(base))).toBe(
      "vocabulary",
    );
    expect(contentKindOf({ kind: "math" })).toBe("math");
  });

  it("weist ungültige Klassen-IDs, eine fremde Art und zu viele Klassen ab", () => {
    expect(() =>
      teacherContentPackageSchema.parse({ ...base, classIds: ["keine-id"] }),
    ).toThrow();
    expect(() =>
      teacherContentPackageSchema.parse({ ...base, kind: "bild" }),
    ).toThrow();
    expect(() =>
      teacherContentPackageSchema.parse({
        ...base,
        classIds: Array.from(
          { length: 51 },
          (_, i) => `123e4567-e89b-42d3-a456-${String(i).padStart(12, "0")}`,
        ),
      }),
    ).toThrow();
    expect(() =>
      teacherContentPackageSchema.parse({ ...base, textSplit: "absatz" }),
    ).toThrow();
  });
});

describe("Metazeile", () => {
  it("zählt Vokabeln mit Sprache", () => {
    expect(describeContent(base)).toBe("2 Vokabeln · Englisch");
    expect(describeContent({ ...base, source: "go;gehen" })).toBe(
      "1 Vokabel · Englisch",
    );
    expect(describeContent({ ...base, promptLocale: "fr-FR" })).toBe(
      "2 Vokabeln · Französisch",
    );
  });

  it("zählt Abschnitte und Wörter eines Textes je Zerlegung", () => {
    const text = {
      ...base,
      kind: "text" as const,
      source: "Eins zwei. Drei vier fünf.",
    };
    expect(describeContent(text)).toBe("2 Abschnitte · 5 Wörter");
    expect(describeContent({ ...text, textSplit: "wort" })).toBe(
      "5 Abschnitte · 5 Wörter",
    );
    expect(describeContent({ ...text, textSplit: "zeile" })).toBe(
      "1 Abschnitt · 5 Wörter",
    );
  });

  it("zählt Mathe-Aufgaben je Zeile", () => {
    expect(
      describeContent({ ...base, kind: "math", source: "1+1\n\n2+2\n3+3\n" }),
    ).toBe("3 Aufgaben");
  });
});

describe("Titelvorschlag", () => {
  it("nimmt die erste nichtleere Zeile und kürzt auf 60 Zeichen", () => {
    expect(suggestTitle("\n  Der Schulweg  \nzweite")).toBe("Der Schulweg");
    expect(suggestTitle("")).toBe("");
    const long = suggestTitle("a".repeat(100));
    expect(long).toHaveLength(60);
    expect(long.endsWith("…")).toBe(true);
    expect(suggestTitle("b".repeat(60))).toBe("b".repeat(60));
  });
});

describe("Klassenfilter", () => {
  const active = new Set([CLASS_A, CLASS_B]);
  const both = { ...base, id: "both", classIds: [CLASS_A, CLASS_B] };
  const onlyA = { ...base, id: "a", classIds: [CLASS_A] };
  const none = { ...base, id: "none" };
  const empty = { ...base, id: "empty", classIds: [] };
  const archivedOnly = { ...base, id: "archived", classIds: [ARCHIVED] };
  const all = [both, onlyA, none, empty, archivedOnly];

  it("zeigt einen Inhalt mit zwei Klassen in beiden", () => {
    expect(filterByClass(all, CLASS_A, active).map((e) => e.id)).toEqual([
      "both",
      "a",
    ]);
    expect(filterByClass(all, CLASS_B, active).map((e) => e.id)).toEqual([
      "both",
    ]);
  });

  it("zeigt ohne Klasse und mit nur archivierten Klassen unter „Nicht zugeordnet“", () => {
    expect(filterByClass(all, UNASSIGNED, active).map((e) => e.id)).toEqual([
      "none",
      "empty",
      "archived",
    ]);
    expect(isUnassigned(archivedOnly, active)).toBe(true);
    expect(activeClassIdsOf(both, new Set([CLASS_A]))).toEqual([CLASS_A]);
  });
});

describe("Sortierung und Datum", () => {
  it("sortiert nach letzter Nutzung, sonst Änderung, neueste zuerst", () => {
    const old = { ...base, id: "old", updatedAt: "2026-08-01T10:00:00.000Z" };
    const edited = {
      ...base,
      id: "edited",
      updatedAt: "2026-09-05T10:00:00.000Z",
    };
    const used = {
      ...base,
      id: "used",
      updatedAt: "2026-07-01T10:00:00.000Z",
      lastUsedAt: "2026-09-10T10:00:00.000Z",
    };
    expect(sortForLibrary([old, edited, used]).map((e) => e.id)).toEqual([
      "used",
      "edited",
      "old",
    ]);
  });

  it("zeigt das Datum der letzten Nutzung als Tag.Monat.", () => {
    expect(
      shortDate(
        {
          updatedAt: "2026-09-02T10:00:00.000Z",
          lastUsedAt: "2026-09-14T10:00:00.000Z",
        },
        "Europe/Berlin",
      ),
    ).toBe("14.09.");
    expect(
      shortDate({ updatedAt: "2026-09-02T10:00:00.000Z" }, "Europe/Berlin"),
    ).toBe("02.09.");
  });
});
