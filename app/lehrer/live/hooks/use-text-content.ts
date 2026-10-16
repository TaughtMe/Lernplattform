"use client";

import { useMemo, useRef, useState } from "react";
import {
  applyRunningDictationSectionEdits,
  buildMarkerPieces,
  buildRunningDictationSections,
  DEFAULT_TEXT_SPLIT_CONFIG,
  displayRunningDictationSections,
  type ManualRange,
  type MarkerToken,
  moveRunningDictationSection,
  type TextSplitConfig,
} from "../../../../src/domain/running-dictation-sections";
import type { WordStoreTransferChoice } from "../../../../src/integrations/laufdiktat/live-session";
import { useAreaVisible } from "../../../release/release-context";

type TextContentInput = {
  /** Der Text selbst (`sources.text`), aus dem die Abschnitte entstehen. */
  textSource: string;
  /** Quelltext des gerade gewählten Inhalts, auf dem die Markierung arbeitet. */
  source: string;
};

/**
 * Text-Inhalt: Abschnitte (Trenner, Markierungen, Reihenfolge, Ausschlüsse),
 * Markierungsmodus und die Übernahme der Wörter in den Wortspeicher.
 */
export function useTextContent({ textSource, source }: TextContentInput) {
  const [markerMode, setMarkerMode] = useState(false);
  const [markerAnchor, setMarkerAnchor] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const [splitConfig, setSplitConfig] = useState<TextSplitConfig>(
    DEFAULT_TEXT_SPLIT_CONFIG,
  );
  const [manualRanges, setManualRanges] = useState<ManualRange[]>([]);
  const [excludedSectionIds, setExcludedSectionIds] = useState<string[]>([]);
  const [sectionOrder, setSectionOrder] = useState<string[]>([]);
  const [customDelimiter, setCustomDelimiter] = useState("");
  // Text-Laufdiktat: Wörter in den Wortspeicher der Kinder (Standard: falsch
  // geschriebene). Ohne sichtbaren Bereich bekommt die Sitzung „none“.
  const wordStoreVisible = useAreaVisible("wortspeicher");
  const [wordStoreChoice, setWordStoreTransfer] =
    useState<WordStoreTransferChoice>("errors");
  const wordStoreTransfer: WordStoreTransferChoice = wordStoreVisible
    ? wordStoreChoice
    : "none";
  const sourceRef = useRef<HTMLTextAreaElement>(null);
  const markerContainerRef = useRef<HTMLDivElement>(null);

  const textSections = useMemo(
    () => buildRunningDictationSections(textSource, splitConfig, manualRanges),
    [manualRanges, textSource, splitConfig],
  );
  const orderedTextSections = useMemo(
    () =>
      applyRunningDictationSectionEdits(
        textSections,
        excludedSectionIds,
        sectionOrder,
      ),
    [excludedSectionIds, sectionOrder, textSections],
  );
  const displayedTextSections = useMemo(
    () => displayRunningDictationSections(textSections, sectionOrder),
    [sectionOrder, textSections],
  );
  const markerPieces = useMemo(
    () => buildMarkerPieces(source, textSections),
    [source, textSections],
  );

  /** Geladener Text: Trenner übernehmen, Markierungen, Ausschlüsse und Reihenfolge leeren. */
  function resetTextLayout(nextSplitConfig: TextSplitConfig) {
    setSplitConfig(nextSplitConfig);
    setManualRanges([]);
    setExcludedSectionIds([]);
    setSectionOrder([]);
  }

  // A new manual range replaces any manual range it overlaps, rather than
  // stacking on top of it.
  function addManualSection(start: number, end: number) {
    setManualRanges((current) => [
      ...current.filter(
        (range) => Math.max(start, range.start) >= Math.min(end, range.end),
      ),
      { id: crypto.randomUUID(), type: "section", start, end },
    ]);
  }

  function removeManualSection(section: { start: number; end: number }) {
    setManualRanges((current) =>
      current.filter(
        (range) =>
          Math.max(section.start, range.start) >=
          Math.min(section.end, range.end),
      ),
    );
  }

  // First tapped word = anchor; second word (start or end, either order)
  // closes the range into a new manual section. Trailing punctuation right
  // after the second word is pulled in too, so it doesn't end up as its own
  // tiny leftover section.
  function handleMarkerWordTap(token: MarkerToken) {
    if (!window.getSelection()?.isCollapsed) return;
    if (!markerAnchor) {
      setMarkerAnchor({ start: token.start, end: token.end });
      return;
    }
    const start = Math.min(markerAnchor.start, token.start);
    let end = Math.max(markerAnchor.end, token.end);
    while (end < source.length && /[^\s\p{L}\p{N}]/u.test(source[end] ?? "")) {
      end += 1;
    }
    setMarkerAnchor(null);
    addManualSection(start, end);
  }

  // Desktop alternative to word-tapping: drag-select a range with the mouse.
  function handleMarkerMouseUp() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return;
    }
    const range = selection.getRangeAt(0);
    const container = markerContainerRef.current;
    if (!container || !container.contains(range.commonAncestorContainer)) {
      return;
    }
    const preSelection = range.cloneRange();
    preSelection.selectNodeContents(container);
    preSelection.setEnd(range.startContainer, range.startOffset);
    let start = preSelection.toString().length;
    let end = start + range.toString().length;

    const selected = source.slice(start, end);
    start += selected.length - selected.trimStart().length;
    end -= selected.length - selected.trimEnd().length;

    selection.removeAllRanges();
    setMarkerAnchor(null);
    if (start < end) addManualSection(start, end);
  }

  function togglePunctuation(character: string) {
    setSplitConfig((current) => ({
      ...current,
      punctuation: current.punctuation.includes(character)
        ? current.punctuation.filter((item) => item !== character)
        : [...current.punctuation, character],
    }));
  }

  function addCustomDelimiter() {
    if (!customDelimiter) return;
    const value = customDelimiter;
    setSplitConfig((current) => ({
      ...current,
      customDelimiters: [
        ...current.customDelimiters,
        { id: crypto.randomUUID(), value },
      ],
    }));
    setCustomDelimiter("");
  }

  function removeCustomDelimiter(id: string) {
    setSplitConfig((current) => ({
      ...current,
      customDelimiters: current.customDelimiters.filter(
        (delimiter) => delimiter.id !== id,
      ),
    }));
  }

  /** Markierung im Textfeld als eigenen Abschnitt übernehmen. */
  function markSelectionAsSection() {
    const control = sourceRef.current;
    if (!control || control.selectionEnd <= control.selectionStart) return;
    setManualRanges((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        type: "section",
        start: control.selectionStart,
        end: control.selectionEnd,
      },
    ]);
  }

  /** An der Cursorposition einen Abschnitt beginnen. */
  function splitAtCursor() {
    const position = sourceRef.current?.selectionStart ?? 0;
    setManualRanges((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        type: "split",
        start: position,
        end: position,
      },
    ]);
  }

  function toggleMarkerMode() {
    setMarkerAnchor(null);
    setMarkerMode((current) => !current);
  }

  function toggleSectionExcluded(id: string) {
    setExcludedSectionIds((current) =>
      current.includes(id)
        ? current.filter((entry) => entry !== id)
        : [...current, id],
    );
  }

  function moveSection(from: number, to: number) {
    setSectionOrder(
      moveRunningDictationSection(
        displayedTextSections.map(({ id }) => id),
        from,
        to,
      ),
    );
  }

  function clearManualRanges() {
    setManualRanges([]);
  }

  return {
    markerMode,
    markerAnchor,
    splitConfig,
    setSplitConfig,
    manualRanges,
    excludedSectionIds,
    sectionOrder,
    customDelimiter,
    setCustomDelimiter,
    wordStoreVisible,
    wordStoreChoice,
    setWordStoreTransfer,
    wordStoreTransfer,
    sourceRef,
    markerContainerRef,
    orderedTextSections,
    displayedTextSections,
    markerPieces,
    resetTextLayout,
    removeManualSection,
    handleMarkerWordTap,
    handleMarkerMouseUp,
    togglePunctuation,
    addCustomDelimiter,
    removeCustomDelimiter,
    markSelectionAsSection,
    splitAtCursor,
    toggleMarkerMode,
    toggleSectionExcluded,
    moveSection,
    clearManualRanges,
  };
}
