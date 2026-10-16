// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TeacherContentMode } from "../../../../src/integrations/laufdiktat/teacher-session";
import { useVocabularyContent } from "./use-vocabulary-content";

const profile = vi.hoisted(() => ({
  get: vi.fn<() => Promise<{ lernboxTag?: string } | undefined>>(),
}));
vi.mock("../../../../src/storage/teacher-class-settings", () => ({
  createTeacherProfileRepository: () => ({ get: profile.get }),
}));

function setup() {
  return renderHook(() => {
    const [sources, setSources] = useState<Record<TeacherContentMode, string>>({
      text: "",
      vocabulary: "",
      math: "",
    });
    return { ...useVocabularyContent({ setSources }), sources };
  });
}

describe("useVocabularyContent", () => {
  beforeEach(() => {
    profile.get.mockReset();
    profile.get.mockResolvedValue(undefined);
  });

  it("startet mit einem leeren Paar und ohne Übernahme", () => {
    const { result } = setup();
    expect(result.current.vocabularyPairs).toHaveLength(1);
    expect(result.current.vocabularyPairs[0]?.left.primary).toBe("");
    expect(result.current.direction).toBe("left-to-right");
    expect(result.current.vocabularyTransfer).toBe("none");
  });

  it("schreibt jede Änderung der Paare als Quelltext zurück", () => {
    const { result } = setup();
    const id = result.current.vocabularyPairs[0]!.id;
    act(() =>
      result.current.updateVocabularyPair(id, "left", { primary: "dog" }),
    );
    act(() =>
      result.current.updateVocabularyPair(id, "right", {
        primary: "Hund",
        alternatives: ["Rüde"],
      }),
    );
    expect(result.current.sources.vocabulary).toBe("dog;Hund|Rüde");
    act(() => result.current.updateVocabularyTag(id, "Tiere"));
    expect(result.current.sources.vocabulary).toBe("dog;Hund|Rüde;Tiere");
    act(() => result.current.updateVocabularyTag(id, "  "));
    expect(result.current.sources.vocabulary).toBe("dog;Hund|Rüde");
    expect(result.current.vocabularyPairs[0]).not.toHaveProperty("tag");
  });

  it("fügt Paare hinzu und lässt nach dem Entfernen ein leeres stehen", () => {
    const { result } = setup();
    act(() => result.current.addVocabularyPair());
    expect(result.current.vocabularyPairs).toHaveLength(2);
    for (const pair of result.current.vocabularyPairs) {
      act(() => result.current.removeVocabularyPair(pair.id));
    }
    expect(result.current.vocabularyPairs).toHaveLength(1);
    expect(result.current.vocabularyPairs[0]?.left.primary).toBe("");
    expect(result.current.sources.vocabulary).toBe(";");
  });

  it("übernimmt eine Tabelle mit neuen Kennungen und leert das Feld", () => {
    const { result } = setup();
    act(() => result.current.setVocabularyTableInput("cat;Katze\nbird;Vogel"));
    act(() => result.current.importVocabularyTable());
    expect(result.current.vocabularyPairs).toHaveLength(2);
    expect(result.current.sources.vocabulary).toBe("cat;Katze\nbird;Vogel");
    expect(result.current.vocabularyTableInput).toBe("");
  });

  it("lässt bei einer leeren Tabelle alles stehen", () => {
    const { result } = setup();
    act(() => result.current.setVocabularyTableInput("   "));
    act(() => result.current.importVocabularyTable());
    expect(result.current.sources.vocabulary).toBe("");
    expect(result.current.vocabularyTableInput).toBe("   ");
  });

  it("lädt Paare aus einer Tabelle, ohne die Quelle zu ändern", () => {
    const { result } = setup();
    act(() => result.current.loadPairsFromTable("a;b"));
    expect(result.current.vocabularyPairs).toHaveLength(1);
    expect(result.current.vocabularyPairs[0]?.left.primary).toBe("a");
    expect(result.current.sources.vocabulary).toBe("");
    act(() => result.current.loadPairsFromTable(""));
    expect(result.current.vocabularyPairs).toHaveLength(1);
    expect(result.current.vocabularyPairs[0]?.left.primary).toBe("");
  });

  it("nimmt den Tag der Runde vor dem Standard-Tag aus dem Profil", async () => {
    profile.get.mockResolvedValue({ lernboxTag: "Standard" });
    const { result } = setup();
    await waitFor(() => expect(result.current.lernboxTag).toBe("Standard"));
    expect(result.current.vocabularyTag).toBe("Standard");
    act(() => result.current.setRoundTag(" Runde "));
    expect(result.current.vocabularyTag).toBe("Runde");
    act(() => result.current.setRoundTag("   "));
    expect(result.current.vocabularyTag).toBe("Standard");
  });

  it("übersteht ein Profil, das sich nicht lesen lässt", async () => {
    profile.get.mockRejectedValue(new Error("kaputt"));
    const { result } = setup();
    await waitFor(() => expect(profile.get).toHaveBeenCalled());
    expect(result.current.lernboxTag).toBe("");
  });
});
