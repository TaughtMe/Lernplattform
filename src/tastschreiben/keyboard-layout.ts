/**
 * Deutsche QWERTZ-Tastatur, Zehnfinger-System. Jede Taste kennt ihren
 * Grundzeichen-/Shift-Wert und den Finger, der sie laut Lehrplan bedienen
 * soll — Grundlage für die farbigen Fingerzonen der Bildschirmtastatur und
 * für die Zuordnung "welcher Finger drückt als Nächstes".
 */
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

export type Hand = "left" | "right";

export function handOf(finger: Finger): Hand {
  return finger === "thumb" ? "left" : finger.startsWith("left") ? "left" : "right";
}

export interface KeyDef {
  /** Zeichen ohne Shift. */
  base: string;
  /** Zeichen mit Shift, falls abweichend. */
  shift?: string;
  finger: Finger;
  /** Gehört zur Grundreihe (Ausgangsposition der Finger). */
  home?: boolean;
}

// Zahlenreihe
const ROW_NUMBERS: KeyDef[] = [
  { base: "1", shift: "!", finger: "left-pinky" },
  { base: "2", shift: "\"", finger: "left-ring" },
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

// Obere Buchstabenreihe
const ROW_UPPER: KeyDef[] = [
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

// Grundreihe (Ausgangsposition)
const ROW_HOME: KeyDef[] = [
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

// Untere Buchstabenreihe
const ROW_LOWER: KeyDef[] = [
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

const KEY_SPACE: KeyDef = { base: " ", finger: "thumb" };

export const KEYBOARD_ROWS: KeyDef[][] = [ROW_NUMBERS, ROW_UPPER, ROW_HOME, ROW_LOWER, [KEY_SPACE]];

const ALL_KEYS: KeyDef[] = KEYBOARD_ROWS.flat();

/** Zeichen -> Taste + ob Shift nötig ist. Groß-/Kleinschreibung wird über `shift`, nicht über eine zweite Tabelle abgebildet. */
const CHAR_LOOKUP = new Map<string, { key: KeyDef; needsShift: boolean }>();
for (const key of ALL_KEYS) {
  CHAR_LOOKUP.set(key.base, { key, needsShift: false });
  if (key.shift) CHAR_LOOKUP.set(key.shift, { key, needsShift: true });
}

export function lookupChar(char: string): { key: KeyDef; needsShift: boolean } | undefined {
  return CHAR_LOOKUP.get(char);
}

export function fingerForChar(char: string): Finger | undefined {
  return lookupChar(char)?.key.finger;
}

export const HOME_ROW_KEYS: readonly string[] = ROW_HOME.filter((k) => k.home).map((k) => k.base);
