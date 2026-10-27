import { afterEach, describe, expect, it, vi } from "vitest";
import { parseLiveSession, type LiveSession } from "./live-session";
import { readWordStoreTransferDone } from "./live-trace";
import {
  WORD_STORE_FULL_NOTICE,
  buildWordStoreTransfer,
  misspelledWords,
  runLiveWordStoreTransfer,
  summarizeSavedWords,
} from "./word-store-transfer";

function session(
  wordStoreTransfer: LiveSession["wordStoreTransfer"],
  overrides: Partial<LiveSession> = {},
): LiveSession {
  return {
    ...parseLiveSession(
      {
        words: [
          {
            id: "t1",
            kind: "text",
            targetWord: "Der Hund läuft schnell 12 Meter.",
          },
          { id: "t2", kind: "text", targetWord: "Die Katze schläft im Haus." },
          { id: "t3", kind: "text", targetWord: "Abends essen wir Suppe." },
          { id: "v1", kind: "vocabulary", prompt: "house", targetWord: "Haus" },
        ],
        wordStoreTransfer,
      },
      "s-1",
      "seed",
    ),
    ...overrides,
  };
}

const finished = {
  currentIndex: 3,
  finished: true,
  wordErrors: {},
  wordHelps: {},
};

afterEach(() => {
  window.sessionStorage.clear();
});

describe("misspelledWords", () => {
  it("returns misspelled words of the target text", () => {
    expect(
      misspelledWords("Der Hund läuft schnell.", "Der Hunt läuft schnel."),
    ).toEqual(["der Hund", "schnell"]);
  });

  it("includes capitalisation slips", () => {
    expect(misspelledWords("Der Hund läuft.", "Der hund läuft.")).toEqual([
      "der Hund",
    ]);
  });

  it("ignores missing and additional words", () => {
    expect(
      misspelledWords("Der Hund läuft schnell.", "Der Hund läuft."),
    ).toEqual([]);
    expect(
      misspelledWords("Der Hund läuft.", "Der Hund läuft sehr schnell."),
    ).toEqual([]);
  });

  it("never takes over plain numbers", () => {
    expect(misspelledWords("Es sind 12 Meter.", "Es sind 13 Meter.")).toEqual(
      [],
    );
  });

  it("merges the same word and survives empty input", () => {
    expect(misspelledWords("Hund und Hund.", "Hunt und Hunt.")).toEqual([
      "Hund",
    ]);
    expect(misspelledWords("Der Hund.", "")).toEqual([]);
  });
});

describe("Satzanfänge (G-012)", () => {
  const TARGET = "Heute gehen wir in den Zoo. Plötzlich regnet es.";

  it("schreibt ein falsches Wort am Satzanfang klein und überspringt reine Großschreibfehler", () => {
    expect(
      misspelledWords(
        TARGET,
        "heute gehen wir in den Zoo. plözlich regnet es.",
      ),
    ).toEqual(["plötzlich"]);
  });

  it("nennt „Heute“ nicht, wenn nur die Großschreibung am Satzanfang fehlt", () => {
    expect(
      misspelledWords(
        TARGET,
        "heute gehen wir in den Zoo. Plötzlich regnet es.",
      ),
    ).toEqual([]);
  });

  it("lässt Nomen am Satzanfang groß, wenn sie bekannt sind", () => {
    // „Zoo“ steht in den eingebauten Wortboxen.
    expect(misspelledWords("Zoo ist schön.", "Zo ist schön.")).toEqual(["Zoo"]);
    // Ein Großschreibfehler bei einem bekannten Nomen bleibt ein Fehler.
    expect(misspelledWords("Zoo ist schön.", "zoo ist schön.")).toEqual([
      "Zoo",
    ]);
  });

  it("lässt Wörter groß, die im selben Text auch mitten im Satz großstehen", () => {
    expect(
      misspelledWords(
        "Hund und Hund. Der Hund bellt.",
        "Hunt und Hunt. Der Hunt bellt.",
      ),
    ).toEqual(["Hund", "der Hund"]);
    expect(
      misspelledWords(
        "Tiere sind toll. Der Tiere Zahl wächst.",
        "Tire sind toll. Der Tiere Zahl wächst.",
      ),
    ).toEqual(["Tiere"]);
  });

  it("erkennt Satzanfänge nach ! ? : und öffnenden Anführungszeichen", () => {
    expect(
      misspelledWords(
        "Ach! Wirklich? Ja: Genau. „Plötzlich“ kam er.",
        "ach! Wirklich? Ja: genau. „plözlich“ kam er.",
      ),
    ).toEqual(["plötzlich"]);
    expect(
      misspelledWords(
        "Er sagte: „Komm her!“ Dann ging er.",
        "Er sagte: „Kom her!“ Dann ging er.",
      ),
    ).toEqual(["komm"]);
  });

  it("hält Kürzel, Zahlen und Kurzformen nicht für Satzenden", () => {
    // Nach „z. B.“ und „Dr.“ beginnt kein neuer Satz: „Müller“ bleibt groß.
    expect(
      misspelledWords(
        "Das sagt z. B. Dr. Müller.",
        "Das sagt z. B. Dr. Müler.",
      ),
    ).toEqual(["Müller"]);
    expect(
      misspelledWords("Am 3. Mai regnet es.", "Am 3. Mai regnet es."),
    ).toEqual([]);
  });

  it("lässt Kürzel wie „E-Mail“ unverändert", () => {
    expect(misspelledWords("E-Mail kommt an.", "E-Mal kommt an.")).toEqual([
      "E-Mail",
    ]);
  });

  it("schreibt bei „Alle Wörter“ Wörter am Satzanfang klein", () => {
    const live = parseLiveSession(
      {
        words: [{ id: "t1", kind: "text", targetWord: TARGET }],
        wordStoreTransfer: "all",
      },
      "s-2",
      "seed",
    );
    const result = buildWordStoreTransfer(live, finished)!;
    expect(result.words).toEqual(["heute", "gehen", "plötzlich", "regnet"]);
  });
});

describe("Nomen mit Artikel (G-012)", () => {
  const fehler = (target: string, input: string) =>
    misspelledWords(target, input);

  it("hängt „der“, „die“, „das“ direkt vor dem Nomen an und schreibt ihn klein", () => {
    expect(fehler("Das Essen ist fertig.", "Das Esen ist fertig.")).toEqual([
      "das Essen",
    ]);
    expect(fehler("Wo ist die Katze?", "Wo ist die Katse?")).toEqual([
      "die Katze",
    ]);
    expect(fehler("Ich sehe DER Hund.", "Ich sehe DER Hunt.")).toEqual([
      "der Hund",
    ]);
  });

  it("lässt das Nomen allein, wenn kein „der“, „die“ oder „das“ davorsteht", () => {
    expect(
      fehler("Ich gebe dem Hund Wasser.", "Ich gebe dem Hunt Wasser."),
    ).toEqual(["Hund"]);
    expect(fehler("Ich habe ein Haus.", "Ich habe ein Hous.")).toEqual([
      "Haus",
    ]);
    expect(
      fehler("Das große Haus steht dort.", "Das große Hous steht dort."),
    ).toEqual(["Haus"]);
    expect(fehler("Ich sehe die, Katze.", "Ich sehe die, Katse.")).toEqual([
      "Katze",
    ]);
  });

  it("setzt nach einem Komma keinen Artikel (meist ein Relativpronomen)", () => {
    expect(
      fehler(
        "Das Kind, das Hunger hat, isst.",
        "Das Kind, das Hungar hat, isst.",
      ),
    ).toEqual(["Hunger"]);
    expect(fehler("Der Zoo, der Hund.", "Der Zoo, der Hunt.")).toEqual([
      "Hund",
    ]);
  });

  it("setzt keinen Artikel vor ein Nomen am Satzanfang", () => {
    // „Zoo“ ist bekannt und bleibt groß; „das“ steht im Satz davor.
    expect(
      fehler("Ich mag das. Zoo ist gut.", "Ich mag das. Zo ist gut."),
    ).toEqual(["Zoo"]);
    expect(
      fehler("Ich esse. Das Essen ist gut.", "Ich esse. Das Esen ist gut."),
    ).toEqual(["das Essen"]);
  });

  it("fasst doppelte Einträge zusammen, trennt aber „das Essen“ von „essen“", () => {
    expect(
      fehler(
        "Das Essen ist fertig. Wir wollen das Essen sehen. Kinder essen gern.",
        "Das Esen ist fertig. Wir wollen das Esen sehen. Kinder esen gern.",
      ),
    ).toEqual(["das Essen", "essen"]);
  });

  it("übernimmt bei „Alle Wörter“ Nomen mit Artikel und zählt die Mindestlänge am Nomen", () => {
    const live = parseLiveSession(
      {
        words: [
          {
            id: "t1",
            kind: "text",
            targetWord:
              "Das Essen ist fertig. Der Zoo, der Hund und das Essen.",
          },
          { id: "t2", kind: "text", targetWord: "Wir essen mit dem Löffel." },
        ],
        wordStoreTransfer: "all",
      },
      "s-art",
      "seed",
    );
    const result = buildWordStoreTransfer(live, finished)!;
    // „der Hund“ steht nach einem Komma: ohne Artikel übernommen.
    expect(result.words).toEqual([
      "das Essen",
      "fertig",
      "Hund",
      "essen",
      "Löffel",
    ]);
  });
});

describe("buildWordStoreTransfer", () => {
  it("takes nothing for none and for older sessions without the field", () => {
    expect(buildWordStoreTransfer(session("none"), finished)).toBeUndefined();
    const old = parseLiveSession(
      { words: [{ id: "t", kind: "text", targetWord: "Eine lange Zeile." }] },
      "old",
      "seed",
    );
    expect(old.wordStoreTransfer).toBe("none");
    expect(buildWordStoreTransfer(old, finished)).toBeUndefined();
  });

  it("takes only misspelled words for errors", () => {
    const result = buildWordStoreTransfer(session("errors"), {
      ...finished,
      wordMisspellings: {
        "Der Hund läuft schnell 12 Meter.": ["der Hund", "schnell"],
        "Abends essen wir Suppe.": ["Suppe"],
      },
    });
    expect(result).toEqual({
      words: ["der Hund", "schnell", "Suppe"],
      errorWords: ["der Hund", "schnell", "Suppe"],
    });
  });

  it("returns nothing when nothing was misspelled", () => {
    expect(buildWordStoreTransfer(session("errors"), finished)).toBeUndefined();
  });

  it("takes all long words plus misspelled short ones for all", () => {
    const result = buildWordStoreTransfer(session("all"), {
      ...finished,
      wordMisspellings: { "Die Katze schläft im Haus.": ["im"] },
    })!;
    expect(result.errorWords).toEqual(["im"]);
    expect(result.words).toEqual([
      "im",
      "der Hund",
      "läuft",
      "schnell",
      "Meter",
      "die Katze",
      "schläft",
      "Haus",
      "abends",
      "essen",
      "Suppe",
    ]);
    expect(result.words).not.toContain("Der");
    expect(result.words).not.toContain("12");
  });

  it("only counts the parts reached so far, up to and including the current one", () => {
    const result = buildWordStoreTransfer(session("all"), {
      currentIndex: 1,
      finished: false,
      wordErrors: {},
      wordHelps: {},
    })!;
    expect(result.words).toContain("die Katze");
    expect(result.words).not.toContain("Suppe");
  });

  it("is empty in station mode", () => {
    expect(
      buildWordStoreTransfer(session("all", { stationMode: true }), finished),
    ).toBeUndefined();
  });
});

describe("runLiveWordStoreTransfer", () => {
  const trace = {
    ...finished,
    wordMisspellings: { "Der Hund läuft schnell 12 Meter.": ["Hund"] },
  };

  it("imports once per round and device and remembers the result", async () => {
    const importFromLesson = vi
      .fn()
      .mockResolvedValue({ added: ["Hund"], full: false });
    const repository = { importFromLesson };
    const first = await runLiveWordStoreTransfer(
      repository,
      session("errors"),
      trace,
    );
    expect(first).toEqual({ status: "success", added: ["Hund"], full: false });
    expect(importFromLesson).toHaveBeenCalledWith({
      words: ["Hund"],
      errorWords: ["Hund"],
      sourceId: "s-1",
    });
    expect(readWordStoreTransferDone("s-1")).toEqual({
      added: ["Hund"],
      full: false,
    });
    const again = await runLiveWordStoreTransfer(
      repository,
      session("errors"),
      trace,
    );
    expect(again).toEqual(first);
    expect(importFromLesson).toHaveBeenCalledTimes(1);
  });

  it("shares one promise between parallel calls", async () => {
    const importFromLesson = vi
      .fn()
      .mockResolvedValue({ added: ["Hund"], full: false });
    const repository = { importFromLesson };
    await Promise.all([
      runLiveWordStoreTransfer(repository, session("errors"), trace),
      runLiveWordStoreTransfer(repository, session("errors"), trace),
    ]);
    expect(importFromLesson).toHaveBeenCalledTimes(1);
  });

  it("also works for a round ended early by the teacher", async () => {
    const importFromLesson = vi
      .fn()
      .mockResolvedValue({ added: ["Hund"], full: false });
    const result = await runLiveWordStoreTransfer(
      { importFromLesson },
      session("errors"),
      { ...trace, finished: false, currentIndex: 1 },
    );
    expect(result.status).toBe("success");
  });

  it("passes on a full box", async () => {
    const importFromLesson = vi
      .fn()
      .mockResolvedValue({ added: ["Hund"], full: true });
    const result = await runLiveWordStoreTransfer(
      { importFromLesson },
      session("errors"),
      trace,
    );
    expect(result).toMatchObject({ status: "success", full: true });
    expect(WORD_STORE_FULL_NOTICE).toContain("voll");
  });

  it("does nothing in station mode, for none and without words", async () => {
    const importFromLesson = vi.fn();
    const repository = { importFromLesson };
    expect(
      await runLiveWordStoreTransfer(
        repository,
        session("errors", { stationMode: true }),
        trace,
      ),
    ).toEqual({ status: "none" });
    expect(
      await runLiveWordStoreTransfer(
        repository,
        session("none", { sessionId: "s-2" }),
        trace,
      ),
    ).toEqual({ status: "none" });
    expect(
      await runLiveWordStoreTransfer(
        repository,
        session("errors", { sessionId: "s-3" }),
        finished,
      ),
    ).toEqual({ status: "none" });
    expect(importFromLesson).not.toHaveBeenCalled();
  });

  it("reports an error without marking the round as done", async () => {
    const importFromLesson = vi.fn().mockRejectedValueOnce(new Error("kaputt"));
    const repository = { importFromLesson };
    const failed = await runLiveWordStoreTransfer(
      repository,
      session("errors"),
      trace,
    );
    expect(failed.status).toBe("error");
    expect(readWordStoreTransferDone("s-1")).toBeUndefined();
    importFromLesson.mockResolvedValueOnce({ added: ["Hund"], full: false });
    const retry = await runLiveWordStoreTransfer(
      repository,
      session("errors"),
      trace,
    );
    expect(retry.status).toBe("success");
  });
});

describe("summarizeSavedWords", () => {
  it("shows at most five words and counts the rest", () => {
    expect(summarizeSavedWords(["a", "b"])).toEqual({
      shown: ["a", "b"],
      more: 0,
    });
    expect(summarizeSavedWords(["a", "b", "c", "d", "e", "f", "g"])).toEqual({
      shown: ["a", "b", "c", "d", "e"],
      more: 2,
    });
  });
});
