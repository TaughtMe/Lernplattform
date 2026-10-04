import { describe, expect, it } from "vitest";
import {
  liveContentToPackage,
  packageToLiveContent,
  type LiveContentDraft,
} from "./content-adapter";
import type { TeacherContentPackage } from "../../src/domain/teacher-content-library";

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

  it.each(drafts)("%s übersteht Ablegen und Laden", (_name, draft) => {
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

  const existing: TeacherContentPackage = {
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
