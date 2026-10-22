import { describe, expect, it, vi } from "vitest";
import {
  BROWSER_LEARNING_KEY,
  readBrowserLearningChoice,
  requestPersistentStorage,
  writeBrowserLearningChoice,
} from "./storage-protection";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
  };
}

describe("Entscheidung „trotzdem im Browser lernen“", () => {
  it("merkt sich die Entscheidung", () => {
    const storage = memoryStorage();
    expect(readBrowserLearningChoice(() => storage)).toBe(false);
    expect(writeBrowserLearningChoice(() => storage)).toBe(true);
    expect(storage.values.get(BROWSER_LEARNING_KEY)).toBe("1");
    expect(readBrowserLearningChoice(() => storage)).toBe(true);
  });

  it("übersteht einen gesperrten Speicher", () => {
    const blocked = () => {
      throw new DOMException("gesperrt", "SecurityError");
    };
    expect(readBrowserLearningChoice(blocked)).toBe(false);
    expect(writeBrowserLearningChoice(blocked)).toBe(false);
  });
});

describe("requestPersistentStorage", () => {
  it("bittet still um dauerhaften Speicher", async () => {
    const persist = vi.fn().mockResolvedValue(true);
    await requestPersistentStorage({
      storage: { persist, persisted: vi.fn().mockResolvedValue(false) },
      userAgent: "Mozilla/5.0 (iPad; CPU OS 17_0)",
    });
    expect(persist).toHaveBeenCalledOnce();
  });

  it("fragt nicht erneut, wenn der Speicher schon dauerhaft ist", async () => {
    const persist = vi.fn();
    await requestPersistentStorage({
      storage: { persist, persisted: vi.fn().mockResolvedValue(true) },
    });
    expect(persist).not.toHaveBeenCalled();
  });

  it("überspringt Firefox, der dafür einen eigenen Dialog zeigt", async () => {
    const persist = vi.fn();
    await requestPersistentStorage({
      storage: { persist, persisted: vi.fn().mockResolvedValue(false) },
      userAgent:
        "Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0",
    });
    expect(persist).not.toHaveBeenCalled();
  });

  it("verträgt fehlende Schnittstelle und Fehler", async () => {
    await expect(requestPersistentStorage({})).resolves.toBeUndefined();
    await expect(
      requestPersistentStorage({
        storage: {
          persist: vi.fn().mockRejectedValue(new Error("nein")),
          persisted: vi.fn().mockResolvedValue(false),
        },
      }),
    ).resolves.toBeUndefined();
  });
});
