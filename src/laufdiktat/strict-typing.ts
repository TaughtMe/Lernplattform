// Strict typing mode: student answers should come from actual typing only.
// Paste/autocorrect/word suggestions are discouraged. Pure, testable decision
// functions — wiring (preventDefault etc.) happens directly on the <input>.

/** input attributes for strict mode (off, so the browser suggests/replaces as little as possible). */
export const STRICT_INPUT_ATTRS = {
  autoComplete: "off",
  autoCorrect: "off",
  autoCapitalize: "none",
  spellCheck: false,
} as const;

// beforeinput event types blocked in strict mode: pasting from clipboard/
// drag&drop/middle-mouse ("X11 yank") and autocorrect replacements. Normal
// typing (insertText) stays allowed.
const BLOCKED_INPUT_TYPES = new Set(["insertReplacementText", "insertFromPaste", "insertFromDrop", "insertFromYank"]);

export function isBlockedInputType(inputType: string | null | undefined): boolean {
  return !!inputType && BLOCKED_INPUT_TYPES.has(inputType);
}

/**
 * Fallback for when onPaste/onDrop/onBeforeInput were bypassed (some mobile
 * keyboards, password/form autofill): true if the field grew by more than one
 * character in one step — normal typing (including umlauts/spaces/
 * punctuation, one character per keystroke) always yields `false`.
 */
export function isSuspiciousBulkInsert(prevValue: string, nextValue: string): boolean {
  return nextValue.length - prevValue.length > 1;
}

/** Math answers in strict mode: digits, minus, comma, dot only. */
export function sanitizeMathInput(value: string): string {
  return value.replace(/[^0-9,.-]/g, "");
}
