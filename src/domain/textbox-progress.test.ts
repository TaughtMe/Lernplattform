import { describe, expect, it } from "vitest";
import { TEXTBOX_TEXTS } from "./textbox-library";
import {
  phenomenonErrorStats,
  rankTextsForWords,
  reflectionQuestions,
  summarizeTextboxOverall,
  summarizeTextboxProgress,
} from "./textbox-progress";
import type { TextboxRoundResult, TextboxSession } from "./textbox-session";

function round4(percent: number, errors = 0): TextboxRoundResult {
  return {
    round: 4,
    blanked: [],
    words: [],
    score: {
      percent,
      correct: 10 - errors,
      total: 10,
      extra: 0,
      byKind: {
        richtig: 10 - errors,
        falsch: errors,
        "gross-klein": 0,
        fehlt: 0,
        zusaetzlich: 0,
      },
      punctuationHints: 0,
    },
    memorizeMs: 0,
    writingMs: 0,
  };
}

function session(
  id: string,
  textId: string,
  percent: number | undefined,
  day: number,
  errors = 0,
): TextboxSession {
  const at = `2026-10-${String(day).padStart(2, "0")}T08:00:00.000Z`;
  return {
    id,
    textId,
    difficulty: "leicht",
    status: percent === undefined ? "laufend" : "abgeschlossen",
    seed: id,
    startedAt: at,
    updatedAt: at,
    ...(percent === undefined
      ? {}
      : { completedAt: at, finalPercent: percent }),
    rounds: percent === undefined ? [] : [round4(percent, errors)],
  };
}

describe("summarizeTextboxProgress", () => {
  it("behält den Bestwert bei schlechterem neuen Ergebnis", () => {
    const summary = summarizeTextboxProgress([
      session("b", "TXT-001", 60, 2),
      session("a", "TXT-001", 90, 1),
    ]).get("TXT-001")!;
    expect(summary).toMatchObject({
      sessions: 2,
      bestPercent: 90,
      lastPercent: 60,
      lastPracticedAt: "2026-10-02T08:00:00.000Z",
    });
    expect(summary.history.map((h) => h.trainingId)).toEqual(["a", "b"]);
    expect(summary.history[0]!.rounds).toEqual([90]);
  });

  it("zählt laufende Einheiten nicht", () => {
    const map = summarizeTextboxProgress([
      session("a", "TXT-001", undefined, 1),
      session("b", "TXT-002", 50, 1),
    ]);
    expect(map.has("TXT-001")).toBe(false);
    expect(map.get("TXT-002")?.sessions).toBe(1);
  });
});

describe("summarizeTextboxOverall", () => {
  it("verteilt nach Schwierigkeit und Schwerpunkt", () => {
    const overall = summarizeTextboxOverall(
      [
        session("a", "TXT-001", 80, 1),
        session("b", "TXT-001", 90, 2),
        session("c", "TXT-006", 70, 3),
        session("d", "TXT-002", undefined, 3),
        session("e", "TXT-404", 70, 3),
      ],
      [...TEXTBOX_TEXTS],
    );
    expect(overall).toEqual({
      completedTexts: 2,
      sessions: 3,
      byDifficulty: { leicht: 2, mittel: 1, schwer: 0 },
      byPhenomenon: { doppelkonsonanten: 3 },
    });
  });
});

describe("rankTextsForWords", () => {
  const texts = [...TEXTBOX_TEXTS];
  it("sortiert nach Treffern ohne Groß-/Kleinschreibung", () => {
    const ranked = rankTextsForWords(["ball", "RENNT", "Wiese", "xyz"], texts);
    expect(ranked[0]!.text.id).toBe("TXT-001");
    expect(ranked[0]!.matches).toEqual(["ball", "RENNT", "Wiese"]);
    expect(ranked.every((entry) => entry.matches.length > 0)).toBe(true);
  });

  it("entscheidet Gleichstand über Schwerpunkt, dann Schwierigkeit", () => {
    // „Fenster“ steht in TXT-008, TXT-010 (mittel) und TXT-011 (schwer).
    const plain = rankTextsForWords(["Fenster"], texts);
    expect(plain.slice(0, 3).map((r) => r.text.id)).toEqual([
      "TXT-008",
      "TXT-010",
      "TXT-011",
    ]);
    // Bei gleicher Trefferzahl gewinnt die niedrigere Schwierigkeit, nicht die Id.
    const hard = { ...texts[0]!, id: "TXT-101", difficulty: "schwer" as const };
    const easy = { ...texts[0]!, id: "TXT-102", difficulty: "leicht" as const };
    expect(
      rankTextsForWords(["Ball"], [hard, easy]).map((r) => r.text.id),
    ).toEqual(["TXT-102", "TXT-101"]);
    // Mit passender Sammlung gewinnt der Text mit passendem Schwerpunkt.
    const byFocus = rankTextsForWords(
      ["Fenster", "Ball"],
      texts,
      "double-consonants",
    );
    const tie = rankTextsForWords(["Ball"], texts, "double-consonants");
    expect(byFocus.length).toBeGreaterThan(0);
    expect(tie[0]!.text.phenomena).toContain("doppelkonsonanten");
    const lowerFirst = rankTextsForWords(["Hase"], texts, "long-i");
    expect(lowerFirst[0]!.text.id).toBe("TXT-005");
  });

  it("liefert nichts ohne Treffer und ignoriert Texte ohne Wortspeicher-Nutzung", () => {
    expect(rankTextsForWords(["gibtesnicht"], texts)).toEqual([]);
    expect(rankTextsForWords([], texts)).toEqual([]);
    const onlyFree = texts.map((t) => ({ ...t, usage: ["frei" as const] }));
    expect(rankTextsForWords(["Ball"], onlyFree)).toEqual([]);
  });

  it("bevorzugt bei Gleichstand den passenden Schwerpunkt", () => {
    const a = { ...texts[0]!, id: "TXT-101", phenomena: ["ie" as const] };
    const b = {
      ...texts[0]!,
      id: "TXT-102",
      phenomena: ["doppelkonsonanten" as const],
    };
    const ranked = rankTextsForWords(["Ball"], [a, b], "double-consonants");
    expect(ranked.map((r) => r.text.id)).toEqual(["TXT-102", "TXT-101"]);
    expect(rankTextsForWords(["Ball"], [b, a]).map((r) => r.text.id)).toEqual([
      "TXT-101",
      "TXT-102",
    ]);
  });
});

describe("phenomenonErrorStats", () => {
  it("summiert Fehler aus Durchgang 4 je Schwerpunkt", () => {
    const stats = phenomenonErrorStats(
      [
        session("a", "TXT-001", 80, 1, 2),
        session("b", "TXT-002", 90, 1, 1),
        session("c", "TXT-001", undefined, 2),
        session("d", "TXT-404", 90, 2, 5),
      ],
      [...TEXTBOX_TEXTS],
    );
    expect(stats).toEqual([
      { phenomenon: "doppelkonsonanten", errors: 2, words: 10 },
      { phenomenon: "dehnungs-h", errors: 1, words: 10 },
    ]);
  });
});

describe("reflectionQuestions", () => {
  it("fragt erst ab zwei Einheiten", () => {
    const one = summarizeTextboxProgress([session("a", "TXT-001", 70, 1)]).get(
      "TXT-001",
    )!;
    expect(reflectionQuestions(one)).toEqual([]);
  });

  it("stellt ab zwei Einheiten die Fragen aus dem Konzept", () => {
    const two = summarizeTextboxProgress([
      session("a", "TXT-001", 50, 1),
      session("b", "TXT-001", 80, 2),
    ]).get("TXT-001")!;
    expect(reflectionQuestions(two)).toEqual([
      "Bei welcher Übung war dein Ergebnis am besten?",
      "Wie stark hast du dich verbessert?",
      "Ist dein Ergebnis bei jeder Übung gestiegen?",
      "Was fällt dir an deinem Diagramm auf?",
    ]);
  });
});
