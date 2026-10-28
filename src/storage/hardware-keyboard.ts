/**
 * Merkmal „auf diesem Gerät wurde schon eine Hardwaretastatur benutzt“
 * (Befund C-003): Die Tastenwelt (Zehnfingersystem) passt nur zu Geräten mit
 * Tastatur. Bildschirmtastaturen liefern bei `keydown` meist keinen
 * `event.code` (iOS, Android: leer oder „Unidentified“), echte Tastaturen
 * schon. Gemerkt wird nur ein einziges Flag im `localStorage`, kein Tastendruck
 * und kein Inhalt. Lesen und Schreiben sind tolerant: Ohne Speicher gilt „noch
 * nicht gesehen“.
 */
export const HARDWARE_KEYBOARD_KEY = "lernraum.hardwaretastatur";

type KeyboardStorage = Pick<Storage, "getItem" | "setItem">;

function defaultStorage(): KeyboardStorage {
  return window.localStorage;
}

export function readHardwareKeyboardSeen(
  getStorage: () => KeyboardStorage = defaultStorage,
): boolean {
  try {
    return getStorage().getItem(HARDWARE_KEYBOARD_KEY) === "1";
  } catch {
    return false;
  }
}

export function markHardwareKeyboardSeen(
  getStorage: () => KeyboardStorage = defaultStorage,
): boolean {
  try {
    getStorage().setItem(HARDWARE_KEYBOARD_KEY, "1");
    return true;
  } catch {
    return false;
  }
}

type KeyLike = {
  code: string;
  key: string;
  isComposing?: boolean | undefined;
  target: EventTarget | null;
};

const TEXT_INPUT_TYPES = new Set([
  "text",
  "search",
  "email",
  "url",
  "tel",
  "number",
  "password",
]);

function isTextField(target: EventTarget | null): boolean {
  if (!target || typeof (target as Element).tagName !== "string") return false;
  const element = target as HTMLElement;
  if (element.tagName === "TEXTAREA") return true;
  if (element.tagName === "INPUT") {
    return TEXT_INPUT_TYPES.has(
      (element as HTMLInputElement).type.toLowerCase(),
    );
  }
  return element.isContentEditable === true;
}

/**
 * Ist das ein Tastendruck einer Hardwaretastatur? Ja bei einem Zeichen mit
 * gesetztem `code` in einem Texteingabefeld; Eingabemethoden-Zwischenstände und
 * Tasten ohne Zeichen (Tab, Pfeile) zählen nicht.
 */
export function isHardwareKeyEvent(event: KeyLike): boolean {
  if (event.isComposing) return false;
  if (!event.code || event.key === "Unidentified" || event.key.length !== 1) {
    return false;
  }
  return isTextField(event.target);
}

/**
 * Wartet auf den ersten Tastendruck einer Hardwaretastatur und merkt ihn.
 * Liefert die Aufräumfunktion; ist das Merkmal schon gesetzt, wird nichts
 * angehängt.
 */
export function watchHardwareKeyboard(
  target: Pick<Document, "addEventListener" | "removeEventListener">,
  getStorage: () => KeyboardStorage = defaultStorage,
): () => void {
  if (readHardwareKeyboardSeen(getStorage)) return () => undefined;
  const onKeyDown = (event: Event) => {
    if (!isHardwareKeyEvent(event as unknown as KeyLike)) return;
    markHardwareKeyboardSeen(getStorage);
    target.removeEventListener("keydown", onKeyDown, true);
  };
  target.addEventListener("keydown", onKeyDown, true);
  return () => target.removeEventListener("keydown", onKeyDown, true);
}
