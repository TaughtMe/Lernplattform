export type LiveVocabularyOutcome = "known" | "practice" | "reset" | "unseen";
export type LiveVocabularyTransferChoice = "errors" | "all" | "none";

/** Was ein Kind in der Runde zu einem Vokabelwort getan hat (nur lokal). */
export type LiveWordTrace = {
  errors: number;
  usedHelp: boolean;
  answered: boolean;
  /** Mit Schreiberleichterung als „fast richtig“ angenommen, nie als sicher gewusst. */
  toleratedSpelling?: boolean;
};

/** Standard: ab 3 Fehlversuchen zurück in Box 1, mit Schreiberleichterung ab 5. */
export type PlacementRules = { resetAfterErrors: number };

export const DEFAULT_PLACEMENT_RULES: PlacementRules = { resetAfterErrors: 3 };
export const WRITING_RELIEF_PLACEMENT_RULES: PlacementRules = {
  resetAfterErrors: 5,
};

export function placementRulesFor(writingRelief: boolean): PlacementRules {
  return writingRelief
    ? WRITING_RELIEF_PLACEMENT_RULES
    : DEFAULT_PLACEMENT_RULES;
}

export function classifyLiveVocabulary(
  trace: LiveWordTrace,
  rules: PlacementRules,
): LiveVocabularyOutcome {
  if (!trace.answered && trace.errors === 0 && !trace.usedHelp) return "unseen";
  if (trace.usedHelp || trace.errors >= rules.resetAfterErrors) return "reset";
  if (trace.errors > 0 || trace.toleratedSpelling) return "practice";
  return "known";
}

export function shouldTransfer(
  outcome: LiveVocabularyOutcome,
  choice: LiveVocabularyTransferChoice,
): boolean {
  if (choice === "all") return true;
  if (choice === "none") return false;
  return outcome !== "known";
}
