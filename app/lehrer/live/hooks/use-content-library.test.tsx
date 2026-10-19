// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_VOCABULARY_LOCALES } from "../../../../src/domain/running-dictation";
import { DEFAULT_TEXT_SPLIT_CONFIG } from "../../../../src/domain/running-dictation-sections";
import type { TeacherContentMode } from "../../../../src/integrations/laufdiktat/teacher-session";
import { useContentLibrary } from "./use-content-library";

const repository = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
  remove: vi.fn(),
  prepare: vi.fn(),
}));
vi.mock("../../../../src/storage/teacher-class-settings", () => ({
  createTeacherContentLibraryRepository: () => repository,
}));

function setup(
  options: {
    contentMode?: TeacherContentMode;
    source?: string;
    activeClass?: string;
  } = {},
) {
  const setError = vi.fn();
  const setLibraryNotice = vi.fn();
  const loadPairsFromTable = vi.fn();
  const hook = renderHook(() => {
    const [sources, setSources] = useState<Record<TeacherContentMode, string>>({
      text: "",
      vocabulary: "",
      math: "",
    });
    const library = useContentLibrary({
      clock: () => Date.UTC(2026, 9, 1, 8, 0, 0),
      contentMode: options.contentMode ?? "text",
      source: options.source ?? "Der Hund bellt.",
      splitConfig: DEFAULT_TEXT_SPLIT_CONFIG,
      vocabularyLocales: DEFAULT_VOCABULARY_LOCALES,
      activeClass: options.activeClass ?? "",
      setError,
      setLibraryNotice,
      setSources,
      loadPairsFromTable,
    });
    return { ...library, ...library.model, sources };
  });
  return { ...hook, setError, setLibraryNotice, loadPairsFromTable };
}

describe("useContentLibrary", () => {
  beforeEach(() => {
    repository.get.mockReset().mockResolvedValue(undefined);
    repository.put.mockReset().mockResolvedValue(undefined);
    repository.remove.mockReset().mockResolvedValue(undefined);
    repository.prepare.mockReset().mockResolvedValue(true);
  });

  it("legt nichts Leeres ab und sagt es", async () => {
    const { result, setError, setLibraryNotice } = setup({ source: "   " });
    await act(() => result.current.saveContent());
    expect(setError).toHaveBeenCalledWith("");
    expect(setLibraryNotice).toHaveBeenCalledWith(
      "Gib zuerst etwas ein, das gespeichert werden kann.",
    );
    expect(repository.put).not.toHaveBeenCalled();
  });

  it("speichert neu in der Klasse und merkt sich Kennung und Titel", async () => {
    const { result, setLibraryNotice } = setup({ activeClass: "k5" });
    const dispatched = vi.fn();
    window.addEventListener("teacher-data-changed", dispatched);
    await act(() => result.current.saveContent());
    expect(repository.put).toHaveBeenCalledTimes(1);
    const entry = repository.put.mock.calls[0]![0];
    expect(entry.id).toMatch(/^teacher-package-/);
    expect(entry.classIds).toEqual(["k5"]);
    expect(result.current.contentId).toBe(entry.id);
    expect(result.current.title).toBe(entry.title);
    expect(setLibraryNotice).toHaveBeenCalledWith(
      `„${entry.title}“ ist gespeichert.`,
    );
    expect(dispatched).toHaveBeenCalledTimes(1);
    window.removeEventListener("teacher-data-changed", dispatched);
  });

  it("aktualisiert beim zweiten Speichern denselben Eintrag", async () => {
    const { result } = setup();
    await act(() => result.current.saveContent());
    const first = repository.put.mock.calls[0]![0];
    repository.get.mockResolvedValue(first);
    await act(() => result.current.saveContent());
    expect(repository.get).toHaveBeenCalledWith(first.id);
    expect(repository.put.mock.calls[1]![0].id).toBe(first.id);
  });

  it("meldet einen Fehler beim Speichern", async () => {
    repository.put.mockRejectedValue(new Error("voll"));
    const { result, setLibraryNotice } = setup();
    await act(() => result.current.saveContent());
    expect(setLibraryNotice).toHaveBeenCalledWith(
      "Der Inhalt konnte nicht gespeichert werden. Bitte versuche es noch einmal.",
    );
    expect(result.current.contentId).toBeNull();
  });

  it("legt über storeContent ab und gibt den Eintrag zurück", async () => {
    const { result } = setup();
    let entry: { id: string } | undefined;
    await act(async () => {
      entry = (await result.current.storeContent(true)) as { id: string };
    });
    expect(entry?.id).toBe(repository.put.mock.calls[0]![0].id);
  });

  it("nimmt bei der Durchführung Modus und Optionen der Runde mit", async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.storeContent(true, false, {
        gameMode: "BATTLE",
        battleInk: false,
      });
    });
    expect(repository.put.mock.calls[0]![0]).toMatchObject({
      lastUsedAt: "2026-10-01T08:00:00.000Z",
      prepared: { gameMode: "BATTLE", battleInk: false },
    });
  });

  it("bereitet vor: legt ab und speichert Modus und Optionen", async () => {
    const { result, setLibraryNotice } = setup({ activeClass: "k5" });
    let done: boolean | undefined;
    await act(async () => {
      done = await result.current.prepareContent({
        gameMode: "STATION",
        stationCount: 5,
      });
    });
    expect(done).toBe(true);
    const entry = repository.put.mock.calls[0]![0];
    expect(entry.lastUsedAt).toBeUndefined();
    expect(repository.prepare).toHaveBeenCalledWith(
      entry.id,
      { gameMode: "STATION", stationCount: 5 },
      "2026-10-01T08:00:00.000Z",
    );
    expect(setLibraryNotice).toHaveBeenCalledWith(
      `„${entry.title}“ ist vorbereitet.`,
    );
  });

  it("bereitet nichts Leeres vor und meldet Fehler", async () => {
    const empty = setup({ source: " " });
    await act(async () => {
      await empty.result.current.prepareContent({ gameMode: "LAUFDIKTAT" });
    });
    expect(empty.setLibraryNotice).toHaveBeenCalledWith(
      "Gib zuerst etwas ein, das vorbereitet werden kann.",
    );
    repository.prepare.mockRejectedValue(new Error("voll"));
    const failing = setup();
    await act(async () => {
      await failing.result.current.prepareContent({ gameMode: "LAUFDIKTAT" });
    });
    expect(failing.setLibraryNotice).toHaveBeenCalledWith(
      "Der Inhalt konnte nicht vorbereitet werden. Bitte versuche es noch einmal.",
    );
  });

  it("löscht nichts, solange nichts abgelegt ist", async () => {
    const { result } = setup();
    await act(() => result.current.deleteContent());
    expect(repository.remove).not.toHaveBeenCalled();
  });

  it("löscht den Eintrag und meldet es mit Titel", async () => {
    const { result, setLibraryNotice } = setup();
    await act(() => result.current.saveContent());
    const entry = repository.put.mock.calls[0]![0];
    repository.get.mockResolvedValue(entry);
    await act(() => result.current.deleteContent());
    expect(repository.remove).toHaveBeenCalledWith(entry.id);
    expect(result.current.contentId).toBeNull();
    expect(setLibraryNotice).toHaveBeenLastCalledWith(
      `„${entry.title}“ wurde aus der Ablage gelöscht.`,
    );
  });

  it("meldet einen Fehler beim Löschen", async () => {
    const { result, setLibraryNotice } = setup();
    await act(() => result.current.saveContent());
    repository.remove.mockRejectedValue(new Error("weg"));
    await act(() => result.current.deleteContent());
    expect(setLibraryNotice).toHaveBeenLastCalledWith(
      "Der Inhalt konnte nicht gelöscht werden.",
    );
  });

  it("liest eine Datei in die Quelle des gewählten Inhalts", async () => {
    const { result, loadPairsFromTable } = setup({ contentMode: "math" });
    act(() =>
      result.current.importFile(new File(["1 + 2\n3 + 4"], "aufgaben.txt")),
    );
    await waitFor(() =>
      expect(result.current.sources.math).toBe("1 + 2\n3 + 4"),
    );
    expect(loadPairsFromTable).not.toHaveBeenCalled();
    act(() => result.current.importFile(undefined));
  });

  it("lädt bei Vokabeln auch die Paare aus der Datei", async () => {
    const { result, loadPairsFromTable } = setup({ contentMode: "vocabulary" });
    act(() => result.current.importFile(new File(["dog;Hund"], "v.csv")));
    await waitFor(() =>
      expect(loadPairsFromTable).toHaveBeenCalledWith("dog;Hund"),
    );
    expect(result.current.sources.vocabulary).toBe("dog;Hund");
  });
});
