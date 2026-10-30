import { describe, expect, it } from "vitest";
import {
  liveContentToPackage,
  packageToLiveContent,
  type LiveContentDraft,
} from "./content-adapter";
import { buildRunningDictationSections } from "../../src/domain/running-dictation-sections";
import {
  textSplitConfigFor,
  type RoomContentPackage,
} from "../../src/domain/teacher-content-summary";

const NOW = "2026-10-05T08:00:00.000Z";
const CLASS_A = "123e4567-e89b-42d3-a456-426614174001";

const locales = { left: "en-GB", right: "de-DE" };

describe("Roundtrip je Inhaltsart", () => {
  const drafts: Array<[string, LiveContentDraft]> = [
    [
      "Text",
      {
        contentMode: "text",
        source: "Der Hund läuft. Die Katze schläft.",
        title: "Tiere",
        textSplit: "zeile",
        vocabularyLocales: locales,
      },
    ],
    [
      "Mathe",
      {
        contentMode: "math",
        source: "3+4\n6 _ 2 => 3",
        title: "Rechnen",
        textSplit: "satz",
        vocabularyLocales: locales,
      },
    ],
    [
      "Vokabeln",
      {
        contentMode: "vocabulary",
        source: "go|walk;gehen\nsee;sehen;Verben",
        title: "Verben",
        textSplit: "satz",
        vocabularyLocales: { left: "fr-FR", right: "de-DE" },
      },
    ],
  ];

  it.each(drafts)("%s übersteht Speichern und Laden", (_name, draft) => {
    const stored = liveContentToPackage({ draft, newId: "p1", now: NOW });
    const loaded = packageToLiveContent(stored);
    expect(loaded).toMatchObject({
      contentMode: draft.contentMode,
      source: draft.source,
      title: draft.title,
    });
    if (draft.contentMode === "text") {
      expect(loaded.textSplit).toBe("zeile");
      expect(loaded.textSplitConfig.punctuationEnabled).toBe(false);
    }
    if (draft.contentMode === "vocabulary") {
      expect(loaded.vocabularyLocales).toEqual(draft.vocabularyLocales);
    }
  });
});

describe("Feineinstellungen der Zerlegung", () => {
  const draft: LiveContentDraft = {
    contentMode: "text",
    source: "Haus | Baum. Dach",
    title: "Wörter",
    textSplit: "satz",
    vocabularyLocales: locales,
  };

  it("legt bei Standardwerten keine neuen Felder an", () => {
    const stored = liveContentToPackage({ draft, newId: "p1", now: NOW });
    expect(stored).not.toHaveProperty("splitMarks");
    expect(stored).not.toHaveProperty("splitCustom");
    expect(stored).not.toHaveProperty("lineMode");
    const withDefaults = liveContentToPackage({
      draft: {
        ...draft,
        splitOptions: { marks: [".", "!", "?"], custom: "", lineMode: "each" },
      },
      newId: "p1",
      now: NOW,
    });
    expect(withDefaults).toEqual(stored);
  });

  it("übersteht Speichern und Laden mit Zeichen und eigenem Zeichen", () => {
    const stored = liveContentToPackage({
      draft: {
        ...draft,
        splitOptions: { marks: [".", ","], custom: "|", lineMode: "each" },
      },
      newId: "p1",
      now: NOW,
    });
    expect(stored).toMatchObject({ splitMarks: [".", ","], splitCustom: "|" });
    const config = packageToLiveContent(stored).textSplitConfig;
    expect(config.punctuation).toEqual([".", ","]);
    expect(config.customDelimiters).toEqual([{ id: "eigen", value: "|" }]);
    expect(
      buildRunningDictationSections(stored.source, config).map(
        ({ text }) => text,
      ),
    ).toEqual(["Haus", "Baum.", "Dach"]);
  });

  it("übersteht Speichern und Laden mit „Nur Leerzeilen“", () => {
    const stored = liveContentToPackage({
      draft: {
        ...draft,
        source: "Eins\nzwei\n\nDrei",
        textSplit: "zeile",
        splitOptions: { lineMode: "blank" },
      },
      newId: "p1",
      now: NOW,
    });
    expect(stored.lineMode).toBe("blank");
    const loaded = packageToLiveContent(stored);
    expect(loaded.textSplit).toBe("zeile");
    expect(
      buildRunningDictationSections(stored.source, loaded.textSplitConfig).map(
        ({ text }) => text,
      ),
    ).toEqual(["Eins zwei", "Drei"]);
  });

  it("liest ein Paket ohne die neuen Felder wie früher", () => {
    const old: RoomContentPackage = {
      id: "alt",
      revision: 1,
      title: "Alt",
      source: "Eins. Zwei!\nDrei",
      promptLocale: "en",
      answerLocale: "de",
      createdAt: "2026-09-01T10:00:00.000Z",
      updatedAt: "2026-09-02T10:00:00.000Z",
      kind: "text",
      textSplit: "satz",
    };
    const config = packageToLiveContent(old).textSplitConfig;
    expect(config).toEqual(textSplitConfigFor("satz"));
    expect(config.punctuation).toEqual([".", "!", "?"]);
    expect(
      buildRunningDictationSections(old.source, config).map(({ text }) => text),
    ).toEqual(["Eins.", "Zwei!", "Drei"]);
  });

  it("erhält die Felder, wenn ein bestehendes Paket ohne Angabe neu abgelegt wird", () => {
    const first = liveContentToPackage({
      draft: { ...draft, splitOptions: { custom: "|" } },
      newId: "p1",
      now: NOW,
    });
    const again = liveContentToPackage({
      draft: { ...draft, splitOptions: { custom: "" } },
      existing: first,
      newId: "p2",
      now: NOW,
    });
    // Die Wahl der Lehrkraft gilt: leeres Feld = kein eigenes Zeichen mehr.
    expect(again).not.toHaveProperty("splitCustom");
  });
});

describe("liveContentToPackage", () => {
  const draft: LiveContentDraft = {
    contentMode: "text",
    source: "Eins. Zwei.",
    title: "",
    textSplit: "satz",
    vocabularyLocales: locales,
  };

  it("legt ein neues Paket mit Titelvorschlag und der aktiven Klasse an", () => {
    const entry = liveContentToPackage({
      draft: { ...draft, source: `${"a".repeat(80)}\nzweite Zeile` },
      newId: "neu",
      now: NOW,
      classId: CLASS_A,
    });
    expect(entry).toMatchObject({
      id: "neu",
      revision: 0,
      kind: "text",
      classIds: [CLASS_A],
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(entry.title).toHaveLength(60);
    expect(entry.lastUsedAt).toBeUndefined();
  });

  it("legt ohne Klasse und ohne Text einen Titel an", () => {
    const entry = liveContentToPackage({
      draft: { ...draft, source: "" },
      newId: "n",
      now: NOW,
    });
    expect(entry.title).toBe("Ohne Titel");
    expect(entry.classIds).toBeUndefined();
  });

  const existing: RoomContentPackage = {
    id: "alt",
    revision: 4,
    title: "Eins",
    source: "Eins. Zwei.",
    promptLocale: "en",
    answerLocale: "de",
    createdAt: "2026-09-01T10:00:00.000Z",
    updatedAt: "2026-09-02T10:00:00.000Z",
    kind: "text",
    classIds: [CLASS_A],
    lastUsedAt: "2026-09-03T10:00:00.000Z",
    textSplit: "satz",
  };

  it("lässt die Revision gleich, wenn Quelle und Titel gleich bleiben", () => {
    const entry = liveContentToPackage({
      draft: { ...draft, title: "Eins" },
      existing,
      newId: "ignoriert",
      now: NOW,
    });
    expect(entry).toMatchObject({
      id: "alt",
      revision: 4,
      updatedAt: existing.updatedAt,
      classIds: [CLASS_A],
      lastUsedAt: existing.lastUsedAt,
    });
  });

  it("erhöht die Revision bei neuer Quelle oder neuem Titel", () => {
    const newSource = liveContentToPackage({
      draft: { ...draft, title: "Eins", source: "Drei." },
      existing,
      newId: "x",
      now: NOW,
    });
    expect(newSource).toMatchObject({ revision: 5, updatedAt: NOW });
    const newTitle = liveContentToPackage({
      draft: { ...draft, title: "Anders" },
      existing,
      newId: "x",
      now: NOW,
    });
    expect(newTitle.revision).toBe(5);
  });

  it("setzt beim Raumstart die letzte Nutzung, ohne die Revision zu ändern", () => {
    const entry = liveContentToPackage({
      draft: { ...draft, title: "Eins" },
      existing,
      newId: "x",
      now: NOW,
      markUsed: true,
    });
    expect(entry).toMatchObject({ revision: 4, lastUsedAt: NOW });
  });

  it("behält die Vorbereitung beim Speichern und ersetzt sie bei der Durchführung", () => {
    const prepared = {
      ...existing,
      preparedAt: "2026-09-04T10:00:00.000Z",
      prepared: { gameMode: "BATTLE" as const, battleInk: false },
    };
    const saved = liveContentToPackage({
      draft: { ...draft, title: "Neu" },
      existing: prepared,
      newId: "x",
      now: NOW,
    });
    expect(saved).toMatchObject({
      preparedAt: prepared.preparedAt,
      prepared: prepared.prepared,
    });
    const ran = liveContentToPackage({
      draft: { ...draft, title: "Eins" },
      existing: prepared,
      newId: "x",
      now: NOW,
      markUsed: true,
      ranWith: { gameMode: "STATION", stationCount: 6 },
    });
    expect(ran).toMatchObject({
      lastUsedAt: NOW,
      preparedAt: prepared.preparedAt,
      prepared: { gameMode: "STATION", stationCount: 6 },
    });
    // Ohne Durchführung ändern die Optionen der Runde nichts.
    expect(
      liveContentToPackage({
        draft: { ...draft, title: "Eins" },
        existing: prepared,
        newId: "x",
        now: NOW,
        ranWith: { gameMode: "UEBUNG" },
      }).prepared,
    ).toEqual(prepared.prepared);
  });

  it("ergänzt beim Speichern die gewählte Klasse, sonst bleiben die Klassen", () => {
    const input = {
      draft: { ...draft, title: "Eins" },
      existing: { ...existing, classIds: [CLASS_A] },
      newId: "x",
      now: NOW,
      classId: "123e4567-e89b-42d3-a456-426614174099",
    };
    expect(liveContentToPackage(input).classIds).toEqual([CLASS_A]);
    expect(
      liveContentToPackage({ ...input, addToClass: true }).classIds,
    ).toEqual([CLASS_A, "123e4567-e89b-42d3-a456-426614174099"]);
    // Gehört der Inhalt schon zur Klasse, bleibt alles, wie es ist.
    expect(
      liveContentToPackage({ ...input, addToClass: true, classId: CLASS_A })
        .classIds,
    ).toEqual([CLASS_A]);
  });
});

describe("packageToLiveContent", () => {
  it("liest ein Altpaket als Vokabeln mit passenden Sprachen", () => {
    const loaded = packageToLiveContent({
      id: "a",
      revision: 1,
      title: "Alt",
      source: "go;gehen",
      promptLocale: "en",
      answerLocale: "de",
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(loaded.contentMode).toBe("vocabulary");
    expect(loaded.vocabularyLocales).toEqual({ left: "en-GB", right: "de-DE" });
  });
});
