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

export interface KeyDef {
  base: string;
  shift?: string;
  finger: Finger;
  home?: boolean;
}

const numbers: KeyDef[] = [
  { base: "1", shift: "!", finger: "left-pinky" },
  { base: "2", shift: '"', finger: "left-ring" },
  { base: "3", shift: "§", finger: "left-middle" },
  { base: "4", shift: "$", finger: "left-index" },
  { base: "5", shift: "%", finger: "left-index" },
  { base: "6", shift: "&", finger: "right-index" },
  { base: "7", shift: "/", finger: "right-index" },
  { base: "8", shift: "(", finger: "right-middle" },
  { base: "9", shift: ")", finger: "right-ring" },
  { base: "0", shift: "=", finger: "right-pinky" },
  { base: "ß", shift: "?", finger: "right-pinky" },
];

const upper: KeyDef[] = [
  { base: "q", shift: "Q", finger: "left-pinky" },
  { base: "w", shift: "W", finger: "left-ring" },
  { base: "e", shift: "E", finger: "left-middle" },
  { base: "r", shift: "R", finger: "left-index" },
  { base: "t", shift: "T", finger: "left-index" },
  { base: "z", shift: "Z", finger: "right-index" },
  { base: "u", shift: "U", finger: "right-index" },
  { base: "i", shift: "I", finger: "right-middle" },
  { base: "o", shift: "O", finger: "right-ring" },
  { base: "p", shift: "P", finger: "right-pinky" },
  { base: "ü", shift: "Ü", finger: "right-pinky" },
];

const home: KeyDef[] = [
  { base: "a", shift: "A", finger: "left-pinky", home: true },
  { base: "s", shift: "S", finger: "left-ring", home: true },
  { base: "d", shift: "D", finger: "left-middle", home: true },
  { base: "f", shift: "F", finger: "left-index", home: true },
  { base: "g", shift: "G", finger: "left-index" },
  { base: "h", shift: "H", finger: "right-index" },
  { base: "j", shift: "J", finger: "right-index", home: true },
  { base: "k", shift: "K", finger: "right-middle", home: true },
  { base: "l", shift: "L", finger: "right-ring", home: true },
  { base: "ö", shift: "Ö", finger: "right-pinky", home: true },
  { base: "ä", shift: "Ä", finger: "right-pinky" },
];

const lower: KeyDef[] = [
  { base: "y", shift: "Y", finger: "left-pinky" },
  { base: "x", shift: "X", finger: "left-ring" },
  { base: "c", shift: "C", finger: "left-middle" },
  { base: "v", shift: "V", finger: "left-index" },
  { base: "b", shift: "B", finger: "left-index" },
  { base: "n", shift: "N", finger: "right-index" },
  { base: "m", shift: "M", finger: "right-index" },
  { base: ",", shift: ";", finger: "right-middle" },
  { base: ".", shift: ":", finger: "right-ring" },
  { base: "-", shift: "_", finger: "right-pinky" },
];

export const KEYBOARD_ROWS: KeyDef[][] = [
  numbers,
  upper,
  home,
  lower,
  [{ base: " ", finger: "thumb" }],
];

const characterLookup = new Map<string, { key: KeyDef; needsShift: boolean }>();
for (const key of KEYBOARD_ROWS.flat()) {
  characterLookup.set(key.base, { key, needsShift: false });
  if (key.shift) characterLookup.set(key.shift, { key, needsShift: true });
}

export function lookupTypingCharacter(char: string) {
  return characterLookup.get(char);
}

export function oppositeShiftHand(char: string): "left" | "right" | null {
  const info = lookupTypingCharacter(char);
  if (!info?.needsShift) return null;
  return info.key.finger.startsWith("left") ? "right" : "left";
}
