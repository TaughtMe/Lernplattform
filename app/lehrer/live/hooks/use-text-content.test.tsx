// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReleaseProvider } from "../../../release/release-context";
import { DEFAULT_TEXT_SPLIT_CONFIG } from "../../../../src/domain/running-dictation-sections";
import {
  resolveStages,
  resolveVisibility,
} from "../../../../src/domain/release";
import { useTextContent } from "./use-text-content";

const TEXT = "Der Hund bellt. Die Katze miaut. Der Vogel singt.";

function setup(textSource = TEXT, source = textSource) {
  return renderHook(
    (props: { textSource: string; source: string }) => useTextContent(props),
    { initialProps: { textSource, source } },
  );
}

afterEach(() => vi.restoreAllMocks());

describe("useTextContent", () => {
  it("teilt den Text nach Satzzeichen in Abschnitte", () => {
    const { result } = setup();
    expect(
      result.current.displayedTextSections.map(({ text }) => text),
    ).toEqual(["Der Hund bellt.", "Die Katze miaut.", "Der Vogel singt."]);
    expect(result.current.orderedTextSections).toHaveLength(3);
  });

  it("schaltet Trennzeichen um und fügt eigene Trenner hinzu und weg", () => {
    const { result } = setup();
    act(() => result.current.togglePunctuation("."));
    expect(result.current.splitConfig.punctuation).not.toContain(".");
    act(() => result.current.togglePunctuation("."));
    expect(result.current.splitConfig.punctuation).toContain(".");
    act(() => result.current.addCustomDelimiter());
    expect(result.current.splitConfig.customDelimiters).toEqual(
      DEFAULT_TEXT_SPLIT_CONFIG.customDelimiters,
    );
    act(() => result.current.setCustomDelimiter("|"));
    act(() => result.current.addCustomDelimiter());
    const added = result.current.splitConfig.customDelimiters.at(-1);
    expect(added?.value).toBe("|");
    expect(result.current.customDelimiter).toBe("");
    act(() => result.current.removeCustomDelimiter(added!.id));
    expect(result.current.splitConfig.customDelimiters).toEqual(
      DEFAULT_TEXT_SPLIT_CONFIG.customDelimiters,
    );
  });

  it("schließt Abschnitte aus und ordnet sie um", () => {
    const { result } = setup();
    const [first, second, third] = result.current.displayedTextSections;
    act(() => result.current.toggleSectionExcluded(second!.id));
    expect(result.current.excludedSectionIds).toEqual([second!.id]);
    expect(result.current.orderedTextSections.map(({ id }) => id)).toEqual([
      first!.id,
      third!.id,
    ]);
    act(() => result.current.toggleSectionExcluded(second!.id));
    expect(result.current.excludedSectionIds).toEqual([]);
    act(() => result.current.moveSection(0, 2));
    expect(result.current.displayedTextSections.map(({ id }) => id)).toEqual([
      second!.id,
      third!.id,
      first!.id,
    ]);
  });

  it("legt über Antippen zweier Wörter einen eigenen Abschnitt an", () => {
    vi.spyOn(window, "getSelection").mockReturnValue({
      isCollapsed: true,
    } as Selection);
    const { result } = setup("Eins zwei drei.");
    expect(result.current.markerPieces.length).toBeGreaterThan(0);
    act(() =>
      result.current.handleMarkerWordTap({
        start: 0,
        end: 4,
        text: "Eins",
      } as never),
    );
    expect(result.current.markerAnchor).toEqual({ start: 0, end: 4 });
    act(() =>
      result.current.handleMarkerWordTap({
        start: 10,
        end: 14,
        text: "drei",
      } as never),
    );
    expect(result.current.markerAnchor).toBeNull();
    // Das Satzzeichen hinter dem zweiten Wort gehört mit in den Abschnitt.
    expect(result.current.manualRanges).toMatchObject([
      { type: "section", start: 0, end: 15 },
    ]);
  });

  it("ignoriert das Antippen, solange Text markiert ist", () => {
    vi.spyOn(window, "getSelection").mockReturnValue({
      isCollapsed: false,
    } as Selection);
    const { result } = setup("Eins zwei drei.");
    act(() =>
      result.current.handleMarkerWordTap({
        start: 0,
        end: 4,
        text: "Eins",
      } as never),
    );
    expect(result.current.markerAnchor).toBeNull();
  });

  it("entfernt eigene Abschnitte, die sich überlappen, und leert sie alle", () => {
    vi.spyOn(window, "getSelection").mockReturnValue({
      isCollapsed: true,
    } as Selection);
    const { result } = setup("Eins zwei drei vier.");
    const tap = (start: number, end: number) =>
      act(() =>
        result.current.handleMarkerWordTap({ start, end, text: "" } as never),
      );
    tap(0, 4);
    tap(5, 9);
    expect(result.current.manualRanges).toHaveLength(1);
    act(() => result.current.removeManualSection({ start: 0, end: 9 }));
    expect(result.current.manualRanges).toEqual([]);
    tap(0, 4);
    tap(10, 14);
    act(() => result.current.clearManualRanges());
    expect(result.current.manualRanges).toEqual([]);
  });

  it("schaltet den Markierungsmodus um und verwirft den Anker", () => {
    const { result } = setup();
    act(() => result.current.toggleMarkerMode());
    expect(result.current.markerMode).toBe(true);
    act(() => result.current.toggleMarkerMode());
    expect(result.current.markerMode).toBe(false);
  });

  it("setzt beim Laden eines Textes Trenner zurück und leert die Bearbeitung", () => {
    const { result } = setup();
    const [first] = result.current.displayedTextSections;
    act(() => result.current.toggleSectionExcluded(first!.id));
    act(() => result.current.moveSection(0, 1));
    const config = { ...DEFAULT_TEXT_SPLIT_CONFIG, punctuation: ["!"] };
    act(() => result.current.resetTextLayout(config));
    expect(result.current.splitConfig).toBe(config);
    expect(result.current.manualRanges).toEqual([]);
    expect(result.current.excludedSectionIds).toEqual([]);
    expect(result.current.sectionOrder).toEqual([]);
  });

  it("übernimmt Wörter nur in den Wortspeicher, wenn der Bereich sichtbar ist", () => {
    const visible = resolveVisibility(resolveStages(undefined), false);
    const { result } = renderHook(
      () => useTextContent({ textSource: TEXT, source: TEXT }),
      {
        wrapper: ({ children }) => (
          <ReleaseProvider value={{ ...visible, wortspeicher: false }}>
            {children}
          </ReleaseProvider>
        ),
      },
    );
    expect(result.current.wordStoreVisible).toBe(false);
    expect(result.current.wordStoreChoice).toBe("errors");
    expect(result.current.wordStoreTransfer).toBe("none");
    const shown = setup();
    expect(shown.result.current.wordStoreVisible).toBe(true);
    expect(shown.result.current.wordStoreTransfer).toBe("errors");
  });
});
