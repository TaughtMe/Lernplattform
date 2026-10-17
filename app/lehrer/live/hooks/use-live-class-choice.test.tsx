// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLiveClassChoice } from "./use-live-class-choice";

const store = vi.hoisted(() => ({
  list: vi.fn(),
  ensureSeal: vi.fn(),
  put: vi.fn(),
  profileGet: vi.fn(),
  profilePut: vi.fn(),
  notify: vi.fn(),
}));

vi.mock("../../../../src/storage/teacher-class-settings", () => ({
  createTeacherClassRepository: () => ({
    list: store.list,
    ensureSeal: store.ensureSeal,
    put: store.put,
  }),
  createTeacherProfileRepository: () => ({
    get: store.profileGet,
    put: store.profilePut,
  }),
}));
vi.mock("../../../../src/domain/class-seal", () => ({
  classSealFingerprint: async (publicKey: string) => `fp-${publicKey}`,
}));
vi.mock("../../../ui/shell/teacher-classes", () => ({
  notifyTeacherClassesChanged: store.notify,
}));

const CLASSES = [
  { id: "k5", name: "5a", seal: { publicKey: "key5" } },
  { id: "k6", name: "6b" },
];

function setup(clock = () => Date.UTC(2026, 9, 1)) {
  const setError = vi.fn();
  const setLibraryNotice = vi.fn();
  const hook = renderHook(() => {
    const choice = useLiveClassChoice({ clock, setError, setLibraryNotice });
    return { ...choice, ...choice.model, classChoice: choice.classChoice };
  });
  return { ...hook, setError, setLibraryNotice };
}

describe("useLiveClassChoice", () => {
  beforeEach(() => {
    for (const mock of Object.values(store)) mock.mockReset();
    store.list.mockResolvedValue(CLASSES);
    store.profileGet.mockResolvedValue({ displayName: "Frau Beispiel" });
    store.put.mockResolvedValue(undefined);
    store.profilePut.mockResolvedValue(undefined);
  });

  it("lädt die Klassen samt Abdruck und meldet, wenn sie da sind", async () => {
    const { result } = setup();
    expect(result.current.classesLoaded).toBe(false);
    await waitFor(() => expect(result.current.classesLoaded).toBe(true));
    expect(result.current.liveClasses).toEqual([
      { id: "k5", name: "5a", fingerprint: "fp-key5" },
      { id: "k6", name: "6b" },
    ]);
    expect(result.current.classChoice).toBe("");
    expect(result.current.classSeal).toBeUndefined();
  });

  it("wählt die zuletzt gewählte Klasse vor, wenn es sie noch gibt", async () => {
    store.profileGet.mockResolvedValue({ lastLiveClassId: "k5" });
    const { result } = setup();
    await waitFor(() => expect(result.current.classChoice).toBe("k5"));
    expect(result.current.classSeal).toBe("fp-key5");
  });

  it("ignoriert eine zuletzt gewählte Klasse, die es nicht mehr gibt", async () => {
    store.profileGet.mockResolvedValue({ lastLiveClassId: "weg" });
    const { result } = setup();
    await waitFor(() => expect(result.current.classesLoaded).toBe(true));
    expect(result.current.classChoice).toBe("");
  });

  it("meldet geladen, auch wenn die Ablage nicht lesbar ist", async () => {
    store.list.mockRejectedValue(new Error("kaputt"));
    const { result } = setup();
    await waitFor(() => expect(result.current.classesLoaded).toBe(true));
    expect(result.current.liveClasses).toEqual([]);
  });

  it("stempelt eine ältere Klasse beim Wählen und merkt sie sich", async () => {
    store.profileGet.mockResolvedValue({ displayName: "Frau Beispiel" });
    store.ensureSeal.mockResolvedValue({ publicKey: "key6" });
    const { result } = setup();
    await waitFor(() => expect(result.current.classesLoaded).toBe(true));
    await act(() => result.current.setClassChoice("k6"));
    expect(result.current.classChoice).toBe("k6");
    expect(result.current.classSeal).toBe("fp-key6");
    expect(store.profilePut).toHaveBeenCalledWith({
      displayName: "Frau Beispiel",
      lastLiveClassId: "k6",
    });
  });

  it("vergisst die Klasse bei „ohne“ und überspringt das Merken ohne Änderung", async () => {
    store.profileGet.mockResolvedValue({ lastLiveClassId: "k5" });
    const { result } = setup();
    await waitFor(() => expect(result.current.classChoice).toBe("k5"));
    await act(() => result.current.setClassChoice(""));
    expect(result.current.classChoice).toBe("");
    expect(store.profilePut).toHaveBeenCalledWith({
      lastLiveClassId: undefined,
    });
    store.profileGet.mockResolvedValue({});
    store.profilePut.mockClear();
    await act(() => result.current.setClassChoice(""));
    expect(store.profilePut).not.toHaveBeenCalled();
  });

  it("meldet, wenn der Stempel nicht erstellt werden kann, und wählt nichts", async () => {
    store.ensureSeal.mockRejectedValue(new Error("kein Schlüssel"));
    const { result, setError } = setup();
    await waitFor(() => expect(result.current.classesLoaded).toBe(true));
    await act(() => result.current.setClassChoice("k6"));
    expect(result.current.classChoice).toBe("");
    expect(setError).toHaveBeenCalledWith(
      "Für diese Klasse konnte kein Klassenstempel erstellt werden.",
    );
  });

  it("findet die Klasse nach der Wiederaufnahme über den Abdruck", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.classesLoaded).toBe(true));
    act(() => result.current.setRestoredClassSeal("fp-key5"));
    expect(result.current.classChoice).toBe("k5");
    expect(result.current.classSeal).toBe("fp-key5");
    store.ensureSeal.mockResolvedValue({ publicKey: "key6" });
    await act(() => result.current.setClassChoice("k6"));
    expect(result.current.classChoice).toBe("k6");
  });

  it("legt eine neue Klasse an, wählt sie und meldet es", async () => {
    store.ensureSeal.mockResolvedValue({ publicKey: "keyNeu" });
    const { result, setLibraryNotice } = setup();
    await waitFor(() => expect(result.current.classesLoaded).toBe(true));
    await act(() => result.current.createClassNamed("  7c  "));
    expect(store.put).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "7c",
        teacherName: "Frau Beispiel",
        schoolYear: "2026/27",
      }),
    );
    expect(result.current.liveClasses.map(({ name }) => name)).toContain("7c");
    expect(result.current.classChoice).toBe(store.put.mock.calls[0]![0].id);
    expect(store.notify).toHaveBeenCalledTimes(1);
    expect(setLibraryNotice).toHaveBeenCalledWith("Klasse „7c“ ist angelegt.");
  });

  it("legt ohne Namen nichts an und meldet einen Fehler beim Speichern", async () => {
    const { result, setLibraryNotice } = setup();
    await waitFor(() => expect(result.current.classesLoaded).toBe(true));
    await act(() => result.current.createClassNamed("   "));
    expect(store.put).not.toHaveBeenCalled();
    expect(setLibraryNotice).not.toHaveBeenCalled();
    store.put.mockRejectedValue(new Error("voll"));
    await act(() => result.current.createClassNamed("8d"));
    expect(setLibraryNotice).toHaveBeenCalledWith(
      "Die Klasse konnte nicht angelegt werden.",
    );
  });
});
