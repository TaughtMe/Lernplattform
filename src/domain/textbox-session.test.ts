import { describe, expect, it } from "vitest";
import { TEXTBOX_TEXTS } from "./textbox-library";
import {
  TEXTBOX_BLANK_RATIOS,
  buildBlankingPlan,
  finalPercent,
  finishMemorize,
  memorizeSeconds,
  nextRound,
  repeatRound,
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

describe("repeatRound (Übungsversuch, erster Versuch zählt)", () => {
  function reviewed(round: 1 | 2 | 3 | 4, id = "run-repeat") {
    let state = startRun(text, id);
    for (let r = 1; r <= round; r += 1) {
      state = finishMemorize(state, 5000);
      state = submitRound(state, text, perfectInput(state), 8000);
      if (r < round) state = nextRound(state);
    }
    return state;
  }

  /** Eingabe, in der jede Lücke bzw. jedes Wort falsch ist. */
  function wrongInput(state: TextboxRunState): string[] | string {
    const input = perfectInput(state);
    return typeof input === "string" ? "xx yy zz" : input.map(() => "daneben");
  }

  function reviewedWrong(round: 1 | 2 | 3 | 4, id = "run-wrong") {
    let state = startRun(text, id);
    for (let r = 1; r <= round; r += 1) {
      state = finishMemorize(state, 5000);
      state = submitRound(state, text, wrongInput(state), 8000);
      if (r < round) state = nextRound(state);
    }
    return state;
  }

  it("behält in Durchgang 1 das Ergebnis des ersten Versuchs", () => {
    const state = repeatRound(reviewed(1));
    expect(state).toMatchObject({ round: 1, phase: "memorize", retry: true });
    expect(state.rounds.map((r) => r.round)).toEqual([1]);
    expect(state).not.toHaveProperty("memorizeMs");
  });

  it("behält in Durchgang 3 alle drei Ergebnisse", () => {
    const state = repeatRound(reviewed(3));
    expect(state.round).toBe(3);
    expect(state.phase).toBe("memorize");
    expect(state.rounds.map((r) => r.round)).toEqual([1, 2, 3]);
  });

  it("führt in Durchgang 4 vor „Ergebnis ansehen“ zurück zum Merken", () => {
    const state = repeatRound(reviewed(4));
    expect(state).toMatchObject({ round: 4, phase: "memorize", retry: true });
    expect(state.rounds.map((r) => r.round)).toEqual([1, 2, 3, 4]);
  });

  it("wirft außerhalb der Kontrolle", () => {
    const start = startRun(text, "run-repeat-phase");
    expect(() => repeatRound(start)).toThrow();
    expect(() => repeatRound(finishMemorize(start, 0))).toThrow();
  });

  it("wirft, wenn das letzte Ergebnis nicht zum Durchgang gehört", () => {
    const state = reviewed(2);
    expect(() => repeatRound({ ...state, round: 3 })).toThrow();
    expect(() => repeatRound({ ...state, rounds: [] })).toThrow();
  });

  it("erste Antwort falsch, Korrektur richtig: zählt als falsch", () => {
    const first = reviewedWrong(2);
    const firstRound = first.rounds[1]!;
    expect(firstRound.score.percent).toBe(0);
    const again = submitRound(
      finishMemorize(repeatRound(first), 1000),
      text,
      perfectInput(first),
      2000,
    );
    expect(again.phase).toBe("review");
    // Kein neuer Durchgang, der erste Versuch ist unverändert.
    expect(again.rounds).toHaveLength(2);
    expect(again.rounds[1]).toMatchObject({
      words: firstRound.words,
      score: firstRound.score,
      blanked: firstRound.blanked,
      memorizeMs: 5000,
      writingMs: 8000,
    });
    expect(again.rounds[1]!.score.percent).toBe(0);
    // Der Übungsversuch wird gespeichert, aber nicht gewertet.
    expect(again.rounds[1]!.retries).toHaveLength(1);
    expect(again.rounds[1]!.retries![0]).toMatchObject({
      memorizeMs: 1000,
      writingMs: 2000,
      score: { percent: 100 },
    });
  });

  it("erste Antwort richtig, schlechtere Wiederholung: zählt als richtig", () => {
    const first = reviewed(2);
    const again = submitRound(
      finishMemorize(repeatRound(first), 1000),
      text,
      wrongInput(first),
      2000,
    );
    expect(again.rounds[1]!.score.percent).toBe(100);
    expect(again.rounds[1]!.retries![0]!.score.percent).toBe(0);
  });

  it("Durchgang 4: Endergebnis und Fehlerwörter bleiben beim ersten Versuch", () => {
    const first = reviewedWrong(4);
    const percent = finalPercent(first);
    let state = submitRound(
      finishMemorize(repeatRound(first), 1),
      text,
      perfectInput(first),
      1,
    );
    expect(state.rounds[3]!.retries![0]!.score.percent).toBe(100);
    expect(finalPercent(state)).toBe(percent);
    expect(state.rounds[3]!.words).toEqual(first.rounds[3]!.words);
    state = nextRound(state);
    expect(state.phase).toBe("complete");
    expect(state).not.toHaveProperty("retry");
    expect(finalPercent(state)).toBe(percent);
    const session = sessionFromRun(state, text, {
      startedAt: "2026-10-08T08:00:00.000Z",
      now: "2026-10-08T08:10:00.000Z",
    });
    expect(session.finalPercent).toBe(percent);
    expect(textboxSessionSchema.parse(session)).toEqual(session);
  });

  it("hängt mehrere Übungsversuche an und behält die jüngsten fünf", () => {
    let state = reviewedWrong(1);
    for (let index = 0; index < 7; index += 1) {
      state = submitRound(
        finishMemorize(repeatRound(state), 1),
        text,
        perfectInput(state),
        index,
      );
    }
    const retries = state.rounds[0]!.retries!;
    expect(retries).toHaveLength(5);
    expect(retries.map((retry) => retry.writingMs)).toEqual([2, 3, 4, 5, 6]);
    expect(state.rounds[0]!.score.percent).toBe(0);
  });

  it("liefert nach erneutem Durchlauf dieselben Lücken", () => {
    const first = reviewed(2);
    const again = submitRound(
      finishMemorize(repeatRound(first), 1000),
      text,
      perfectInput(first),
      2000,
    );
    expect(again.rounds).toHaveLength(2);
    expect(again.rounds[1]!.blanked).toEqual(first.rounds[1]!.blanked);
    expect(again.rounds[1]!.retries![0]!.memorizeMs).toBe(1000);
  });

  it("speichert Übungsversuche in der Einheit und liest ältere Einheiten ohne sie", () => {
    const first = reviewedWrong(1, "run-store");
    const again = submitRound(
      finishMemorize(repeatRound(first), 1),
      text,
      perfectInput(first),
      1,
    );
    const session = sessionFromRun(again, text, {
      startedAt: "2026-10-08T08:00:00.000Z",
      now: "2026-10-08T08:10:00.000Z",
    });
    expect(textboxSessionSchema.parse(session)).toEqual(session);
    // Nach dem Fortsetzen beginnt der nächste Durchgang; die Versuche bleiben.
    const resumed = runFromSession(session);
    expect(resumed).toMatchObject({ round: 2, phase: "memorize" });
    expect(resumed).not.toHaveProperty("retry");
    expect(resumed.rounds[0]!.retries).toHaveLength(1);
    // Ältere Daten ohne `retries` bleiben lesbar.
    const legacy = sessionFromRun(first, text, {
      startedAt: "2026-10-08T08:00:00.000Z",
      now: "2026-10-08T08:10:00.000Z",
    });
    expect(legacy.rounds[0]).not.toHaveProperty("retries");
    expect(textboxSessionSchema.safeParse(legacy).success).toBe(true);
    // Mehr als fünf gespeicherte Versuche sind ungültig.
    const retry = session.rounds[0]!.retries![0]!;
    const tooMany = {
      ...session,
      rounds: [{ ...session.rounds[0]!, retries: Array(6).fill(retry) }],
    };
    expect(textboxSessionSchema.safeParse(tooMany).success).toBe(false);
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
