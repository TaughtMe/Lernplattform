import { describe, expect, it } from "vitest";
import type { CompetenceEntry } from "./competence-profile";
import { mathProgressRows } from "./math-progress";

function entry(over: Partial<CompetenceEntry>): CompetenceEntry {
  return {
    id: "rechenart:add:normal:bis-20",
    kind: "rechenart",
    module: "mathematics",
    label: "Plus bis 20",
    route: "/frei/mathematics",
    level: "im-aufbau",
    reason: { code: "building", missing: ["days"] },
    objects: 9,
    started: 9,
    safe: 4,
    needed: 5,
    open: 2,
    cleanDays: 1,
    ...over,
  };
}

describe("mathProgressRows", () => {
  it("zählt nach oben und nennt keine offenen oder falschen Aufgaben", () => {
    const [row] = mathProgressRows([entry({})]);
    expect(row).toEqual({
      id: "rechenart:add:normal:bis-20",
      label: "Plus bis 20",
      level: "im-aufbau",
      solved: "4 Aufgaben richtig gerechnet",
      days: "an 1 Tag ohne Hilfe richtig",
      practiceHref: "/frei/mathematics",
    });
    expect(JSON.stringify(row)).not.toMatch(/%|offen|falsch|von \d/);
  });

  it("ignoriert Bereiche außer Kopfrechnen und sortiert nach Richtigem", () => {
    const rows = mathProgressRows([
      entry({ id: "a", label: "Minus bis 20", safe: 1, cleanDays: 0 }),
      entry({ id: "b", label: "Mal: Reihe 7", safe: 12, cleanDays: 3 }),
      entry({ id: "c", kind: "wortbox", label: "Wörter" }),
    ]);
    expect(rows.map((row) => row.id)).toEqual(["b", "a"]);
    expect(rows[0]?.solved).toBe("12 Aufgaben richtig gerechnet");
    expect(rows[0]?.days).toBe("an 3 Tagen ohne Hilfe richtig");
    expect(rows[1]?.solved).toBe("1 Aufgabe richtig gerechnet");
    expect(rows[1]?.days).toBe("");
  });

  it("sagt ohne richtige Aufgabe nur, dass das Kind angefangen hat", () => {
    const [row] = mathProgressRows([entry({ safe: 0, cleanDays: 0 })]);
    expect(row?.solved).toBe("Du hast hier angefangen.");
  });
});
