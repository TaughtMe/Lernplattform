import { describe, expect, it } from "vitest";
import { buildRunningDictationSections } from "./running-dictation-sections";
import {
  teacherContentPackageSchema,
  type TeacherContentPackage,
} from "./teacher-content-library";
import {
  activeClassIdsOf,
  applyTextSplitOptions,
  contentKindOf,
  describeContent,
  describePrepared,
  describeRun,
  describeState,
  filterByClass,
  isArchived,
  isUnassigned,
  resolveClassSelection,
  changedDate,
  ranDate,
  shortDate,
  sortLibrary,
  sortForLibrary,
  sortPrepared,
  splitFieldsOf,
  suggestTitle,
  textSplitConfigFor,
  textSplitOptionsOf,
  type TextSplitOptions,
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

describe("Sortieren der Ablage", () => {
  const entry = (
    id: string,
    title: string,
    kind: "text" | "math" | "vocabulary",
    updatedAt: string,
    lastUsedAt?: string,
  ) => ({
    id,
    title,
    kind,
    updatedAt,
    ...(lastUsedAt ? { lastUsedAt } : {}),
  });
  const list = [
    entry("a", "Zebra", "math", "2026-09-01T10:00:00.000Z"),
    entry(
      "b",
      "apfel",
      "text",
      "2026-09-03T10:00:00.000Z",
      "2026-09-20T10:00:00.000Z",
    ),
    entry(
      "c",
      "Birne 10",
      "vocabulary",
      "2026-09-02T10:00:00.000Z",
      "2026-09-10T10:00:00.000Z",
    ),
    entry("d", "Birne 2", "text", "2026-09-04T10:00:00.000Z"),
  ];
  const ids = (key: Parameters<typeof sortLibrary>[1], dir: 1 | -1) =>
    sortLibrary(list, key, dir).map(({ id }) => id);

  it("sortiert nach Titel ohne Groß-/Kleinschreibung und mit Zahlen", () => {
    expect(ids("title", 1)).toEqual(["b", "d", "c", "a"]);
    expect(ids("title", -1)).toEqual(["a", "c", "d", "b"]);
  });

  it("sortiert nach Typ: Text, Vokabeln, Mathe", () => {
    expect(ids("kind", 1).slice(2)).toEqual(["c", "a"]);
    expect(ids("kind", -1).slice(0, 2)).toEqual(["a", "c"]);
  });

  it("sortiert nach Änderungsdatum", () => {
    expect(ids("date", 1)).toEqual(["a", "c", "b", "d"]);
    expect(ids("date", -1)).toEqual(["d", "b", "c", "a"]);
  });

  it("sortiert nach letzter Durchführung; Nie-Gestartetes bleibt hinten", () => {
    expect(ids("ran", 1).slice(0, 2)).toEqual(["c", "b"]);
    expect(ids("ran", -1).slice(0, 2)).toEqual(["b", "c"]);
    expect(ids("ran", -1).slice(2).sort()).toEqual(["a", "d"]);
  });

  it("zeigt Änderung und Durchführung getrennt", () => {
    const stamp = {
      updatedAt: "2026-09-02T10:00:00.000Z",
      lastUsedAt: "2026-09-14T10:00:00.000Z",
    };
    expect(changedDate(stamp, "Europe/Berlin")).toBe("02.09.");
    expect(ranDate(stamp, "Europe/Berlin")).toBe("14.09.");
    expect(ranDate({}, "Europe/Berlin")).toBeNull();
  });
});

describe("Klassenwahl", () => {
  const classIds = [CLASS_A, CLASS_B];

  it("nimmt die Adresse, wenn sie zu einer aktiven Klasse passt", () => {
    expect(
      resolveClassSelection({
        requested: CLASS_B,
        lastClassId: CLASS_A,
        classIds,
      }),
    ).toBe(CLASS_B);
    expect(
      resolveClassSelection({
        requested: UNASSIGNED,
        lastClassId: CLASS_A,
        classIds,
      }),
    ).toBe(UNASSIGNED);
  });

  it("fällt auf die zuletzt genutzte, dann die erste Klasse, dann „ohne“ zurück", () => {
    expect(
      resolveClassSelection({
        requested: ARCHIVED,
        lastClassId: CLASS_B,
        classIds,
      }),
    ).toBe(CLASS_B);
    expect(
      resolveClassSelection({
        requested: null,
        lastClassId: ARCHIVED,
        classIds,
      }),
    ).toBe(CLASS_A);
    expect(
      resolveClassSelection({
        requested: undefined,
        lastClassId: undefined,
        classIds: [],
      }),
    ).toBe(UNASSIGNED);
  });
});

describe("Vorbereitung und Archiv", () => {
  it("liest Altpakete ohne Vorbereitung und weist fremde Optionen ab", () => {
    expect(teacherContentPackageSchema.parse(base).prepared).toBeUndefined();
    const prepared = teacherContentPackageSchema.parse({
      ...base,
      preparedAt: "2026-09-03T10:00:00.000Z",
      prepared: { gameMode: "STATION", stationCount: 5, tts: true },
    });
    expect(prepared.prepared).toEqual({
      gameMode: "STATION",
      stationCount: 5,
      tts: true,
    });
    expect(() =>
      teacherContentPackageSchema.parse({
        ...base,
        prepared: { gameMode: "STATION", punkte: true },
      }),
    ).toThrow();
    expect(() =>
      teacherContentPackageSchema.parse({
        ...base,
        prepared: { gameMode: "TEST" },
      }),
    ).toThrow();
    expect(() =>
      teacherContentPackageSchema.parse({
        ...base,
        prepared: { gameMode: "STATION", stationCount: 0 },
      }),
    ).toThrow();
  });

  it("archiviert nach der Durchführung, bis der Inhalt wieder vorbereitet ist", () => {
    expect(isArchived({})).toBe(false);
    expect(isArchived({ lastUsedAt: "2026-09-05T10:00:00.000Z" })).toBe(true);
    expect(
      isArchived({
        lastUsedAt: "2026-09-05T10:00:00.000Z",
        preparedAt: "2026-09-04T10:00:00.000Z",
      }),
    ).toBe(true);
    expect(
      isArchived({
        lastUsedAt: "2026-09-05T10:00:00.000Z",
        preparedAt: "2026-09-06T10:00:00.000Z",
      }),
    ).toBe(false);
    expect(isArchived({ preparedAt: "2026-09-06T10:00:00.000Z" })).toBe(false);
  });

  it("sortiert Vorbereitetes nach Vorbereitung, sonst Änderung", () => {
    const entries = [
      { ...base, id: "alt" },
      {
        ...base,
        id: "vorbereitet",
        preparedAt: "2026-09-10T10:00:00.000Z",
      },
      { ...base, id: "neu", updatedAt: "2026-09-05T10:00:00.000Z" },
    ];
    expect(sortPrepared(entries).map(({ id }) => id)).toEqual([
      "vorbereitet",
      "neu",
      "alt",
    ]);
  });

  it("beschreibt Modus und wichtige Optionen", () => {
    expect(describePrepared()).toBe("Laufdiktat · Standard");
    expect(describePrepared({ gameMode: "LAUFDIKTAT", tts: true })).toBe(
      "Laufdiktat · Vorlesen an",
    );
    expect(describePrepared({ gameMode: "STATION", stationCount: 5 })).toBe(
      "Stationen · 5 Stationen",
    );
    expect(describePrepared({ gameMode: "STATION", stationCount: 1 })).toBe(
      "Stationen · 1 Station",
    );
    expect(describePrepared({ gameMode: "BATTLE" })).toBe(
      "Battle · Tinte und Flimmern",
    );
    expect(describePrepared({ gameMode: "BATTLE", battleFlicker: false })).toBe(
      "Battle · nur Tinte",
    );
    expect(describePrepared({ gameMode: "BATTLE", battleInk: false })).toBe(
      "Battle · nur Flimmern",
    );
    expect(
      describePrepared({
        gameMode: "BATTLE",
        battleInk: false,
        battleFlicker: false,
      }),
    ).toBe("Battle · ohne Störangriffe");
    expect(
      describePrepared({
        gameMode: "UEBUNG",
        mathGap: true,
        strictTyping: true,
      }),
    ).toBe("Freies Üben · mit Lücken · genaues Tippen");
  });

  it("nennt Durchführung und Stand", () => {
    const ran = { lastUsedAt: "2026-10-14T10:00:00.000Z" };
    expect(describeRun(ran, "UTC")).toBe("durchgeführt 14.10.");
    expect(
      describeRun({ ...ran, prepared: { gameMode: "BATTLE" } }, "UTC"),
    ).toBe("Battle · durchgeführt 14.10.");
    expect(describeRun({}, "UTC")).toBe("noch nie durchgeführt");
    expect(describeState(ran, "UTC")).toBe("durchgeführt 14.10.");
    expect(describeState({}, "UTC")).toBe("noch nie durchgeführt");
    expect(describeState({ prepared: { gameMode: "UEBUNG" } })).toBe(
      "vorbereitet",
    );
    expect(
      describeState({ ...ran, preparedAt: "2026-10-15T10:00:00.000Z" }),
    ).toBe("vorbereitet");
  });
});

describe("Teilen nach Sätzen: Trennen bei", () => {
  const parts = (
    text: string,
    mode: "satz" | "zeile" | "wort",
    options?: TextSplitOptions,
  ) =>
    buildRunningDictationSections(text, textSplitConfigFor(mode, options)).map(
      ({ text: part }) => part,
    );

  it("teilt ohne Angaben wie bisher an . ! ?", () => {
    const text = "Wo bist du? Hier, im Hof! Komm mit.";
    expect(parts(text, "satz")).toEqual([
      "Wo bist du?",
      "Hier, im Hof!",
      "Komm mit.",
    ]);
    expect(parts(text, "satz", {})).toEqual(parts(text, "satz"));
    expect(textSplitConfigFor("satz")).toEqual(
      textSplitConfigFor("satz", {
        marks: undefined,
        custom: undefined,
        lineMode: undefined,
      }),
    );
  });

  it("teilt mit Komma zusätzlich an Kommas, aber nicht in Zahlen", () => {
    expect(
      parts("Hier, im Hof, 3,5 Meter.", "satz", {
        marks: [".", "!", "?", ","],
      }),
    ).toEqual(["Hier,", "im Hof,", "3,5 Meter."]);
  });

  it("teilt ohne Ausrufezeichen nicht mehr an !", () => {
    expect(parts("Halt! Stopp. Los!", "satz", { marks: [".", "?"] })).toEqual([
      "Halt! Stopp.",
      "Los!",
    ]);
  });

  it("teilt nur an dem gewählten Zeichen", () => {
    expect(parts("Eins. Zwei? Drei.", "satz", { marks: ["?"] })).toEqual([
      "Eins. Zwei?",
      "Drei.",
    ]);
  });

  it("teilt an einem eigenen Zeichen und entfernt es", () => {
    expect(parts("Haus | Baum | Dach", "satz", { custom: "|" })).toEqual([
      "Haus",
      "Baum",
      "Dach",
    ]);
    expect(parts("Haus; Baum. Dach", "satz", { custom: ";" })).toEqual([
      "Haus",
      "Baum.",
      "Dach",
    ]);
    expect(parts("a//b", "satz", { custom: "//" })).toEqual(["a", "b"]);
  });

  it("begrenzt das eigene Zeichen auf drei Zeichen ohne Leerraum", () => {
    expect(
      textSplitConfigFor("satz", { custom: "abcd" }).customDelimiters,
    ).toEqual([{ id: "eigen", value: "abc" }]);
    expect(
      textSplitConfigFor("satz", { custom: " | " }).customDelimiters,
    ).toEqual([{ id: "eigen", value: "|" }]);
    expect(
      textSplitConfigFor("satz", { custom: "  " }).customDelimiters,
    ).toEqual([]);
  });

  it("lässt Zahlen und Anführungszeichen nach dem Satzzeichen heil", () => {
    expect(
      parts("Es kostet 3.50 Euro. Er sagte: „Komm!“ Dann ging er.", "satz"),
    ).toEqual(["Es kostet 3.50 Euro.", "Er sagte: „Komm!“", "Dann ging er."]);
  });

  it("behält Zeichen und eigenes Zeichen beim Wechsel zu Zeilen und zurück", () => {
    const options = { marks: ["."], custom: "|", lineMode: "blank" } as const;
    const zeile = textSplitConfigFor("zeile", options);
    // In „Zeilen“ wirken Satzzeichen und eigenes Zeichen nicht.
    expect(
      buildRunningDictationSections("Eins. Zwei | drei", zeile),
    ).toHaveLength(1);
    expect(textSplitOptionsOf(zeile)).toEqual(options);
    // Bei „Sätzen“ ruht die Zeilenwahl, die Teilung selbst bleibt an jeder Zeile.
    const satz = textSplitConfigFor("satz", options);
    expect(textSplitOptionsOf(satz)).toEqual(options);
    expect(satz.newlineMode).toBe("line");
  });
});

describe("Teilen nach Zeilen: jede Zeile oder nur Leerzeilen", () => {
  const text = "Der Hund bellt\nund rennt.\n\nDie Katze schläft.\nSie träumt.";
  const parts = (lineMode?: "each" | "blank") =>
    buildRunningDictationSections(
      text,
      textSplitConfigFor("zeile", { lineMode }),
    ).map(({ text: part }) => part);

  it("teilt standardmäßig an jeder Zeile", () => {
    expect(parts()).toEqual([
      "Der Hund bellt",
      "und rennt.",
      "Die Katze schläft.",
      "Sie träumt.",
    ]);
    expect(parts("each")).toEqual(parts());
  });

  it("teilt mit „Nur Leerzeilen“ nur an Absätzen und setzt Umbrüche als Leerzeichen", () => {
    expect(parts("blank")).toEqual([
      "Der Hund bellt und rennt.",
      "Die Katze schläft. Sie träumt.",
    ]);
  });

  it("erkennt Leerzeilen auch mit Leerzeichen und Windows-Umbrüchen", () => {
    expect(
      buildRunningDictationSections(
        "Eins\r\nzwei\r\n  \r\nDrei",
        textSplitConfigFor("zeile", { lineMode: "blank" }),
      ).map(({ text: part }) => part),
    ).toEqual(["Eins zwei", "Drei"]);
  });

  it("lässt „Sätzen“ an Zeilenumbrüchen teilen, auch wenn „Nur Leerzeilen“ gemerkt ist", () => {
    expect(
      buildRunningDictationSections(
        "Eins\nzwei",
        textSplitConfigFor("satz", { lineMode: "blank" }),
      ),
    ).toHaveLength(2);
  });
});

describe("Feineinstellungen im Paket", () => {
  it("schreibt nur Abweichungen vom Standard", () => {
    expect(splitFieldsOf({})).toEqual({});
    expect(
      splitFieldsOf({ marks: [".", "!", "?"], custom: "", lineMode: "each" }),
    ).toEqual({});
    expect(
      splitFieldsOf({ marks: ["?", "."], custom: "|", lineMode: "blank" }),
    ).toEqual({ splitMarks: [".", "?"], splitCustom: "|", lineMode: "blank" });
  });

  it("lässt ein fehlendes oder leeres Zeichen beim Standard", () => {
    expect(textSplitOptionsOf(textSplitConfigFor("wort"))).toEqual({
      marks: [".", "!", "?"],
      custom: "",
      lineMode: "each",
    });
    expect(textSplitConfigFor("satz", { marks: [] }).punctuation).toEqual([
      ".",
      "!",
      "?",
    ]);
  });

  it("wendet eine Änderung an und behält mindestens ein Zeichen", () => {
    const config = textSplitConfigFor("satz");
    expect(
      applyTextSplitOptions(config, { marks: [".", ","] }, "satz").punctuation,
    ).toEqual([".", ","]);
    expect(
      applyTextSplitOptions(config, { marks: [] }, "satz").punctuation,
    ).toEqual([".", "!", "?"]);
    expect(
      applyTextSplitOptions(config, { custom: ";" }, "satz"),
    ).toMatchObject({
      customDelimiters: [{ value: ";" }],
    });
    // „Wörter“ kennt keine Feineinstellung.
    const words = textSplitConfigFor("wort");
    expect(applyTextSplitOptions(words, { custom: ";" }, "wort")).toBe(words);
  });

  it("zählt die Abschnitte der Metazeile mit den Feineinstellungen", () => {
    const text = {
      ...base,
      kind: "text" as const,
      source: "Haus | Baum. Dach",
    };
    expect(describeContent(text)).toBe("2 Abschnitte · 4 Wörter");
    expect(describeContent({ ...text, splitCustom: "|" })).toBe(
      "3 Abschnitte · 4 Wörter",
    );
  });
});

describe("Schema: Feineinstellungen der Zerlegung", () => {
  const record = {
    id: "p1",
    revision: 0,
    title: "Text",
    source: "Eins. Zwei.",
    promptLocale: "en",
    answerLocale: "de",
    createdAt: "2026-09-01T10:00:00.000Z",
    updatedAt: "2026-09-02T10:00:00.000Z",
    kind: "text" as const,
    textSplit: "satz" as const,
  };

  it("liest einen Datensatz ohne die neuen Felder", () => {
    const parsed = teacherContentPackageSchema.parse(record);
    expect(parsed.splitMarks).toBeUndefined();
    expect(parsed.splitCustom).toBeUndefined();
    expect(parsed.lineMode).toBeUndefined();
  });

  it("liest einen Datensatz mit den neuen Feldern", () => {
    expect(
      teacherContentPackageSchema.parse({
        ...record,
        splitMarks: [".", ","],
        splitCustom: "|",
        lineMode: "blank",
      }),
    ).toMatchObject({
      splitMarks: [".", ","],
      splitCustom: "|",
      lineMode: "blank",
    });
  });

  it("lehnt ungültige Werte ab", () => {
    for (const patch of [
      { splitMarks: [] },
      { splitMarks: [";"] },
      { splitCustom: "abcd" },
      { lineMode: "absatz" },
    ]) {
      expect(() =>
        teacherContentPackageSchema.parse({ ...record, ...patch }),
      ).toThrow();
    }
  });
});
