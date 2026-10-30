import { describe, expect, it } from "vitest";
import {
  buildCompetenceProfile,
  competenceWeakness,
  mathFamilyLabel,
  type CompetenceEntry,
  type CompetenceSources,
  type CompetenceWordBox,
} from "./competence-profile";
import { learningWordId } from "./learning-word-progress";
import {
  card,
  learningEvent,
  mathEvent,
  noon,
  wordProgress,
} from "./testing/diagnostics-fixtures";

const NOW = Date.parse(noon(25));
const FIVE = ["Hund", "Wald", "Bild", "Kind", "Wind"];
const BOX: CompetenceWordBox = {
  id: "final-devoicing",
  kind: "fest",
  title: "Auslautverhärtung",
  words: FIVE,
};

function sources(input: Partial<CompetenceSources> = {}): CompetenceSources {
  return {
    now: NOW,
    events: [],
    cards: [],
    decks: [],
    words: [],
    wordBoxes: [BOX],
    ...input,
  };
}

function entryOf(
  profile: ReturnType<typeof buildCompetenceProfile>,
  id: string,
): CompetenceEntry {
  const entry = profile.entries.find((candidate) => candidate.id === id);
  if (!entry) throw new Error(`Teilbereich ${id} fehlt`);
  return entry;
}

/** Abruf ohne Hilfe an zwei Tagen für jedes Wort. */
function recallOnTwoDays(words: readonly string[]) {
  return words.flatMap((word) => [
    learningEvent({
      learningObjectId: learningWordId(word),
      occurredAt: noon(20),
    }),
    learningEvent({
      learningObjectId: learningWordId(word),
      occurredAt: noon(22),
    }),
  ]);
}

describe("Kompetenzprofil: Wortboxen", () => {
  it("nennt einen Teilbereich ohne Antworten „neu“", () => {
    const entry = entryOf(
      buildCompetenceProfile(sources()),
      "wortbox:final-devoicing",
    );
    expect(entry).toMatchObject({
      level: "neu",
      reason: { code: "no-answers" },
      objects: 5,
      started: 0,
      safe: 0,
    });
  });

  it("nennt einen begonnenen Teilbereich „im Aufbau“", () => {
    const entry = entryOf(
      buildCompetenceProfile(
        sources({
          events: [
            learningEvent({
              learningObjectId: learningWordId("Hund"),
              correct: false,
            }),
          ],
          words: [wordProgress("Hund", 1)],
        }),
      ),
      "wortbox:final-devoicing",
    );
    expect(entry).toMatchObject({
      level: "im-aufbau",
      reason: { code: "building", missing: ["share"] },
      started: 1,
      open: 1,
      safe: 0,
    });
  });

  it("nennt ihn „sicher“, wenn alle Wörter Box 3 haben und an zwei Tagen ohne Hilfe stimmen", () => {
    const profile = buildCompetenceProfile(
      sources({
        events: recallOnTwoDays(FIVE),
        words: FIVE.map((word) => wordProgress(word, 3)),
      }),
    );
    expect(entryOf(profile, "wortbox:final-devoicing")).toMatchObject({
      level: "sicher",
      reason: { code: "safe" },
      safe: 5,
      needed: 5,
      cleanDays: 2,
    });
  });

  it("verlangt bei großen Wortboxen 80 Prozent der Wörter", () => {
    const words = Array.from({ length: 20 }, (_, index) => `Wort${index}`);
    const big: CompetenceWordBox = { ...BOX, words };
    const make = (count: number) =>
      buildCompetenceProfile(
        sources({
          wordBoxes: [big],
          events: recallOnTwoDays(words.slice(0, count)),
          words: words.slice(0, count).map((word) => wordProgress(word, 4)),
        }),
      ).entries[0]!;
    expect(make(15)).toMatchObject({ level: "im-aufbau", needed: 16 });
    expect(make(16)).toMatchObject({ level: "sicher", needed: 16 });
  });

  it("zählt Box 2 nicht, auch nicht bei Abruf an zwei Tagen", () => {
    const profile = buildCompetenceProfile(
      sources({
        events: recallOnTwoDays(FIVE),
        words: FIVE.map((word) => wordProgress(word, 2)),
      }),
    );
    expect(entryOf(profile, "wortbox:final-devoicing")).toMatchObject({
      level: "im-aufbau",
      safe: 0,
    });
  });

  it("zählt einen einzigen Tag nicht, auch nicht bei Box 5", () => {
    const profile = buildCompetenceProfile(
      sources({
        events: FIVE.map((word) =>
          learningEvent({
            learningObjectId: learningWordId(word),
            occurredAt: noon(20),
          }),
        ),
        words: FIVE.map((word) => wordProgress(word, 5)),
      }),
    );
    expect(entryOf(profile, "wortbox:final-devoicing").safe).toBe(0);
  });

  it("zählt Hilfe, Selbstkorrektur, Auswahl und Selbsteinschätzung nicht als Abruf", () => {
    const id = learningWordId("Hund");
    const variants = [
      { help: "hint" as const },
      {
        assessment: {
          knowledge: "correct" as const,
          writing: "correct" as const,
          selfCorrected: true,
        },
      },
      { answerMode: "choice" as const },
      { answerMode: "self-check" as const },
    ];
    for (const variant of variants) {
      const profile = buildCompetenceProfile(
        sources({
          events: [
            learningEvent({
              learningObjectId: id,
              occurredAt: noon(20),
              ...variant,
            }),
            learningEvent({
              learningObjectId: id,
              occurredAt: noon(22),
              ...variant,
            }),
          ],
          words: [wordProgress("Hund", 4)],
        }),
      );
      expect(entryOf(profile, "wortbox:final-devoicing").safe).toBe(0);
    }
  });

  it("zählt in einer Runde nur den ersten Versuch", () => {
    const id = learningWordId("Hund");
    // Tag 1: falsch und im selben Durchgang gleich richtig; Tag 2: richtig.
    const events = [
      learningEvent({
        learningObjectId: id,
        occurredAt: "2026-10-20T10:00:00.000Z",
        roundId: "r1",
        correct: false,
      }),
      learningEvent({
        learningObjectId: id,
        occurredAt: "2026-10-20T10:00:15.000Z",
        roundId: "r1",
      }),
      learningEvent({
        learningObjectId: id,
        occurredAt: noon(22),
        roundId: "r2",
      }),
    ];
    const entry = entryOf(
      buildCompetenceProfile(
        sources({ events, words: [wordProgress("Hund", 4)] }),
      ),
      "wortbox:final-devoicing",
    );
    expect(entry.cleanDays).toBe(1);
    expect(entry.safe).toBe(0);
  });

  it("merkt sich den letzten Fehler als offen", () => {
    const id = learningWordId("Hund");
    const profile = buildCompetenceProfile(
      sources({
        events: [
          learningEvent({ learningObjectId: id, occurredAt: noon(20) }),
          learningEvent({
            learningObjectId: id,
            occurredAt: noon(21),
            correct: false,
          }),
        ],
        words: [wordProgress("Hund", 1)],
      }),
    );
    expect(entryOf(profile, "wortbox:final-devoicing").open).toBe(1);
  });

  it("führt eigene Wortboxen mit ihrer Übungsroute und überspringt leere", () => {
    const profile = buildCompetenceProfile(
      sources({
        wordBoxes: [
          BOX,
          {
            id: "eigen-1",
            kind: "eigen",
            title: "Meine Wörter",
            words: ["Haus"],
          },
          {
            id: "unterricht",
            kind: "unterricht",
            title: "Unterricht",
            words: [],
          },
        ],
      }),
    );
    expect(profile.entries.map((entry) => entry.id)).toEqual([
      "wortbox:final-devoicing",
      "wortbox:eigen-1",
    ]);
    expect(entryOf(profile, "wortbox:final-devoicing").route).toBe(
      "/frei/german/lernwoerter?sammlung=final-devoicing",
    );
    expect(entryOf(profile, "wortbox:eigen-1").route).toBe(
      "/frei/german/lernwoerter",
    );
  });
});

describe("Kompetenzprofil: Vokabelstapel", () => {
  const decks = [{ id: "d1", title: "Unit 1" }];

  it("lässt Stapel ohne Karten weg und nennt ungeübte Karten „neu“", () => {
    const profile = buildCompetenceProfile(
      sources({
        wordBoxes: [],
        decks: [...decks, { id: "leer", title: "Leer" }],
        cards: [card("c1", "d1")],
      }),
    );
    expect(profile.entries).toHaveLength(1);
    expect(entryOf(profile, "vokabelstapel:d1")).toMatchObject({
      level: "neu",
      label: "Unit 1",
      route: "/lernbox",
    });
  });

  it("nimmt für „sicher“ die schwächere der geübten Richtungen (wirksame Box)", () => {
    const cards = Array.from({ length: 5 }, (_, index) =>
      card(`c${index}`, "d1", {
        box: 4,
        interval: 7,
        nextReview: NOW + 86_400_000,
        // Rückrichtung geübt, aber nur Box 2: bremst.
        reverseBox: 2,
        reverseInterval: 3,
        reverseNextReview: NOW + 86_400_000,
        lastReviewed: NOW - 86_400_000,
      }),
    );
    const events = cards.flatMap((entry) => [
      learningEvent({
        learningObjectId: entry.id,
        source: "learning-box",
        occurredAt: noon(20),
      }),
      learningEvent({
        learningObjectId: entry.id,
        source: "learning-box",
        occurredAt: noon(22),
      }),
    ]);
    const slow = buildCompetenceProfile(
      sources({ wordBoxes: [], decks, cards, events }),
    );
    expect(entryOf(slow, "vokabelstapel:d1")).toMatchObject({
      level: "im-aufbau",
      safe: 0,
    });
    const fast = buildCompetenceProfile(
      sources({
        wordBoxes: [],
        decks,
        cards: cards.map((entry) => ({ ...entry, reverseBox: 3 as const })),
        events,
      }),
    );
    expect(entryOf(fast, "vokabelstapel:d1")).toMatchObject({
      level: "sicher",
      safe: 5,
    });
  });

  describe("mündliches Aufdecken (Entscheidung D2)", () => {
    /** Karte in Box 3, die mündlich höchstens erreichbar ist. */
    const boxThree = (id: string) =>
      card(id, "d1", {
        box: 3,
        interval: 7,
        nextReview: NOW + 86_400_000,
        lastReviewed: NOW - 86_400_000,
      });
    /** „Gewusst“ nach dem Aufdecken, wie die LernBox es als Ereignis ablegt. */
    const oral = (id: string, day: number, correct = true) =>
      learningEvent({
        learningObjectId: id,
        source: "learning-box",
        occurredAt: noon(day),
        answerMode: "self-check",
        help: "solution",
        assessment: {
          knowledge: correct ? "correct" : "incorrect",
          writing: "not-assessed",
          selfCorrected: false,
        },
      });
    const written = (id: string, day: number) =>
      learningEvent({
        learningObjectId: id,
        source: "learning-box",
        occurredAt: noon(day),
      });

    it("macht einen Stapel mündlich „sicher“ und weist das Schreiben getrennt aus", () => {
      const cards = Array.from({ length: 5 }, (_, i) => boxThree(`c${i}`));
      const events = cards.flatMap((entry) => [
        oral(entry.id, 20),
        oral(entry.id, 22),
      ]);
      const profile = buildCompetenceProfile(
        sources({ wordBoxes: [], decks, cards, events }),
      );
      expect(entryOf(profile, "vokabelstapel:d1")).toMatchObject({
        level: "sicher",
        reason: { code: "safe" },
        safe: 5,
        cleanDays: 2,
        writing: { practiced: 0 },
      });
    });

    it("zählt Schreiben für die Bedeutung mit und ergänzt es im Schreib-Stand", () => {
      const cards = Array.from({ length: 5 }, (_, i) => boxThree(`c${i}`));
      const events = cards.flatMap((entry, index) => [
        // Ein Tag mündlich, ein Tag geschrieben: zusammen zwei Tage Bedeutung.
        oral(entry.id, 20),
        ...(index < 2 ? [written(entry.id, 22)] : [oral(entry.id, 22)]),
      ]);
      const profile = buildCompetenceProfile(
        sources({ wordBoxes: [], decks, cards, events }),
      );
      expect(entryOf(profile, "vokabelstapel:d1")).toMatchObject({
        level: "sicher",
        safe: 5,
        writing: { practiced: 2 },
      });
    });

    it("zählt „Nicht gewusst“ und Aufdecken an nur einem Tag nicht", () => {
      const cards = Array.from({ length: 5 }, (_, i) => boxThree(`c${i}`));
      const wrong = buildCompetenceProfile(
        sources({
          wordBoxes: [],
          decks,
          cards,
          events: cards.flatMap((entry) => [
            oral(entry.id, 20),
            oral(entry.id, 22, false),
          ]),
        }),
      );
      expect(entryOf(wrong, "vokabelstapel:d1")).toMatchObject({
        level: "im-aufbau",
        safe: 0,
        open: 5,
      });
      const oneDay = buildCompetenceProfile(
        sources({
          wordBoxes: [],
          decks,
          cards,
          events: cards.flatMap((entry) => [
            oral(entry.id, 20),
            { ...oral(entry.id, 20), id: `${entry.id}-zweite`, roundId: "r2" },
          ]),
        }),
      );
      expect(entryOf(oneDay, "vokabelstapel:d1").safe).toBe(0);
    });

    it("bleibt an die Box gebunden: Box 2 wird mündlich nicht „sicher“", () => {
      const cards = Array.from({ length: 5 }, (_, i) => ({
        ...boxThree(`c${i}`),
        box: 2 as const,
      }));
      const profile = buildCompetenceProfile(
        sources({
          wordBoxes: [],
          decks,
          cards,
          events: cards.flatMap((entry) => [
            oral(entry.id, 20),
            oral(entry.id, 22),
          ]),
        }),
      );
      expect(entryOf(profile, "vokabelstapel:d1").safe).toBe(0);
    });

    it("gilt nur für die LernBox, nicht für Wortboxen", () => {
      const id = learningWordId("Hund");
      const selfCheck = (day: number) =>
        learningEvent({
          learningObjectId: id,
          source: "learning-word",
          occurredAt: noon(day),
          answerMode: "self-check",
          help: "solution",
        });
      const profile = buildCompetenceProfile(
        sources({
          events: [selfCheck(20), selfCheck(22)],
          words: [wordProgress("Hund", 4)],
        }),
      );
      expect(entryOf(profile, "wortbox:final-devoicing").safe).toBe(0);
    });
  });
});

describe("Kompetenzprofil: Rechenarten", () => {
  const tasks = ["2 * 3", "2 * 4", "2 * 5", "2 * 6", "2 * 7"];

  it("beschriftet die Aufgabenfamilien", () => {
    expect(mathFamilyLabel("mixed-expression")).toBe("Gemischte Aufgaben");
    expect(mathFamilyLabel("multiply:normal:reihe-7")).toBe("Mal: Reihe 7");
    expect(mathFamilyLabel("divide:normal:reihe-3")).toBe("Geteilt: Reihe 3");
    expect(mathFamilyLabel("add:normal:bis-20")).toBe("Plus bis 20");
    expect(mathFamilyLabel("subtract:left:bis-100")).toBe(
      "Minus mit Lücke bis 100",
    );
    expect(mathFamilyLabel("add:normal:darueber")).toBe("Plus über 1000");
    expect(mathFamilyLabel("unbekannt")).toBe("Rechnen");
  });

  it("nennt eine Familie „sicher“ bei Abruf an zwei Tagen, genug Aufgaben und ohne offenen Fehler", () => {
    const events = tasks.flatMap((task, index) => [
      mathEvent(task, { occurredAt: noon(20) }),
      ...(index < 2 ? [mathEvent(task, { occurredAt: noon(22) })] : []),
    ]);
    const profile = buildCompetenceProfile(sources({ wordBoxes: [], events }));
    expect(profile.entries).toHaveLength(1);
    expect(entryOf(profile, "rechenart:multiply:normal:reihe-2")).toMatchObject(
      {
        level: "sicher",
        label: "Mal: Reihe 2",
        reason: { code: "safe" },
        safe: 5,
        cleanDays: 2,
        open: 0,
      },
    );
  });

  it("nennt als Lücken Tage und Breite, solange sie fehlen", () => {
    const profile = buildCompetenceProfile(
      sources({
        wordBoxes: [],
        events: [
          mathEvent("2 * 3", { occurredAt: noon(20) }),
          mathEvent("2 * 4", { occurredAt: noon(20) }),
        ],
      }),
    );
    expect(entryOf(profile, "rechenart:multiply:normal:reihe-2")).toMatchObject(
      {
        level: "im-aufbau",
        reason: { code: "building", missing: ["days", "breadth"] },
      },
    );
  });

  it("hält eine Familie mit offenem Fehlerposten unter Box 3 zurück", () => {
    const events = [
      ...tasks.flatMap((task) => [
        mathEvent(task, { occurredAt: noon(20) }),
        mathEvent(task, { occurredAt: noon(22) }),
      ]),
      mathEvent("2 * 8", { occurredAt: noon(22), correct: false }),
    ];
    const entry = entryOf(
      buildCompetenceProfile(sources({ wordBoxes: [], events })),
      "rechenart:multiply:normal:reihe-2",
    );
    expect(entry).toMatchObject({ level: "im-aufbau", open: 1 });
    expect(entry.reason).toEqual({ code: "building", missing: ["box"] });
  });

  it("trennt Rechenart und Zahlenraum", () => {
    const profile = buildCompetenceProfile(
      sources({
        wordBoxes: [],
        events: [mathEvent("3 + 4"), mathEvent("30 + 40"), mathEvent("5 - 2")],
      }),
    );
    expect(profile.entries.map((entry) => entry.label)).toEqual([
      "Minus bis 20",
      "Plus bis 100",
      "Plus bis 20",
    ]);
  });
});

describe("Kompetenzprofil: Textbox und Tastenwelt", () => {
  it("zeigt sie erst nach einer Übung und höchstens „im Aufbau“", () => {
    const empty = buildCompetenceProfile(sources({ wordBoxes: [] }));
    expect(empty.entries).toEqual([]);
    const profile = buildCompetenceProfile(
      sources({
        wordBoxes: [],
        events: [
          learningEvent({
            learningObjectId: "text-1",
            source: "textbox",
            learningArea: "german",
          }),
          learningEvent({
            learningObjectId: "typing:lektion-1",
            source: "typing",
            learningArea: "typing",
          }),
        ],
      }),
    );
    expect(entryOf(profile, "textbox:sammlung")).toMatchObject({
      level: "im-aufbau",
      reason: { code: "no-recall-box" },
      route: "/frei/german/textbox",
    });
    expect(entryOf(profile, "tastenwelt:abschnitte")).toMatchObject({
      level: "im-aufbau",
      module: "typing",
    });
  });
});

describe("Kompetenzprofil: Zuordnung und Schwäche", () => {
  it("ordnet Lernobjekte ihren Teilbereichen zu", () => {
    const profile = buildCompetenceProfile(
      sources({
        decks: [{ id: "d1", title: "Unit 1" }],
        cards: [card("c1", "d1")],
        events: [mathEvent("2 * 3")],
      }),
    );
    expect(profile.objectAreas.get(learningWordId("Hund"))).toEqual([
      "wortbox:final-devoicing",
    ]);
    expect(profile.objectAreas.get("c1")).toEqual(["vokabelstapel:d1"]);
    expect(profile.objectAreas.get("math:2 * 3")).toEqual([
      "rechenart:multiply:normal:reihe-2",
    ]);
  });

  it("nimmt ein Wort in mehreren Wortboxen mit", () => {
    const profile = buildCompetenceProfile(
      sources({
        wordBoxes: [BOX, { ...BOX, id: "eigen-1", kind: "eigen" }],
      }),
    );
    expect(profile.objectAreas.get(learningWordId("Hund"))).toEqual([
      "wortbox:final-devoicing",
      "wortbox:eigen-1",
    ]);
  });

  it("reiht „im Aufbau“ mit offenen Fehlern vor „neu“ vor „sicher“", () => {
    const make = (level: CompetenceEntry["level"], open: number) =>
      ({ level, open, started: 4 }) as CompetenceEntry;
    const order = [
      make("sicher", 0),
      make("neu", 0),
      make("im-aufbau", 0),
      make("im-aufbau", 2),
    ]
      .map(competenceWeakness)
      .map((value, index) => ({ value, index }))
      .sort((left, right) => right.value - left.value)
      .map((entry) => entry.index);
    expect(order).toEqual([3, 2, 1, 0]);
  });
});
