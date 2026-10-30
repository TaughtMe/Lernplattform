import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CompetenceEntry } from "../../../src/domain/competence-profile";
import { competenceExplanation, profileGroups } from "./profile-copy";
import { ProfileScreen } from "./profile-screen";

function entry(input: Partial<CompetenceEntry> = {}): CompetenceEntry {
  return {
    id: "wortbox:ck-tz",
    kind: "wortbox",
    module: "german",
    label: "ck und tz",
    route: "/frei/german/lernwoerter?sammlung=ck-tz",
    level: "im-aufbau",
    reason: { code: "building", missing: ["share"] },
    objects: 100,
    started: 30,
    safe: 20,
    needed: 80,
    open: 2,
    cleanDays: 3,
    ...input,
  };
}

const FORBIDDEN = [/fällig/i, /leitner/i, /durchgang/i, /merkstufe/i, /%/];

describe("Kompetenzprofil: Texte", () => {
  it("erklärt jeden Grund in einem kurzen Satz", () => {
    expect(
      competenceExplanation(
        entry({ level: "neu", reason: { code: "no-answers" } }),
      ),
    ).toBe("Hier hast du noch nichts geübt.");
    expect(competenceExplanation(entry())).toBe(
      "20 von 100 Wörtern sind sicher. Für „sicher“ brauchst du 80.",
    );
    expect(
      competenceExplanation(
        entry({ kind: "vokabelstapel", objects: 10, safe: 3, needed: 8 }),
      ),
    ).toBe("3 von 10 Karten sind sicher. Für „sicher“ brauchst du 8.");
    expect(
      competenceExplanation(
        entry({ level: "sicher", reason: { code: "safe" } }),
      ),
    ).toMatch(/sitzt/);
    expect(
      competenceExplanation(
        entry({
          kind: "rechenart",
          reason: { code: "building", missing: ["box", "days"] },
        }),
      ),
    ).toBe(
      "Ein Fehler wartet noch auf eine Wiederholung. Übe auch an einem anderen Tag.",
    );
    expect(
      competenceExplanation(
        entry({
          kind: "tastenwelt",
          reason: { code: "no-recall-box" },
        }),
      ),
    ).toMatch(/Mehr messen wir hier noch nicht/);
  });

  it("weist bei Vokabeln das Schreiben getrennt vom Wissen aus", () => {
    const deck = (writing: { practiced: number }, safe = false) =>
      competenceExplanation(
        entry({
          kind: "vokabelstapel",
          objects: 10,
          safe: safe ? 10 : 3,
          needed: 8,
          writing,
          ...(safe ? { level: "sicher", reason: { code: "safe" } } : {}),
        }),
      );
    // Ein Stapel kann „sicher“ sein, auch wenn nie geschrieben wurde.
    expect(deck({ practiced: 0 }, true)).toBe(
      "Das sitzt. Du hast die Karten an mehreren Tagen richtig gewusst. Schreiben hast du hier noch nicht geübt.",
    );
    expect(deck({ practiced: 4 }, true)).toMatch(
      /Geschrieben hast du 4 von 10 Karten\.$/,
    );
    expect(deck({ practiced: 10 }, true)).toBe(
      "Das sitzt. Du hast die Karten an mehreren Tagen richtig gewusst.",
    );
    expect(deck({ practiced: 0 })).toBe(
      "3 von 10 Karten sind sicher. Für „sicher“ brauchst du 8. Schreiben hast du hier noch nicht geübt.",
    );
    for (const text of [deck({ practiced: 0 }, true), deck({ practiced: 4 })]) {
      for (const word of FORBIDDEN) expect(text).not.toMatch(word);
    }
  });

  it("ordnet die Gruppen fest und lässt leere weg", () => {
    const groups = profileGroups([
      entry({
        id: "t",
        module: "typing",
        kind: "tastenwelt",
        label: "Tastenwelt",
      }),
      entry({
        id: "m",
        module: "mathematics",
        kind: "rechenart",
        label: "Plus bis 20",
      }),
      entry({ id: "w" }),
    ]);
    expect(groups.map((group) => group.title)).toEqual([
      "Rechtschreibung",
      "Kopfrechnen",
      "Tastenwelt",
    ]);
  });
});

describe("ProfileScreen", () => {
  const groups = profileGroups([
    entry(),
    entry({
      id: "wortbox:long-i",
      label: "Langes i",
      level: "sicher",
      reason: { code: "safe" },
    }),
    entry({
      id: "wortbox:silent-h",
      label: "Dehnungs-h",
      level: "neu",
      reason: { code: "no-answers" },
    }),
  ]);

  it("zeigt je Teilbereich Stand, Satz und Link zum Üben", () => {
    render(<ProfileScreen status="ready" groups={groups} />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Mein Lernstand" }),
    ).toBeInTheDocument();
    const section = screen.getByRole("region", { name: "Rechtschreibung" });
    const rows = within(section).getAllByRole("listitem");
    expect(rows).toHaveLength(3);
    expect(within(rows[0]!).getByText("im Aufbau")).toBeInTheDocument();
    expect(within(rows[1]!).getByText("sicher")).toBeInTheDocument();
    expect(within(rows[2]!).getByText("neu")).toBeInTheDocument();
    expect(
      within(rows[0]!).getByRole("link", { name: "Üben ck und tz" }),
    ).toHaveAttribute("href", "/frei/german/lernwoerter?sammlung=ck-tz");
  });

  it("nennt keine Prozentzahl und keine Fachwörter", () => {
    render(<ProfileScreen status="ready" groups={groups} />);
    for (const word of FORBIDDEN) {
      expect(document.body).not.toHaveTextContent(word);
    }
  });

  it("zeigt Laden, Fehler und leeren Stand", () => {
    const { rerender } = render(<ProfileScreen status="loading" groups={[]} />);
    expect(screen.getByRole("status")).toHaveTextContent("wird geladen");
    rerender(<ProfileScreen status="error" groups={[]} />);
    expect(screen.getByRole("status")).toHaveTextContent("nicht verfügbar");
    rerender(<ProfileScreen status="ready" groups={[]} />);
    expect(
      screen.getByText("Hier ist noch nichts zu sehen"),
    ).toBeInTheDocument();
  });
});
