export type Finger =
  | "left-pinky"
  | "left-ring"
  | "left-middle"
  | "left-index"
  | "right-index"
  | "right-middle"
  | "right-ring"
  | "right-pinky"
  | "thumb";

export type KeyKind = "character" | "modifier" | "system";

export interface KeyDef {
  id: string;
  code: string;
  label: string;
  base?: string;
  shift?: string;
  finger?: Finger;
  home?: boolean;
  width?: number;
  kind?: KeyKind;
}

function character(
  code: string,
  base: string,
  finger: Finger,
  options: Pick<KeyDef, "shift" | "home" | "width" | "label"> = {
    label: base,
  },
): KeyDef {
  const inferredShift =
    options.shift ??
    (base.toLocaleUpperCase("de-DE") !== base
      ? base.toLocaleUpperCase("de-DE")
      : undefined);
  return {
    id: code,
    code,
    base,
    finger,
    kind: "character",
    label: options.label ?? base,
    ...(inferredShift === undefined ? {} : { shift: inferredShift }),
    ...(options.home === undefined ? {} : { home: options.home }),
    ...(options.width === undefined ? {} : { width: options.width }),
  };
}

function control(
  code: string,
  label: string,
  width: number,
  kind: KeyKind = "modifier",
): KeyDef {
  return { id: code, code, label, width, kind };
}

const numberRow: KeyDef[] = [
  character("Backquote", "^", "left-pinky", { label: "^", shift: "°" }),
  character("Digit1", "1", "left-pinky", { label: "1", shift: "!" }),
  character("Digit2", "2", "left-ring", { label: "2", shift: '"' }),
  character("Digit3", "3", "left-middle", { label: "3", shift: "§" }),
  character("Digit4", "4", "left-index", { label: "4", shift: "$" }),
  character("Digit5", "5", "left-index", { label: "5", shift: "%" }),
  character("Digit6", "6", "right-index", { label: "6", shift: "&" }),
  character("Digit7", "7", "right-index", { label: "7", shift: "/" }),
  character("Digit8", "8", "right-middle", { label: "8", shift: "(" }),
  character("Digit9", "9", "right-ring", { label: "9", shift: ")" }),
  character("Digit0", "0", "right-pinky", { label: "0", shift: "=" }),
  character("Minus", "ß", "right-pinky", { label: "ß", shift: "?" }),
  character("Equal", "´", "right-pinky", { label: "´", shift: "`" }),
  control("Backspace", "Rück", 2.1, "system"),
];

const upperRow: KeyDef[] = [
  control("Tab", "Tab", 1.55, "system"),
  character("KeyQ", "q", "left-pinky"),
  character("KeyW", "w", "left-ring"),
  character("KeyE", "e", "left-middle"),
  character("KeyR", "r", "left-index"),
  character("KeyT", "t", "left-index"),
  character("KeyZ", "z", "right-index"),
  character("KeyU", "u", "right-index"),
  character("KeyI", "i", "right-middle"),
  character("KeyO", "o", "right-ring"),
  character("KeyP", "p", "right-pinky"),
  character("BracketLeft", "ü", "right-pinky"),
  character("BracketRight", "+", "right-pinky", { label: "+", shift: "*" }),
  control("Enter", "Enter", 1.55, "system"),
];

const homeRow: KeyDef[] = [
  control("CapsLock", "Feststell", 1.85, "system"),
  character("KeyA", "a", "left-pinky"),
  character("KeyS", "s", "left-ring"),
  character("KeyD", "d", "left-middle"),
  character("KeyF", "f", "left-index", { label: "f", home: true }),
  character("KeyG", "g", "left-index"),
  character("KeyH", "h", "right-index"),
  character("KeyJ", "j", "right-index", { label: "j", home: true }),
  character("KeyK", "k", "right-middle"),
  character("KeyL", "l", "right-ring"),
  character("Semicolon", "ö", "right-pinky"),
  character("Quote", "ä", "right-pinky"),
  character("Backslash", "#", "right-pinky", { label: "#", shift: "'" }),
  control("EnterLower", "↵", 1.25, "system"),
];

const lowerRow: KeyDef[] = [
  control("ShiftLeft", "Shift", 1.35),
  character("IntlBackslash", "<", "left-pinky", { label: "<", shift: ">" }),
  character("KeyY", "y", "left-pinky"),
  character("KeyX", "x", "left-ring"),
  character("KeyC", "c", "left-middle"),
  character("KeyV", "v", "left-index"),
  character("KeyB", "b", "left-index"),
  character("KeyN", "n", "right-index"),
  character("KeyM", "m", "right-index"),
  character("Comma", ",", "right-middle", { label: ",", shift: ";" }),
  character("Period", ".", "right-ring", { label: ".", shift: ":" }),
  character("Slash", "-", "right-pinky", { label: "-", shift: "_" }),
  control("ShiftRight", "Shift", 2.8),
];

const bottomRow: KeyDef[] = [
  control("ControlLeft", "Strg", 1.35),
  control("MetaLeft", "◇", 1.15, "system"),
  control("AltLeft", "Alt", 1.2),
  character("Space", " ", "thumb", { label: "Leertaste", width: 6.6 }),
  control("AltRight", "Alt Gr", 1.3),
  control("MetaRight", "◇", 1.15, "system"),
  control("ContextMenu", "Menü", 1.2, "system"),
  control("ControlRight", "Strg", 1.35),
];

/** Vollständiger deutscher ISO-Hauptblock. Nicht benötigte Tasten bleiben im UI ruhig. */
export const KEYBOARD_ROWS: KeyDef[][] = [
  numberRow,
  upperRow,
  homeRow,
  lowerRow,
  bottomRow,
];

const characterLookup = new Map<string, { key: KeyDef; needsShift: boolean }>();
for (const key of KEYBOARD_ROWS.flat()) {
  if (key.base === undefined) continue;
  characterLookup.set(key.base, { key, needsShift: false });
  if (key.shift) characterLookup.set(key.shift, { key, needsShift: true });
}

export function lookupTypingCharacter(char: string) {
  return characterLookup.get(char);
}

export function oppositeShiftHand(char: string): "left" | "right" | null {
  const info = lookupTypingCharacter(char);
  if (!info?.needsShift || !info.key.finger) return null;
  return info.key.finger.startsWith("left") ? "right" : "left";
}
