import { describe, expect, it } from "vitest";
import { TEXTBOX_TEXTS } from "./textbox-library";
import {
  TEXTBOX_BLANK_RATIOS,
  buildBlankingPlan,
  finalPercent,
  finishMemorize,
  memorizeSeconds,
  nextRound,
  runFromSession,
  sessionFromRun,
  startRun,
  submitRound,
  textboxSessionSchema,
  type TextboxRunState,
} from "./textbox-session";
import { tokenizeText } from "./text-compare";
import type { TextboxText } from "./textbox-text";

const text = TEXTBOX_TEXTS[0]!; // TXT-001
const words = tokenizeText(text.text)
  .filter((t) => t.kind === "word")
  .map((t) => t.text);

describe("buildBlankingPlan", () => {
  it("schachtelt die Mengen und erreicht die Anteile", () => {
    const plan = buildBlankingPlan(text, "seed");
    for (let i = 1; i < 4; i += 1) {
      for (const index of plan[i - 1]!) expect(plan[i]!.has(index)).toBe(true);
    }
    TEXTBOX_BLANK_RATIOS.forEach((ratio, i) => {
      expect(plan[i]!.size).toBeGreaterThanOrEqual(
        Math.min(words.length, Math.ceil(words.length * ratio)),
      );
    });
    expect(plan[3]!.size).toBe(words.length);
  });

  it("blendet in Durchgang 1 alle Zielwörter aus", () => {
    for (const entry of TEXTBOX_TEXTS) {
      const entryWords = tokenizeText(entry.text)
        .filter((t) => t.kind === "word")
        .map((t) => t.text);
      const plan = buildBlankingPlan(entry, "x");
      entryWords.forEach((word, index) => {
        if (entry.targetWords.includes(word)) {
          expect(plan[0].has(index)).toBe(true);
        }
      });
    }
  });

  it("ist bei gleichem Seed gleich und bei anderem anders", () => {
    const a = buildBlankingPlan(text, "a");
    expect([...buildBlankingPlan(text, "a")[1]!]).toEqual([...a[1]!]);
    const differing = ["b", "c", "d", "e", "f"].some(
      (seed) =>
        [...buildBlankingPlan(text, seed)[2]!].join() !== [...a[2]!].join(),
    );
    expect(differing).toBe(true);
  });

  it("nimmt Wörter aus dem Wortspeicher ohne Groß-/Kleinschreibung hinzu", () => {
    const plain = buildBlankingPlan(text, "s")[0];
    const extra = buildBlankingPlan(text, "s", ["WIESE", "unbekannt"])[0];
    const index = words.indexOf("Wiese");
    expect(plain.has(index)).toBe(false);
    expect(extra.has(index)).toBe(true);
  });

  it("füllt zuerst mit Schwerpunkt-Wörtern, dann mit langen Wörtern", () => {
    const custom: TextboxText = {
      ...text,
      text: "Der Ball und die Tasse sind im Garten bei Ute.",
      targetWords: ["Ball"],
      phenomena: ["doppelkonsonanten"],
    };
    // 9 Wörter → 20 % = 2: Ziel „Ball“ plus „Tasse“ (Sammlung Doppelkonsonanten).
    const first = [...buildBlankingPlan(custom, "q")[0]].sort();
    expect(first).toEqual([1, 4]);
    // 40 % = 4: danach lange Wörter („sind“, „Garten“) vor „und“, „die“, „im“.
    expect([...buildBlankingPlan(custom, "q")[1]].sort()).toEqual([1, 4, 5, 7]);
  });
});

describe("Merkzeit", () => {
  it("entspricht der Schwierigkeit", () => {
    expect(memorizeSeconds("leicht")).toBe(60);
    expect(memorizeSeconds("mittel")).toBe(90);
    expect(memorizeSeconds("schwer")).toBe(120);
  });
});

function perfectInput(state: TextboxRunState): string[] | string {
  if (state.round === 4) return text.text;
  const plan = buildBlankingPlan(text, state.seed, state.extraTargets);
  return [...plan[state.round - 1]!]
    .sort((a, b) => a - b)
    .map((i) => words[i]!);
}

describe("Zustandsautomat", () => {
  it("läuft vollständig durch alle vier Durchgänge", () => {
    let state = startRun(text, "run-1");
    expect(state).toMatchObject({ round: 1, phase: "memorize", seed: "run-1" });
    for (let round = 1; round <= 4; round += 1) {
      expect(state.round).toBe(round);
      state = finishMemorize(state, 5000);
      expect(state.phase).toBe("write");
      state = submitRound(state, text, perfectInput(state), 8000);
      expect(state.phase).toBe("review");
      expect(state.rounds).toHaveLength(round);
      expect(state.rounds[round - 1]).toMatchObject({
        round,
        memorizeMs: 5000,
        writingMs: 8000,
        score: { percent: 100 },
      });
      state = nextRound(state);
    }
    expect(state.phase).toBe("complete");
    expect(finalPercent(state)).toBe(100);
  });

  it("bewertet Lücken in Durchgang 1 und frei geschriebenen Text in Durchgang 4", () => {
    let state = finishMemorize(startRun(text, "run-2"), 0);
    const blanks = state.round === 1 ? (perfectInput(state) as string[]) : [];
    blanks[0] = "";
    state = nextRound(submitRound(state, text, blanks, 1));
    expect(state.rounds[0]!.score.byKind.fehlt).toBe(1);
    expect(state.rounds[0]!.score.percent).toBeLessThan(100);
    expect(finalPercent(state)).toBeUndefined();

    state = { ...state, round: 4, phase: "write" };
    const done = submitRound(state, text, "Im Garten wohnt ein Hund", 1);
    const last = done.rounds.at(-1)!;
    expect(last.round).toBe(4);
    expect(last.score.percent).toBeLessThan(30);
    expect(last.blanked).toHaveLength(words.length);
    expect(finalPercent(done)).toBe(last.score.percent);
  });

  it("zählt Satzzeichen in Durchgang 4 nur als Hinweis", () => {
    const state: TextboxRunState = {
      ...startRun(text, "run-3"),
      round: 4,
      phase: "write",
    };
    const result = submitRound(state, text, text.text.replace(/[.,]/g, ""), 1);
    expect(result.rounds[0]!.score.percent).toBe(100);
    expect(result.rounds[0]!.score.punctuationHints).toBeGreaterThan(0);
  });

  it("wirft bei ungültigen Übergängen", () => {
    const start = startRun(text, "run-4");
    expect(() => submitRound(start, text, [], 0)).toThrow();
    expect(() => nextRound(start)).toThrow();
    const writing = finishMemorize(start, 0);
    expect(() => finishMemorize(writing, 0)).toThrow();
    expect(() => nextRound(writing)).toThrow();
    expect(() => submitRound(writing, text, "frei", 0)).toThrow();
    expect(() => submitRound(writing, text, ["zu", "wenig"], 0)).toThrow();
    expect(() =>
      submitRound(
        writing,
        { ...text, id: "TXT-999" },
        perfectInput(writing),
        0,
      ),
    ).toThrow();
    const free = { ...writing, round: 4 as const };
    expect(() => submitRound(free, text, ["a"], 0)).toThrow();
    const reviewing = submitRound(writing, text, perfectInput(writing), 0);
    expect(() => finishMemorize(reviewing, 0)).toThrow();
    expect(() => submitRound(reviewing, text, [], 0)).toThrow();
  });

  it("merkt sich zusätzliche Zielwörter", () => {
    const state = startRun(text, "run-5", ["Wiese"]);
    expect(state.extraTargets).toEqual(["Wiese"]);
    expect(startRun(text, "run-6", []).extraTargets).toBeUndefined();
  });
});

describe("Speicherung der Einheit", () => {
  const times = {
    startedAt: "2026-10-08T08:00:00.000Z",
    now: "2026-10-08T08:10:00.000Z",
  };

  it("speichert laufend und setzt am nächsten Durchgang fort", () => {
    let state = finishMemorize(startRun(text, "run-7", ["Wiese"]), 1);
    state = submitRound(state, text, perfectInput(state), 1);
    const session = sessionFromRun(state, text, times);
    expect(textboxSessionSchema.parse(session)).toEqual(session);
    expect(session).toMatchObject({ status: "laufend", difficulty: "leicht" });
    expect(session.finalPercent).toBeUndefined();
    const resumed = runFromSession(session);
    expect(resumed).toMatchObject({
      round: 2,
      phase: "memorize",
      extraTargets: ["Wiese"],
    });
    expect(resumed.rounds).toHaveLength(1);
  });

  it("schließt nur in der Phase „complete“ ab", () => {
    let state = startRun(text, "run-8");
    for (let i = 0; i < 4; i += 1) {
      state = finishMemorize(state, 1);
      state = submitRound(state, text, perfectInput(state), 1);
      if (i < 3) state = nextRound(state);
    }
    const open = sessionFromRun(state, text, times);
    expect(open.status).toBe("laufend");
    expect(runFromSession(open)).toMatchObject({ round: 4, phase: "review" });
    const done = sessionFromRun(nextRound(state), text, times);
    expect(done).toMatchObject({
      status: "abgeschlossen",
      finalPercent: 100,
      completedAt: times.now,
    });
    expect(textboxSessionSchema.parse(done)).toEqual(done);
    expect(runFromSession(done).phase).toBe("complete");
  });

  it("verweigert das Speichern ohne Durchgang", () => {
    expect(() => sessionFromRun(startRun(text, "x"), text, times)).toThrow();
  });
});

describe("textboxSessionSchema", () => {
  const base = {
    id: "a",
    textId: "TXT-001",
    difficulty: "leicht",
    status: "laufend",
    seed: "a",
    startedAt: "2026-10-08T08:00:00.000Z",
    updatedAt: "2026-10-08T08:00:00.000Z",
    rounds: [],
  };
  it("prüft Status und Endergebnis zusammen", () => {
    expect(textboxSessionSchema.safeParse(base).success).toBe(true);
    expect(
      textboxSessionSchema.safeParse({ ...base, status: "abgeschlossen" })
        .success,
    ).toBe(false);
    expect(
      textboxSessionSchema.safeParse({ ...base, finalPercent: 50 }).success,
    ).toBe(false);
    expect(textboxSessionSchema.safeParse({ ...base, extra: 1 }).success).toBe(
      false,
    );
  });
});
