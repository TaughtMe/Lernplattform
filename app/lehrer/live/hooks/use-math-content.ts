"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  evaluateMentalMathExpression,
  insertAtSelection,
  normalizeMathChainInput,
  splitMathLines,
} from "../../../../src/domain/mental-math";
import {
  buildMathWords,
  generateMentalMathSource,
  generateSingleMathLine,
  type TeacherContentMode,
  type TeacherMathSettings,
} from "../../../../src/integrations/laufdiktat/teacher-session";
import type { GameSettings } from "./use-game-settings";

const MATH_RULE_ERROR =
  "Keine passenden Aufgaben. Bitte ändere den Zahlenraum oder die Regeln.";

type MathContentInput = {
  /** Aufgaben als Text, eine pro Zeile (`sources.math`). */
  mathSource: string;
  contentMode: TeacherContentMode;
  settings: Pick<
    GameSettings,
    | "mathCount"
    | "mathMin"
    | "mathMax"
    | "mathOps"
    | "mathAllowNegative"
    | "mathExcludeZeroOperand"
    | "mathExcludeZeroResult"
    | "mathTables"
    | "mathGap"
  >;
  setSources: Dispatch<SetStateAction<Record<TeacherContentMode, string>>>;
  setError: (message: string) => void;
};

/** Kopfrechnen-Inhalt: Aufgabenzeilen, Bearbeiten einer Zeile, Lücken, Würfeln. */
export function useMathContent({
  mathSource,
  contentMode,
  settings,
  setSources,
  setError,
}: MathContentInput) {
  const {
    mathCount,
    mathMin,
    mathMax,
    mathOps,
    mathAllowNegative,
    mathExcludeZeroOperand,
    mathExcludeZeroResult,
    mathTables,
    mathGap,
  } = settings;
  const [mathSettingsOpen, setMathSettingsOpen] = useState(false);
  const [mathEditIndex, setMathEditIndex] = useState<number | null>(null);
  const [mathDraft, setMathDraft] = useState("");
  // Gap numeral index per math line (0..N-1 = that numeral in the
  // expression, N = the result), kept separate from the line's text
  // (mirrors Laufdiktat's useMathImport hook) so editing/rerolling a task's
  // numbers never has to parse a gap marker back out of the stored string.
  const [mathGaps, setMathGaps] = useState<number[]>([]);
  const mathEditInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (mathEditIndex !== null) mathEditInputRef.current?.focus();
  }, [mathEditIndex]);

  const mathLines = useMemo(() => splitMathLines(mathSource), [mathSource]);

  const mathWords = useMemo(
    () =>
      contentMode === "math"
        ? buildMathWords(mathLines, mathGap, mathGaps)
        : [],
    [contentMode, mathLines, mathGap, mathGaps],
  );

  const mathSettings: TeacherMathSettings = {
    min: mathMin,
    max: mathMax,
    operations: mathOps,
    allowNegativeResults: mathAllowNegative,
    excludeZeroOperand: mathExcludeZeroOperand,
    excludeZeroResult: mathExcludeZeroResult,
    tables: mathTables,
    gap: mathGap,
  };

  function generateSingleLine() {
    return generateSingleMathLine(mathSettings);
  }

  function commitMathLines(lines: string[]) {
    setSources((current) => ({ ...current, math: lines.join("\n") }));
  }

  function startEditMathRow(index: number) {
    setMathEditIndex(index);
    setMathDraft(mathLines[index] ?? "");
  }

  function setMathLineGap(index: number, gapIndex: number) {
    setMathGaps((current) => {
      const next = [...current];
      next[index] = gapIndex;
      return next;
    });
  }

  function insertAtMathCursor(token: string, cursorOffset: number) {
    const el = mathEditInputRef.current;
    const start = el?.selectionStart ?? mathDraft.length;
    const end = el?.selectionEnd ?? start;
    const { text, cursor: pos } = insertAtSelection(
      mathDraft,
      token,
      start,
      end,
      cursorOffset,
    );
    setMathDraft(text);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(pos, pos);
    });
  }

  // Live "= result" (or "ungültig") feedback shown next to the math edit
  // field while typing, before the value is committed.
  const mathDraftResult = mathDraft.trim()
    ? evaluateMentalMathExpression(mathDraft)
    : null;

  function commitMathEdit(continueEditing: boolean) {
    if (mathEditIndex === null) return;
    const editIndex = mathEditIndex;
    const wasAppending = editIndex >= mathLines.length;
    const lines = [...mathLines];
    // Re-space "6+4-2" into "6 + 4 - 2" so the teacher never has to type
    // (or read back) the spaces themselves; falls back to the raw input
    // for anything that isn't a plain chain (e.g. \frac/\sqrt).
    const value = normalizeMathChainInput(mathDraft) ?? mathDraft.trim();
    if (wasAppending) {
      if (value) lines.push(value);
    } else if (value) {
      lines[editIndex] = value;
    } else {
      lines.splice(editIndex, 1);
      setMathGaps((current) => {
        const next = [...current];
        next.splice(editIndex, 1);
        return next;
      });
    }
    commitMathLines(lines);
    setMathDraft("");
    setMathEditIndex(
      continueEditing && wasAppending && value ? lines.length : null,
    );
  }

  function generateMathTasks() {
    try {
      const math = generateMentalMathSource({
        count: mathCount,
        min: mathMin,
        max: mathMax,
        operations: mathOps,
        allowNegativeResults: mathAllowNegative,
        excludeZeroOperand: mathExcludeZeroOperand,
        excludeZeroResult: mathExcludeZeroResult,
        multiplicationTables: mathTables,
      });
      setSources((current) => ({ ...current, math }));
      setMathGaps([]);
      setError("");
    } catch {
      setError(MATH_RULE_ERROR);
    }
  }

  function rerollMathLine(index: number) {
    const lines = [...mathLines];
    try {
      lines[index] = generateSingleLine();
    } catch {
      setError(MATH_RULE_ERROR);
      return;
    }
    commitMathLines(lines);
  }

  function deleteMathLine(index: number) {
    const lines = [...mathLines];
    lines.splice(index, 1);
    commitMathLines(lines);
    setMathGaps((current) => {
      const next = [...current];
      next.splice(index, 1);
      return next;
    });
    if (mathEditIndex !== null) setMathEditIndex(null);
  }

  function startAppendMathLine() {
    setMathEditIndex(mathLines.length);
    setMathDraft("");
  }

  function cancelMathEdit() {
    setMathDraft("");
    setMathEditIndex(null);
  }

  return {
    mathSettingsOpen,
    setMathSettingsOpen,
    mathEditIndex,
    setMathEditIndex,
    mathDraft,
    setMathDraft,
    mathGaps,
    mathEditInputRef,
    mathLines,
    mathWords,
    mathDraftResult,
    startEditMathRow,
    setMathLineGap,
    insertAtMathCursor,
    commitMathEdit,
    generateMathTasks,
    rerollMathLine,
    deleteMathLine,
    startAppendMathLine,
    cancelMathEdit,
  };
}
