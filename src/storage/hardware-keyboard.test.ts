import { afterEach, describe, expect, it } from "vitest";
import {
  HARDWARE_KEYBOARD_KEY,
  isHardwareKeyEvent,
  markHardwareKeyboardSeen,
  readHardwareKeyboardSeen,
  watchHardwareKeyboard,
} from "./hardware-keyboard";

function memoryStorage(initial?: string) {
  const values = new Map<string, string>();
  if (initial) values.set(HARDWARE_KEYBOARD_KEY, initial);
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
  };
}

function press(target: Element, init: { key: string; code: string }) {
  target.dispatchEvent(
    new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init }),
  );
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("Hardwaretastatur-Merkmal", () => {
  it("liest und schreibt das Flag tolerant", () => {
    const storage = memoryStorage();
    expect(readHardwareKeyboardSeen(() => storage)).toBe(false);
    expect(markHardwareKeyboardSeen(() => storage)).toBe(true);
    expect(readHardwareKeyboardSeen(() => storage)).toBe(true);
    // Fremde Werte gelten als „nicht gesehen“; ein kaputter Speicher wirft nie.
    expect(readHardwareKeyboardSeen(() => memoryStorage("ja"))).toBe(false);
    const broken = () => {
      throw new Error("gesperrt");
    };
    expect(readHardwareKeyboardSeen(broken)).toBe(false);
    expect(markHardwareKeyboardSeen(broken)).toBe(false);
  });

  it("erkennt ein Zeichen mit code in einem Textfeld als Hardwaretaste", () => {
    const input = document.createElement("input");
    const textarea = document.createElement("textarea");
    const box = document.createElement("input");
    box.type = "checkbox";
    expect(isHardwareKeyEvent({ code: "KeyA", key: "a", target: input })).toBe(
      true,
    );
    expect(
      isHardwareKeyEvent({ code: "Digit5", key: "5", target: textarea }),
    ).toBe(true);
    // Bildschirmtastaturen: leerer code oder „Unidentified“.
    expect(isHardwareKeyEvent({ code: "", key: "a", target: input })).toBe(
      false,
    );
    expect(
      isHardwareKeyEvent({ code: "KeyA", key: "Unidentified", target: input }),
    ).toBe(false);
    // Tasten ohne Zeichen, Eingabemethoden und andere Elemente zählen nicht.
    expect(isHardwareKeyEvent({ code: "Tab", key: "Tab", target: input })).toBe(
      false,
    );
    expect(
      isHardwareKeyEvent({
        code: "KeyA",
        key: "a",
        isComposing: true,
        target: input,
      }),
    ).toBe(false);
    expect(isHardwareKeyEvent({ code: "KeyA", key: "a", target: box })).toBe(
      false,
    );
    expect(
      isHardwareKeyEvent({ code: "KeyA", key: "a", target: document.body }),
    ).toBe(false);
  });

  it("merkt sich den ersten Tastendruck im Textfeld und nur diesen", () => {
    const storage = memoryStorage();
    const input = document.createElement("input");
    document.body.append(input);
    const stop = watchHardwareKeyboard(document, () => storage);

    press(document.body, { key: "a", code: "KeyA" });
    press(input, { key: "Tab", code: "Tab" });
    press(input, { key: "a", code: "" });
    expect(readHardwareKeyboardSeen(() => storage)).toBe(false);

    press(input, { key: "a", code: "KeyA" });
    expect(readHardwareKeyboardSeen(() => storage)).toBe(true);
    stop();
  });

  it("hängt nichts an, wenn das Merkmal schon gesetzt ist", () => {
    const calls: string[] = [];
    const target = {
      addEventListener: () => void calls.push("add"),
      removeEventListener: () => void calls.push("remove"),
    };
    watchHardwareKeyboard(target, () => memoryStorage("1"))();
    expect(calls).toEqual([]);
  });
});
